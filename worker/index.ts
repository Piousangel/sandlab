// Cloudflare Worker: 갤러리 API(/api/*) + 정적 에셋 서빙(그 외).
// /api 외 경로는 assets가 직접 처리하고, 매칭 없을 때만 이 워커가 호출된다.
//
// 설계 결정:
//  - 댓글 없음. Sandspiel 제작자가 의도적으로 뺀 것 — 독성 차단. 기능이 아니라 결정이다.
//  - 랭킹은 1주일 이내 저장물만(Powder Toy FP 복제). 신선도가 재방문 이유다.
//  - 로그인 없음. 남용 방어는 IP 레이트리밋 + 투표 IP 중복 차단으로 한다.
//    localStorage 중복 차단만으론 시크릿 창 한 번이면 뚫린다.

import { parseTrack } from './track'
import {
  HOT_WINDOW_DAYS,
  PAGE_SIZE,
  MAX_SCENE_BYTES,
  MAX_THUMB_BYTES,
  THUMB_W,
  THUMB_H,
  cleanTitle,
  cleanCreatorName,
  isValidCreatorId,
  isValidId,
  type SceneMeta,
  type SortMode,
} from '../src/lib/sand/gallery'
import { escapeHtml } from '../src/lib/sand/html'
import { decodeScene } from '../src/lib/sand/urlState'
import { isBlank } from '../src/lib/sand/thumb'

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
interface AnalyticsEngine {
  writeDataPoint(event: { blobs?: (string | null)[]; doubles?: number[]; indexes?: string[] }): void
}
interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
  DB: D1Database
  // 선택 바인딩 — 없어도(로컬/미프로비저닝) 계측만 no-op이고 요청은 정상 동작한다.
  AE?: AnalyticsEngine
}

/**
 * 배급 퍼널 계측 — 비차단·프라이버시 보존. 절대 요청을 깨뜨리지 않는다(전부 try/catch).
 * per-user 식별자 없음: event_type · referrer host · country · scene_id(선택)만 집계한다.
 * 활성화 이벤트 = 페이지뷰가 아니라 '씬을 공유/업로드/투표함'(허영지표 배제).
 */
