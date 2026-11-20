// 프리뷰 e2e 공용(P6에서 시작, P9b에 scripts/qa로 승격): out/ 정적 서버 + 크로미움(Metal WebGPU 헤드리스) + /api/* 를 prod GET으로 프록시(쓰기는 403, prod에 쓰지 않음)
const http = require('http')
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.ico': 'image/x-icon' }

function serve(outDir, port) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.startsWith('/api/')) {
      res.statusCode = 404
      return res.end('{}')
    }
    const cands = [p, p + '.html', path.join(p, 'index.html')]
    for (const c of cands) {
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

const PROD = 'https://sandlab.app'
const cache = new Map()
async function proxyApi(page, log = []) {
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const u = new URL(req.url())
    if (req.method() !== 'GET' && req.method() !== 'HEAD') {
      log.push(`blocked ${req.method()} ${u.pathname}`)
      return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"preview is read-only"}' })
    }
    const key = u.pathname + u.search
    if (!cache.has(key)) {
      const r = await fetch(PROD + key)
      cache.set(key, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' }, body: Buffer.from(await r.arrayBuffer()) })
    }
    const c = cache.get(key)
    log.push(`GET ${key} ${c.status}`)
    return route.fulfill({ status: c.status, headers: c.headers, body: c.body })
  })
}

function launch(opts = {}) {
  return chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--use-angle=metal', ...(opts.args || [])] })
}

module.exports = { serve, proxyApi, launch }
