// Cloudflare Worker: 갤러리 API(/api/*) + 정적 에셋 서빙(그 외).
// /api 외 경로는 assets가 직접 처리하고, 매칭 없을 때만 이 워커가 호출된다.
//
// 설계 결정:
//  - 댓글 없음. Sandspiel 제작자가 의도적으로 뺀 것 — 독성 차단. 기능이 아니라 결정이다.
//  - 랭킹은 1주일 이내 저장물만(Powder Toy FP 복제). 신선도가 재방문 이유다.
//  - 로그인 없음. 남용 방어는 IP 레이트리밋 + 투표 IP 중복 차단으로 한다.
//    localStorage 중복 차단만으론 시크릿 창 한 번이면 뚫린다.

import {
  HOT_WINDOW_DAYS,
  PAGE_SIZE,
  MAX_SCENE_BYTES,
  MAX_THUMB_BYTES,
  cleanTitle,
  isValidId,
  type SceneMeta,
  type SortMode,
} from '../src/lib/sand/gallery'
import { escapeHtml } from '../src/lib/sand/html'

interface D1Stmt {
  bind(...vals: unknown[]): D1Stmt
  all<T = unknown>(): Promise<{ results: T[] }>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<unknown>
}
interface D1Database {
  prepare(query: string): D1Stmt
  batch(stmts: D1Stmt[]): Promise<unknown>
}
interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
  DB: D1Database
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

const err = (msg: string, status = 400) => json({ error: msg }, status)

function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') || '0.0.0.0'
}

/** IP를 그대로 저장하지 않는다 — 해시만 남긴다. 남용 방어에는 이걸로 충분하다. */
async function ipHash(req: Request): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIp(req)))
  return [...new Uint8Array(buf).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(8))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 업로드 레이트리밋: 같은 IP가 시간당 N건. */
const UPLOADS_PER_HOUR = 12

