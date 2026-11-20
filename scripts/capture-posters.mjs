#!/usr/bin/env node
/**
 * 리디자인 v2 시험관 포스터 아틀라스 캡처 (계획서 4장·S7) — 실제 WebGPU 엔진을 헤드리스 크로미움(SwiftShader)으로 돌린다.
 *
 *   node scripts/capture-posters.mjs            # public/ui-next/posters/atlas.{webp,png,json}
 *   node scripts/capture-posters.mjs --strips   # + strips/<slug>.webp (12프레임 가로 스트립, 선택 관 1회 재생용)
 *   node scripts/capture-posters.mjs --only sand,water --out /tmp/x --png   # 검토용 PNG도
 *
 * 함정: WebGPU는 보안 컨텍스트에서만 — about:blank·file://에선 navigator.gpu가 없다. 그래서 Vite 개발 서버(localhost)로 연다.
 * vite는 vitest의 의존성이라 최상위에 없다 → vitest 기준으로 resolve.
 * playwright는 package.json에 없다 — 클라우드 컨테이너에 전역 설치된 것을 쓴다(로컬이면 `npm i -g playwright` 후 `npx playwright install chromium`).
 * --strips 없이 돌리면 기존 strips/는 그대로 남는다(장면을 바꿨으면 --strips로 함께 다시 찍을 것). 고체 6종은 스트립 없음.
 *
 * 랙 루프(P11, S7): `--strips`로 찍으면 rack/<slug>.webp(선택된 관 1개만 도는 12프레임, 관 크기 @2x = 프레임 64×128, ≤ 20KB)와
 * rack/rack.json도 함께 만든다. 이미 찍힌 strips/에서 다시 만들기만 하려면 `node scripts/capture-posters.mjs --rack-only`(브라우저 없음).
 * 아틀라스 @2x(atlas-2x.webp, 384×384): 기기 배율 2 이하는 이걸 받는다(Rack의 image-set — 홈 첫 화면 이미지 39KB → 약 10KB, P11 LCP).
 * 캡처할 때마다, 그리고 --rack-only에서도 atlas.webp에서 다시 만든다.
 */
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const argv = process.argv.slice(2)
const flag = (k) => argv.includes(k)
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
const only = opt('--only')?.split(',')
const out = path.resolve(root, opt('--out') ?? 'public/ui-next/posters')
const withStrips = flag('--strips')

/** strips/(타일 96×192 × 12)를 랙 크기로 줄인다. 20KB를 넘으면 품질 → 폭 순으로 낮춘다. 결과 표를 rack.json에. */
async function buildRack() {
  const { readdirSync, readFileSync } = await import('node:fs')
  const sharp = createRequire(createRequire(path.join(root, 'package.json')).resolve('next/package.json'))('sharp')
  const LIMIT = 20_000
  const src = path.join(out, 'strips')
  const dst = path.join(out, 'rack')
  mkdirSync(dst, { recursive: true })
  const slugs = {}
  for (const f of readdirSync(src).filter((f) => f.endsWith('.webp')).sort()) {
    const input = readFileSync(path.join(src, f))
    let buf = null
    let used = null
    for (const w of [768, 672, 576]) {
      for (const q of [80, 70, 60]) {
        buf = await sharp(input).resize(w, w / 6, { kernel: 'lanczos3' }).webp({ quality: q, alphaQuality: 80, effort: 6 }).toBuffer()
        used = { w, q }
        if (buf.length <= LIMIT) break
      }
      if (buf.length <= LIMIT) break
    }
    if (buf.length > LIMIT) throw new Error(`${f}: 랙 스트립 ${buf.length}B > ${LIMIT}B`)
    writeFileSync(path.join(dst, f), buf)
    slugs[f.replace(/\.webp$/, '')] = { bytes: buf.length, width: used.w, quality: used.q }
  }
  const a2 = await sharp(readFileSync(path.join(out, 'atlas.webp'))).resize(384, 384, { kernel: 'lanczos3' }).webp({ quality: 80, alphaQuality: 85, effort: 6 }).toBuffer()
  writeFileSync(path.join(out, 'atlas-2x.webp'), a2)
  console.log(`atlas-2x.webp ${a2.length}B`)
  writeFileSync(path.join(dst, 'rack.json'), JSON.stringify({ frames: 12, limit: LIMIT, slugs }, null, 2) + '\n')
  console.log(`rack strips ${Object.keys(slugs).length} → ${path.relative(root, dst)} (max ${Math.max(...Object.values(slugs).map((x) => x.bytes))}B)`)
}
if (flag('--rack-only')) {
  await buildRack()
  process.exit(0)
}
const req = createRequire(createRequire(path.join(root, 'package.json')).resolve('vitest/package.json'))
const { createServer } = await import(pathToFileURL(req.resolve('vite')).href)
const { chromium } = createRequire(import.meta.url)('playwright')

const server = await createServer({
  root,
  configFile: false,
  logLevel: 'error',
  resolve: { alias: { '@': path.join(root, 'src') } },
  // 의존성 사전 번들 발견 → 페이지 자동 새로고침이 캡처 도중 WebGPU 인스턴스를 날린다("external Instance reference"). 끈다.
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { port: 0, host: '127.0.0.1', hmr: false },
})
await server.listen()
const port = server.httpServer.address().port
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-vulkan=swiftshader'] })
try {
  const page = await browser.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()) })
  page.on('pageerror', (e) => console.error('[pageerror]', e.message))
  await page.goto(`http://127.0.0.1:${port}/scripts/capture/posters.html`)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 })
  const t0 = Date.now()
  const r = await page.evaluate(async ([s, w]) => {
    try { return await window.__capture(s ?? undefined, w) } catch (e) { return { error: String(e?.stack ?? e) } }
  }, [only ?? null, withStrips])
  if (r.error) throw new Error(`capture failed in page:\n${r.error}`)
  mkdirSync(out, { recursive: true })
  const dec = (u) => Buffer.from(u.split(',')[1], 'base64')
  writeFileSync(path.join(out, 'atlas.webp'), dec(r.atlasWebp))
  // PNG는 검토용(390KB) — 배포물에 넣지 않는다. --png 일 때만.
  if (flag('--png')) writeFileSync(path.join(out, 'atlas.png'), dec(r.atlasPng))
  writeFileSync(path.join(out, 'atlas.json'), JSON.stringify({ ...r.layout, census: r.census }, null, 2) + '\n')
  if (withStrips) {
    mkdirSync(path.join(out, 'strips'), { recursive: true })
    for (const [slug, u] of Object.entries(r.strips)) writeFileSync(path.join(out, 'strips', `${slug}.webp`), dec(u))
  }
  await buildRack()
  console.log(`captured ${Object.keys(r.layout.tiles).length} tubes in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${path.relative(root, out)}`)
  console.log('census (cells of own material):', r.census)
} finally {
  await browser.close()
  await server.close()
}