function track(env: Env, event: string, req: Request, sceneId = '', value = 0) {
  try {
    if (!env.AE) return
    let ref = ''
    try {
      ref = new URL(req.headers.get('referer') || '').hostname
    } catch {
      /* referer 없음/불량 — 빈 값 */
    }
    const cf = (req as { cf?: { country?: string } }).cf
    const country = typeof cf?.country === 'string' ? cf.country : ''
    env.AE.writeDataPoint({
      blobs: [event, ref, country, sceneId],
      doubles: [1, value], // value = 챌린지 클리어 잉크 등(없으면 0)
      indexes: [event], // 저카디널리티 샘플링 키
    })
  } catch {
    /* 계측 실패는 조용히 무시 — 요청 처리에 영향 없음 */
  }
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

/** 투표 레이트리밋: 같은 IP가 시간당 N표. PK (scene,ip) 중복차단만으론 프록시/Tor 회전으로
 *  씬마다 무한 적재가 가능해 랭킹 조작·D1 read 소모의 통로가 된다. IP당 시간당 상한으로 마찰을 준다. */
const VOTES_PER_HOUR = 60

async function tooManyVotes(env: Env, hash: string): Promise<boolean> {
  const since = Date.now() - 3600_000
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM votes WHERE ip=? AND created_at>?')
    .bind(hash, since)
    .first<{ n: number }>()
  return (row?.n ?? 0) >= VOTES_PER_HOUR
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const p = url.pathname
    // 최상위 가드: D1 blip 등으로 핸들러가 throw하면 CF가 HTML 1101을 반환 → 클라의 res.json()이
    // 파싱에서 throw → 갤러리와 WebGPU 폴백 탈출구가 동시에 깨진다. 여기서 잡아 JSON 500을 준다.
    try {
      // ── 목록 ──
    if (p === '/api/scenes' && request.method === 'GET') {
      const sort = (url.searchParams.get('sort') as SortMode) === 'new' ? 'new' : 'hot'
      const offset = Math.max(0, Math.min(5000, Number(url.searchParams.get('offset')) || 0))
      const creatorParam = url.searchParams.get('creator')
      const creatorFilter = isValidCreatorId(creatorParam) ? creatorParam : null

      // 계보(parent + remixCount)를 리스트에도 실어 hot/new 카드의 ↻N 배지·remix 링크가
      // Yours뿐 아니라 모든 방문자에게 뜬다 — 리믹스 붙은 씬 = "이어 그릴 만한 씨앗" 발견 신호.
      // idx_scenes_parent가 서브쿼리를 커버(단건 조회가 이미 같은 패턴을 프로덕션에서 돌림).
      const cols =
        'id,title,votes,created_at AS createdAt,w,h,parent,creator_id AS creatorId,creator_name AS creatorName,' +
        '(SELECT COUNT(*) FROM scenes r WHERE r.parent=scenes.id) AS remixCount'

      if (creatorFilter) {
        // 크리에이터 프로필의 씬 그리드 — hot/new 창 없이 이 사람 것만 최신순 페이지네이션.
        const q = `SELECT ${cols} FROM scenes WHERE creator_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?`
        const { results } = await env.DB.prepare(q).bind(creatorFilter, PAGE_SIZE, offset).all<SceneMeta>()
        const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM scenes WHERE creator_id=?')
          .bind(creatorFilter)
          .first<{ n: number }>()
        return json({ scenes: results, total: cnt?.n ?? 0 })
      }

      // hot = 최근 1주일 이내 + 표 순. Powder Toy FP 복제.
      // 이 창이 없으면 오래된 히트작이 영원히 상단을 점거해 신규가 절대 안 보인다.
      const since = Date.now() - HOT_WINDOW_DAYS * 86400_000
      const q =
        sort === 'hot'
          ? `SELECT ${cols} FROM scenes WHERE created_at>? ORDER BY votes DESC, created_at DESC LIMIT ? OFFSET ?`
          : `SELECT ${cols} FROM scenes WHERE created_at>-1 ORDER BY created_at DESC LIMIT ? OFFSET ?`
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
          // 명시 image/png를 브라우저가 다른 타입으로 스니핑하지 못하게(심층방어).
          'x-content-type-options': 'nosniff',
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
      if (await tooManyVotes(env, hash)) return err('too many votes, try later', 429)
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
      track(env, 'vote', request, id)
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
      // parent(계보 원본) + remixCount(이 씬에서 파생된 작품 수)를 항상 포함한다.
      const base = 'id,title,votes,created_at AS createdAt,w,h,parent,' +
        '(SELECT COUNT(*) FROM scenes r WHERE r.parent=scenes.id) AS remixCount'
      const cols = metaOnly ? base : `${base},data`
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
      let body: {
        title?: unknown
        data?: unknown
        thumb?: unknown
        w?: unknown
        h?: unknown
        parent?: unknown
        creator?: unknown
        creatorName?: unknown
      }
      try {
        body = await request.json()
      } catch {
        return err('bad json')
      }

      const data = String(body.data ?? '')
      const thumb = String(body.thumb ?? '')
      const w = Number(body.w)
      const h = Number(body.h)
      // 리믹스 계보: 유효한 id면 원본으로 기록, 아니면(원작) null. 자기참조는 무의미하니 무시.
      const parent = typeof body.parent === 'string' && isValidId(body.parent) ? body.parent : null
      // 닉네임을 지정한 적 있는 크리에이터만 id를 보낸다(creator.ts) — 형식 안 맞으면 완전 익명 취급.
      // name과 id를 함께 묶는다: 이름 없이 id만 저장되면 Top Creators에 빈 이름 행이 뜬다
      // (리더보드는 named creator만 노출한다는 불변식을 여기서 보장한다).
      const creatorName = isValidCreatorId(body.creator) ? cleanCreatorName(body.creatorName) || null : null
      const creatorId = creatorName ? (body.creator as string) : null

      if (!/^[A-Za-z0-9_-]+$/.test(data) || data.length > MAX_SCENE_BYTES) return err('bad scene data')
      if (!/^[A-Za-z0-9+/=]+$/.test(thumb) || thumb.length > MAX_THUMB_BYTES) return err('bad thumb')
      if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 4096 || h > 4096) {
        return err('bad dimensions')
      }

      const hash = await ipHash(request)
      if (await tooManyUploads(env, hash)) return err('too many uploads, try later', 429)

      // 서버측 씬 검증: 형식(정규식·길이)만 통과하고 디코드 불가/빈/폭탄인 data가 직접 API로
      // 들어와 갤러리를 오염시키는 걸 막는다. 정상 클라이언트가 만든 data는 같은 코드로
      // 인코딩·검증되므로 항상 통과한다. decodeScene은 inflate에 2MB 상한이 걸려 폭탄도 안전.
      const decoded = await decodeScene(data)
      if (!decoded || decoded.w !== w || decoded.h !== h) return err('bad scene data')
      if (isBlank(decoded.cells, decoded.w * decoded.h)) return err('blank scene')

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
      // 실제 PNG인지 시그니처로 확인 — 동일출처에 임의 바이너리를 영구 호스팅하지 못하게.
      const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      if (bytes.length < 8 || PNG_SIG.some((v, i) => bytes[i] !== v)) return err('bad thumb')

      // 계보(parent)가 실재하는지 확인 — 유령 id를 가리키는 dangling 계보를 막는다.
      let parentId = parent
      if (parentId) {
        const pExists = await env.DB.prepare('SELECT 1 FROM scenes WHERE id=?').bind(parentId).first()
        if (!pExists) parentId = null
      }

      const id = newId()
      await env.DB.prepare(
        'INSERT INTO scenes (id,title,data,thumb,votes,created_at,w,h,ip,parent,creator_id,creator_name) VALUES (?,?,?,?,0,?,?,?,?,?,?,?)',
      )
        .bind(id, cleanTitle(body.title), data, bytes, Date.now(), w, h, hash, parentId, creatorId, creatorName)
        .run()

      // 활성화 이벤트: 실제 씬 게시(페이지뷰가 아니라 이게 진짜 신호).
      track(env, 'upload', request, id)
      return json({ id })
    }

    // ── Top Creators 리더보드 (동적 :id 라우트보다 먼저 와야 'top'이 id로 안 먹힌다) ──
    if (p === '/api/creators/top' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT creator_id AS id,
                (SELECT creator_name FROM scenes s2 WHERE s2.creator_id = s.creator_id
                   ORDER BY created_at DESC LIMIT 1) AS name,
                SUM(votes) AS votes, COUNT(*) AS scenes
         FROM scenes s
         WHERE creator_id IS NOT NULL
         GROUP BY creator_id
         ORDER BY votes DESC
         LIMIT 20`,
      ).all<{ id: string; name: string | null; votes: number; scenes: number }>()
      return json({ creators: results })
    }

    // ── 크리에이터 프로필 집계 (헤더용 — 씬 목록은 /api/scenes?creator=id로 따로 페이지네이션) ──
    const creatorM = p.match(/^\/api\/creators\/([^/]+)$/)
    if (creatorM && request.method === 'GET') {
      const id = creatorM[1]
      if (!isValidCreatorId(id)) return err('bad id')
      const row = await env.DB.prepare(
        `SELECT
           (SELECT creator_name FROM scenes WHERE creator_id=? ORDER BY created_at DESC LIMIT 1) AS name,
           (SELECT COUNT(*) FROM scenes WHERE creator_id=?) AS sceneCount,
           (SELECT COALESCE(SUM(votes),0) FROM scenes WHERE creator_id=?) AS totalVotes,
           (SELECT COUNT(*) FROM scenes WHERE parent IN (SELECT id FROM scenes WHERE creator_id=?)) AS remixCount`,
      )
        .bind(id, id, id, id)
        .first<{ name: string | null; sceneCount: number; totalVotes: number; remixCount: number }>()
      if (!row || row.sceneCount === 0) return err('not found', 404)
      return json({ id, ...row })
    }

    // ── 클라이언트 이벤트 계측 — 화이트리스트만 허용해 AE 카디널리티·남용을 원천 차단.
    // 기존 4개 지점(공유링크·업로드·투표·목록조회)과 달리 서버가 직접 관측 못 하는 클릭류
    // (예: Ko-fi 후원 링크)만 이걸로 받는다. sendBeacon으로 보내므로 응답 본문은 불필요.
    if (p === '/api/track' && request.method === 'POST') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return new Response(null, { status: 204 })
      }
      const t = parseTrack(body) // 화이트리스트·형식 검증(worker/track.ts)
      if (t) track(env, t.event, request, t.ref, t.value)
      return new Response(null, { status: 204 })
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
          // 공유 링크 인바운드 — 배급이 어디(Reddit/Discord/X)에 착지하는지 referrer로 집계.
          track(env, 'share_open', request, id)
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
<meta property="og:image:width" content="${THUMB_W}">
<meta property="og:image:height" content="${THUMB_H}">
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
            headers: {
              'content-type': 'text/html; charset=utf-8',
              'cache-control': 'public, max-age=300',
              'x-content-type-options': 'nosniff',
            },
          })
        }
      }
      // 잘못된/삭제된 id → 앱 홈으로 보낸다(막다른 404 대신).
      return Response.redirect(`${url.origin}/`, 302)
    }

      return env.ASSETS.fetch(request)
    } catch (e) {
      console.error('worker error:', e)
      return p.startsWith('/api/')
        ? err('server error', 500)
        : new Response('Service temporarily unavailable — please retry.', {
            status: 503,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          })
    }
  },
}