async function tooManyUploads(env: Env, hash: string): Promise<boolean> {
  const since = Date.now() - 3600_000
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM scenes WHERE ip=? AND created_at>?')
    .bind(hash, since)
    .first<{ n: number }>()
  return (row?.n ?? 0) >= UPLOADS_PER_HOUR
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const p = url.pathname

    // ── 목록 ──
    if (p === '/api/scenes' && request.method === 'GET') {
      const sort = (url.searchParams.get('sort') as SortMode) === 'new' ? 'new' : 'hot'
      const offset = Math.max(0, Math.min(5000, Number(url.searchParams.get('offset')) || 0))

      // hot = 최근 1주일 이내 + 표 순. Powder Toy FP 복제.
      // 이 창이 없으면 오래된 히트작이 영원히 상단을 점거해 신규가 절대 안 보인다.
      const since = Date.now() - HOT_WINDOW_DAYS * 86400_000
      const q =
        sort === 'hot'
          ? 'SELECT id,title,votes,created_at AS createdAt,w,h FROM scenes WHERE created_at>? ORDER BY votes DESC, created_at DESC LIMIT ? OFFSET ?'
          : 'SELECT id,title,votes,created_at AS createdAt,w,h FROM scenes WHERE created_at>-1 ORDER BY created_at DESC LIMIT ? OFFSET ?'
      const stmt =
        sort === 'hot'
          ? env.DB.prepare(q).bind(since, PAGE_SIZE, offset)
          : env.DB.prepare(q).bind(PAGE_SIZE, offset)
      const { results } = await stmt.all<SceneMeta>()

      const cnt = await env.DB.prepare(
        sort === 'hot'
          ? 'SELECT COUNT(*) AS n FROM scenes WHERE created_at>?'
          : 'SELECT COUNT(*) AS n FROM scenes',
      )
        .bind(...(sort === 'hot' ? [since] : []))
        .first<{ n: number }>()

      return json({ scenes: results, total: cnt?.n ?? 0 })
    }

    // ── 썸네일 (이미지로 직접 서빙 — <img src>로 쓰기 위해) ──
    const thumbM = p.match(/^\/api\/scenes\/([^/]+)\/thumb$/)
    if (thumbM && request.method === 'GET') {
      if (!isValidId(thumbM[1])) return err('bad id')
      const row = await env.DB.prepare('SELECT thumb FROM scenes WHERE id=?')
        .bind(thumbM[1])
        .first<{ thumb: number[] }>()
      if (!row) return err('not found', 404)
      // D1은 BLOB을 Array<number>로 돌려준다 — ArrayBuffer가 아니다.
      // 그대로 Response에 넣으면 본문이 빈다(헤더만 200으로 나가서 눈치채기 어렵다).
      return new Response(new Uint8Array(row.thumb), {
        headers: {
          'content-type': 'image/png',
          // 썸네일은 불변이라 오래 캐시한다 — D1 읽기를 아낀다.
          'cache-control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // ── 투표 ──
    const voteM = p.match(/^\/api\/scenes\/([^/]+)\/vote$/)
    if (voteM && request.method === 'POST') {
      const id = voteM[1]
      if (!isValidId(id)) return err('bad id')
      // 씬이 실재하는지 '먼저' 확인한다. 안 하면 형식만 맞는 가짜 id로 votes 테이블에
      // orphan row를 무제한 삽입할 수 있다(레이트리밋 없는 저비용 D1 스토리지 남용).
      const scene = await env.DB.prepare('SELECT votes FROM scenes WHERE id=?')
        .bind(id)
        .first<{ votes: number }>()
      if (!scene) return err('not found', 404)

      const hash = await ipHash(request)
      // IP당 장면당 1표. localStorage만으론 시크릿 창 한 번에 뚫린다.
      const dup = await env.DB.prepare('SELECT 1 FROM votes WHERE scene=? AND ip=?')
        .bind(id, hash)
        .first()
      if (dup) return err('already voted', 409)

      try {
        await env.DB.batch([
          env.DB.prepare('INSERT INTO votes (scene, ip, created_at) VALUES (?,?,?)').bind(id, hash, Date.now()),
          env.DB.prepare('UPDATE scenes SET votes = votes + 1 WHERE id=?').bind(id),
        ])
      } catch {
        // dup 체크 통과 후 동시 요청이 먼저 INSERT하면 PK(scene,ip) 위반 → 500 대신 409로 매핑.
        return err('already voted', 409)
      }
      const row = await env.DB.prepare('SELECT votes FROM scenes WHERE id=?').bind(id).first<{ votes: number }>()
      return json({ votes: row?.votes ?? scene.votes + 1 })
    }

    // ── 단건 조회 ──
    const oneM = p.match(/^\/api\/scenes\/([^/]+)$/)
    if (oneM && request.method === 'GET') {
      const id = oneM[1]
      if (!isValidId(id)) return err('bad id')
      // ?meta=1 이면 씬 blob(data)을 빼고 메타만 준다 — Yours 탭처럼 표시에 data가 불필요할 때
      // 수백 KB를 낭비하지 않는다. 컬럼은 고정 상수라 인젝션 없음.
      const metaOnly = url.searchParams.get('meta') != null
      const cols = metaOnly
        ? 'id,title,votes,created_at AS createdAt,w,h'
        : 'id,title,votes,created_at AS createdAt,w,h,data'
      const row = await env.DB.prepare(`SELECT ${cols} FROM scenes WHERE id=?`)
        .bind(id)
        .first<SceneMeta & { data?: string }>()
      if (!row) return err('not found', 404)
      return new Response(JSON.stringify(row), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          // 메타는 표수가 최신이어야 하므로 캐시하지 않는다(Yours 재방문 payoff).
          // 풀 데이터는 불변(표만 변함)이라 캐시 안전.
          'cache-control': metaOnly ? 'no-store' : 'public, max-age=3600',
        },
      })
    }

    // ── 업로드 ──
    if (p === '/api/scenes' && request.method === 'POST') {
      let body: { title?: unknown; data?: unknown; thumb?: unknown; w?: unknown; h?: unknown }
      try {
        body = await request.json()
      } catch {
        return err('bad json')
      }

      const data = String(body.data ?? '')
      const thumb = String(body.thumb ?? '')
      const w = Number(body.w)
      const h = Number(body.h)

      if (!/^[A-Za-z0-9_-]+$/.test(data) || data.length > MAX_SCENE_BYTES) return err('bad scene data')
      if (!/^[A-Za-z0-9+/=]+$/.test(thumb) || thumb.length > MAX_THUMB_BYTES) return err('bad thumb')
      if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 4096 || h > 4096) {
        return err('bad dimensions')
      }

      const hash = await ipHash(request)
      if (await tooManyUploads(env, hash)) return err('too many uploads, try later', 429)

      // 썸네일 base64 → 바이트. 정규식이 문자 집합만 보므로(길이·패딩 위치는 아님)
      // atob가 던질 수 있다 — try/catch로 감싸 500 대신 400을 준다.
      let bin: string
      try {
        bin = atob(thumb)
      } catch {
        return err('bad thumb')
      }
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

      const id = newId()
      await env.DB.prepare(
        'INSERT INTO scenes (id,title,data,thumb,votes,created_at,w,h,ip) VALUES (?,?,?,?,0,?,?,?,?)',
      )
        .bind(id, cleanTitle(body.title), data, bytes, Date.now(), w, h, hash)
        .run()

      return json({ id })
    }

    // ── 씬 공유 링크 /s/:id — 크롤러용 OG 프리뷰 + 브라우저용 리다이렉트 ──
    // 제품 논지의 심장: 공유된 링크가 씬 썸네일을 물어야 한다. 해시(#s=id)는 서버로 안 와서
    // 크롤러가 못 읽는다. 그래서 경로형 링크를 만들어 여기서 OG 메타를 심어 준다.
    const shareM = p.match(/^\/s\/([^/]+)$/)
    if (shareM && request.method === 'GET') {
      const id = shareM[1]
      if (isValidId(id)) {
        const row = await env.DB.prepare('SELECT title FROM scenes WHERE id=?')
          .bind(id)
          .first<{ title: string }>()
        if (row) {
          const origin = url.origin
          const title = escapeHtml(row.title?.trim() || 'A scene on Sandlab')
          const img = `${origin}/api/scenes/${id}/thumb`
          const pageUrl = `${origin}/s/${id}`
          // 크롤러는 이 메타를 읽는다. 브라우저는 JS로 기존에 동작하는 해시 경로(#s=id)로 즉시 이동한다.
          const redirect = `${origin}/#s=${id}`
          const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Sandlab</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sandlab">
<meta property="og:title" content="${title} · Sandlab">
<meta property="og:description" content="A falling-sand scene made in Sandlab. Open it, remix it, share your own — no install, no sign-up.">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="420">
<meta property="og:image:height" content="210">
<meta property="og:url" content="${pageUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title} · Sandlab">
<meta name="twitter:image" content="${img}">
<link rel="canonical" href="${pageUrl}">
<script>location.replace(${JSON.stringify(redirect)})</script>
</head><body style="margin:0;background:#07090D;color:#eef1f6;font-family:system-ui,sans-serif">
<noscript><a href="${redirect}" style="color:#8ea0bf">Open this scene in Sandlab</a></noscript>
</body></html>`
          return new Response(html, {
            headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
          })
        }
      }
      // 잘못된/삭제된 id → 앱 홈으로 보낸다(막다른 404 대신).
      return Response.redirect(`${url.origin}/`, 302)
    }

    return env.ASSETS.fetch(request)
  },
}
