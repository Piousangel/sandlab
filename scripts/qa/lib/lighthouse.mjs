/**
 * Lighthouse 모바일(기본 = Moto G 에뮬·Slow 4G·CPU 4배, simulated throttling) 성능만, 페이지 × runs → 중앙값.
 * 크롬은 playwright의 chromium(CHROME_PATH). 결과 JSON은 dir/<tag><page>-<n>.json으로 남긴다(원인 추적용).
 */
import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { LIGHTHOUSE_BIN, chromium } from './deps.mjs'

const run = promisify(execFile)
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]

export async function lighthouse(base, pages, { runs = 3, dir, tag = 'lh' } = {}) {
  mkdirSync(dir, { recursive: true })
  const env = { ...process.env, CHROME_PATH: chromium.executablePath() }
  const rows = []
  for (const page of pages) {
    const got = []
    for (let i = 1; i <= runs; i++) {
      const file = join(dir, `${tag}${page.replace(/\//g, '_') || '_'}-${i}.json`)
      await run(LIGHTHOUSE_BIN, [base + page, '--quiet', '--only-categories=performance', '--chrome-flags=--headless=new', '--output=json', `--output-path=${file}`], { env, maxBuffer: 1 << 26 }).catch((e) => {
        throw new Error(`lighthouse ${page} #${i} 실패: ${e.stderr || e.message}`)
      })
      const a = JSON.parse(readFileSync(file, 'utf8')).audits
      let el = ''
      try {
        el = a['largest-contentful-paint-element'].details.items[0].items[0].node.snippet.slice(0, 70)
      } catch {}
      const blocking = (a['render-blocking-resources']?.details?.items ?? []).map((x) => x.url.replace(base, ''))
      got.push({ lcp: a['largest-contentful-paint'].numericValue, fcp: a['first-contentful-paint'].numericValue, cls: a['cumulative-layout-shift'].numericValue, tbt: a['total-blocking-time'].numericValue, el, blocking })
    }
    rows.push({
      page,
      lcp: Math.round(median(got.map((g) => g.lcp))),
      fcp: Math.round(median(got.map((g) => g.fcp))),
      cls: +median(got.map((g) => g.cls)).toFixed(3),
      clsMax: +Math.max(...got.map((g) => g.cls)).toFixed(3),
      tbt: Math.round(median(got.map((g) => g.tbt))),
      runs: got.map((g) => Math.round(g.lcp)),
      el: got[0].el,
      blocking: got[0].blocking,
    })
  }
  return rows
}
