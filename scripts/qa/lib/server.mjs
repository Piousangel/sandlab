/**
 * out/ 정적 서버 — Cloudflare Workers Static Assets처럼: `/x` → x.html, 디렉터리 → index.html, 없으면 404.html(404).
 * 글자 파일은 gzip(배포와 같은 조건으로 Lighthouse 전송 크기를 재려고 — 무압축이면 LCP가 부풀려진다).
 * `/api/*`: GET·HEAD만 prod(sandlab.app)로 프록시(메모리 캐시), 그 밖의 메서드는 403 — prod에 쓰지 않는다(프리뷰 READ_ONLY와 같은 규칙).
 * Lighthouse가 띄운 크롬은 Playwright route로 가로챌 수 없어서 서버에서 프록시한다.
 */
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { gzipSync } from 'node:zlib'

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.ico': 'image/x-icon',
}
const TEXT = new Set(['.html', '.js', '.css', '.json', '.txt', '.svg', '.xml'])
const PROD = 'https://sandlab.app'

export function serve(outDir, port = 0, { api = 'proxy' } = {}) {
  const root = normalize(outDir)
  const cache = new Map()
  const gz = new Map()
  const srv = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const p = decodeURIComponent(url.pathname)
    if (p.startsWith('/api/')) {
      if (api !== 'proxy') return void res.writeHead(404, { 'content-type': 'application/json' }).end('{}')
      if (req.method !== 'GET' && req.method !== 'HEAD') return void res.writeHead(403, { 'content-type': 'application/json' }).end('{"error":"qa server is read-only"}')
      const key = p + url.search
      try {
        if (!cache.has(key)) {
          const r = await fetch(PROD + key)
          cache.set(key, { status: r.status, type: r.headers.get('content-type') || 'application/json', body: Buffer.from(await r.arrayBuffer()) })
        }
        const c = cache.get(key)
        return void res.writeHead(c.status, { 'content-type': c.type }).end(c.body)
      } catch {
        return void res.writeHead(502).end('{}')
      }
    }
    let file = null
    for (const c of [p, p + '.html', join(p, 'index.html')]) {
      const f = join(root, c)
      if (f.startsWith(root) && existsSync(f) && statSync(f).isFile()) {
        file = f
        break
      }
    }
    const status = file ? 200 : 404
    if (!file) file = join(root, '404.html')
    const ext = extname(file)
    const headers = { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-cache' }
    let body = readFileSync(file)
    if (TEXT.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) {
      if (!gz.has(file)) gz.set(file, gzipSync(body))
      body = gz.get(file)
      headers['content-encoding'] = 'gzip'
    }
    res.writeHead(status, headers).end(req.method === 'HEAD' ? undefined : body)
  })
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r({ srv, port: srv.address().port, base: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() })))
}
