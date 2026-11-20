#!/usr/bin/env node
/**
 * Lighthouse 모바일 게이트(리디자인 P11, 계획서 0장 컷오버 게이트: LCP ≤ 2.5s · CLS ≤ 0.05 · INP 대리 TBT ≤ 200ms).
 *
 *   NODE_PATH=<lighthouse 있는 node_modules> node scripts/qa/lighthouse.mjs [outDir=out] [--runs 3] [--pages /,/about,...] [--json file]
 *
 * 왜 자체 서버인가(P11 실측): 압축 없이 서빙하면(python http.server, scripts/qa/lib.cjs serve) Lighthouse의 모의 스로틀링(Lantern)이
 * JS·CSS 원본 바이트로 다운로드 시간을 계산해 LCP가 2배 가까이 부풀어 보인다(/about 4.5~5.2s → 압축 2.4s).
 * prod·프리뷰는 Cloudflare가 brotli로 보낸다 → 여기서도 텍스트 자원을 압축해 보낸다(br, 없으면 gzip). `/_next/static`은 immutable 캐시 헤더.
 *
 * 중앙값(runs회)으로 판정하고, 기준을 넘는 쪽이 있으면 exit 1. LCP 요소와 단계(TTFB·Load Delay·Load Time·Render Delay)도 찍는다.
 * lighthouse는 package.json에 없다(용량) — 스크래치에 `npm i lighthouse@12` 후 NODE_PATH로 가리킨다. 크롬은 chrome-launcher가 찾는다(CHROME_PATH로 지정 가능).
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createRequire } from 'node:module'
import os from 'node:os'

const argv = process.argv.slice(2)
const opt = (k, d) => {
  const i = argv.indexOf(k)
  return i >= 0 ? argv[i + 1] : d
}
const outDir = path.resolve(argv[0] && !argv[0].startsWith('--') ? argv[0] : 'out')
const runs = Number(opt('--runs', '3'))
// 홀수만: 짝수면 중앙값이 늘 나쁜 쪽 값이 된다
if (!Number.isInteger(runs) || runs < 1 || runs % 2 === 0) {
  console.error('--runs는 1 이상 홀수')
  process.exit(2)
}
const pages = opt('--pages', '/,/daily,/play,/play/1-1,/gallery,/about,/learn/margolus-falling-sand,/materials/sand').split(',')
const jsonOut = opt('--json')
export const GATE = { lcp: 2500, cls: 0.05, tbt: 200 }

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.ico': 'image/x-icon',
}
const TEXT = /^(text\/|application\/(json|xml)|image\/svg)/

function serve(dir) {
  const srv = http.createServer((req, res) => {
    let p
    try {
      p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    } catch {
      res.writeHead(400)
      return res.end('bad path')
    }
    if (p.startsWith('/api/')) {
      res.writeHead(404, { 'content-type': 'application/json' })
      return res.end('{}')
    }
    const f = [p, p + '.html', path.join(p, 'index.html')]
      .map((c) => path.join(dir, c))
      .find((c) => c.startsWith(dir + path.sep) && fs.existsSync(c) && fs.statSync(c).isFile())
    if (!f) {
      res.writeHead(404)
      return res.end('not found')
    }
    const type = TYPES[path.extname(f)] || 'application/octet-stream'
    const h = {
      'content-type': type,
      'cache-control': p.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    }
    let body = fs.readFileSync(f)
    // 크롬은 http(비보안)에선 br을 광고하지 않는다 → gzip으로 떨어진다(br보다 몇 % 클 뿐, 무압축과는 2배 차이)
    const ae = req.headers['accept-encoding'] || ''
    if (TEXT.test(type) && /\bbr\b/.test(ae)) {
      body = zlib.brotliCompressSync(body, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
      })
      h['content-encoding'] = 'br'
    } else if (TEXT.test(type) && /\bgzip\b/.test(ae)) {
      body = zlib.gzipSync(body, { level: 9 })
      h['content-encoding'] = 'gzip'
    }
    res.writeHead(200, h)
    res.end(body)
  })
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)))
}

const require = createRequire(path.join(process.env.NODE_PATH || process.cwd(), 'noop.js'))
let cli
try {
  cli = require.resolve('lighthouse/cli/index.js')
} catch {
  console.error('lighthouse를 찾지 못함 — 스크래치에 `npm i lighthouse@12` 후 NODE_PATH=<그 node_modules>로 실행')
  process.exit(2)
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const srv = await serve(outDir)
const base = `http://127.0.0.1:${srv.address().port}`
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-lh-'))
const rows = []
let fail = 0
let crashed = null
try {
  for (const pg of pages) {
    const got = []
    for (let i = 0; i < runs; i++) {
      const f = path.join(tmp, `r${rows.length}-${i}.json`)
      // 비동기 필수: 동기 실행은 같은 프로세스의 정적 서버를 막아 Lighthouse가 페이지를 못 받는다
      await promisify(execFile)(
        process.execPath,
        [
          cli,
          base + pg,
          '--only-categories=performance',
          '--form-factor=mobile',
          '--chrome-flags=--headless=new --no-sandbox',
          '--output=json',
          `--output-path=${f}`,
          '--quiet',
        ],
        { maxBuffer: 1 << 26 },
      )
      const a = JSON.parse(fs.readFileSync(f, 'utf8')).audits
      const el = a['largest-contentful-paint-element']?.details?.items ?? []
      got.push({
        lcp: a['largest-contentful-paint'].numericValue,
        cls: a['cumulative-layout-shift'].numericValue,
        tbt: a['total-blocking-time'].numericValue,
        el: String(el[0]?.items?.[0]?.node?.snippet ?? '').slice(0, 70),
        phases: (el[1]?.items ?? []).map((x) => `${x.phase} ${Math.round(x.timing)}`).join(' · '),
      })
    }
    const row = {
      page: pg,
      lcp: median(got.map((g) => g.lcp)),
      cls: median(got.map((g) => g.cls)),
      tbt: median(got.map((g) => g.tbt)),
      el: got[0].el,
      phases: got[0].phases,
    }
    row.pass = row.lcp <= GATE.lcp && row.cls <= GATE.cls && row.tbt <= GATE.tbt
    if (!row.pass) fail++
    rows.push(row)
    console.log(
      `${row.pass ? 'PASS' : 'FAIL'}  ${pg.padEnd(34)} LCP ${(row.lcp / 1000).toFixed(2)}s  CLS ${row.cls.toFixed(3)}  TBT ${Math.round(row.tbt)}ms  ${row.el}`,
    )
    if (row.phases) console.log(`      ${row.phases}`)
  }
} catch (e) {
  crashed = e
} finally {
  srv.close()
  fs.rmSync(tmp, { recursive: true, force: true })
}
// 측정 실패(크롬 없음·Lighthouse 오류)는 게이트 실패(1)와 구분해 2
if (crashed) {
  console.error('측정 실패:', crashed.stderr || crashed.message)
  process.exit(2)
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ gate: GATE, runs, rows }, null, 2))
console.log(`\n${pages.length - fail}/${pages.length} 게이트 통과 (중앙값 ${runs}회, 모바일 기본 스로틀링, 압축 서빙)`)
process.exit(fail ? 1 : 0)
