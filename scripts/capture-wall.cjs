#!/usr/bin/env node
/**
 * 갤러리 큐레이션(Sandlab pick, P9) 썸네일 캡처 — 실제 엔진으로 그린다(src/ui-next/gallery/picks.ts).
 *
 *   pnpm build:preview                       # out/ = 새 셸 프리뷰 빌드(홈이 #s= 진입을 연다)
 *   node scripts/capture-wall.cjs            # public/ui-next/wall/<id>.webp (picks.ts의 12점)
 *   node scripts/capture-wall.cjs --ids a,b --ms 1500 --out /tmp/x
 *
 * 방법: out/을 로컬 정적 서버로 띄우고 `/#s=<id>`를 헤드리스 크로미움으로 연다. `/api/*` GET만 prod(sandlab.app)로 프록시하고
 * 쓰기 요청은 403으로 막는다(prod에 쓰지 않는다). 홈 우물이 준비되면 ms(기본 1500)만큼 돌린 뒤 우물 캔버스만 찍고(1440 폭),
 * 640×320 webp(품질 78→62, 안 되면 폭을 줄임)로 20KB 이하가 될 때까지 줄인다.
 * WebGPU: 맥은 `--use-angle=metal` + headless로 실제 Metal 어댑터가 잡힌다(P6 확인). 리눅스는 swiftshader 인자로 바꿀 것.
 * playwright는 package.json에 없다 — 전역/스크래치 설치를 NODE_PATH로 준다. sharp는 next 의존성에서 빌려 쓴다.
 */
const http = require('http')
const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')

const root = path.resolve(__dirname, '..')
const sharp = createRequire(require.resolve('next/package.json', { paths: [root] }))('sharp')

const argv = process.argv.slice(2)
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d)
const outDir = path.join(root, 'out')
const dest = path.resolve(root, opt('--out', 'public/ui-next/wall'))
const ms = Number(opt('--ms', '1500'))
const LIMIT = 20_000
const PROD = 'https://sandlab.app'

function picks() {
  const src = fs.readFileSync(path.join(root, 'src/ui-next/gallery/picks.ts'), 'utf8')
  return [...src.matchAll(/\{ id: '([A-Za-z0-9_-]+)'/g)].map((m) => m[1])
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
function serve(port) {
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    for (const c of [p, p + '.html', path.join(p, 'index.html')]) {
      const f = path.join(outDir, c)
      if (f.startsWith(outDir) && fs.existsSync(f) && fs.statSync(f).isFile()) {
        res.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream')
        return res.end(fs.readFileSync(f))
      }
    }
    res.statusCode = 404
    res.end('not found')
  })
  return new Promise((r) => srv.listen(port, () => r(srv)))
}

async function toWebp(png) {
  for (const w of [640, 560, 480, 400])
    for (const q of [78, 70, 62]) {
      const buf = await sharp(png).resize(w, w / 2, { fit: 'fill' }).webp({ quality: q, effort: 6 }).toBuffer()
      if (buf.length <= LIMIT) return { w, q, buf }
    }
  throw new Error('20KB 이하로 못 줄임')
}

/**
 * 작은 썸네일 `<id>-320.webp`(320×160) — 폰 2열 카드(CSS 약 170px)는 DPR 2 미만이면 이것으로 충분하다(GalleryWall srcset, P12 LCP).
 * 캡처 없이 이미 있는 `<id>.webp`에서 줄인다: `node scripts/capture-wall.cjs --small-only`. 캡처(기본 실행)도 끝에 함께 만든다.
 */
async function writeSmall(ids) {
  for (const id of ids) {
    const buf = await sharp(path.join(dest, `${id}.webp`)).resize(320, 160, { fit: 'fill' }).webp({ quality: 72, effort: 6 }).toBuffer()
    fs.writeFileSync(path.join(dest, `${id}-320.webp`), buf)
    console.log(`${id}-320  ${buf.length}B`)
  }
}

;(async () => {
  const ids = opt('--ids', '') ? opt('--ids', '').split(',') : picks()
  if (argv.includes('--small-only')) return writeSmall(ids)
  const { chromium } = require('playwright') // 캡처할 때만(--small-only는 playwright 없이 돈다)
  if (!fs.existsSync(path.join(outDir, 'index.html'))) throw new Error('out/ 없음 — 먼저 pnpm build:preview')
  fs.mkdirSync(dest, { recursive: true })
  const srv = await serve(8833)
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--use-angle=metal'] })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await ctx.route('**/api/**', async (route) => {
    const r = route.request()
    if (r.method() !== 'GET') return route.fulfill({ status: 403, body: '{"error":"read-only capture"}' })
    const u = new URL(r.url())
    const res = await fetch(PROD + u.pathname + u.search)
    route.fulfill({ status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' }, body: Buffer.from(await res.arrayBuffer()) })
  })
  try {
    for (const id of ids) {
      const page = await ctx.newPage()
      await page.addInitScript(() => localStorage.setItem('sl.pourdemo.v1', '1'))
      await page.goto(`http://localhost:8833/#s=${id}`)
      await page.waitForSelector('.sl-well[data-ready]', { timeout: 60_000 })
      await page.addStyleTag({ content: '.sl-well > :not(canvas){visibility:hidden !important}' })
      await page.waitForTimeout(ms)
      const png = await page.locator('canvas.sl-well-canvas').screenshot()
      const { w, q, buf } = await toWebp(png)
      fs.writeFileSync(path.join(dest, `${id}.webp`), buf)
      console.log(`${id}  ${w}px q${q}  ${buf.length}B`)
      await page.close()
    }
  } finally {
    await browser.close()
    srv.close()
  }
  await writeSmall(ids)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
