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
 */
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const req = createRequire(createRequire(path.join(root, 'package.json')).resolve('vitest/package.json'))
const { createServer } = await import(pathToFileURL(req.resolve('vite')).href)
const { chromium } = createRequire(import.meta.url)('playwright')

const argv = process.argv.slice(2)
const flag = (k) => argv.includes(k)
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
const only = opt('--only')?.split(',')
const out = path.resolve(root, opt('--out') ?? 'public/ui-next/posters')
const withStrips = flag('--strips')

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
  console.log(`captured ${Object.keys(r.layout.tiles).length} tubes in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${path.relative(root, out)}`)
  console.log('census (cells of own material):', r.census)
} finally {
  await browser.close()
  await server.close()
}
