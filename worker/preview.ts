/**
 * 프리뷰 Worker(S6, wrangler env `preview`) 전용 — 응답에 noindex를 붙인다.
 * prod는 이 함수를 부르지 않는다(env.NOINDEX 없음). 정적 에셋 응답은 out/_headers(scripts/preview-headers.mjs)가 맡는다.
 */
export const NOINDEX_VALUE = 'noindex, nofollow'

export function withNoindex(res: Response): Response {
  // Response.redirect·fetch 결과는 헤더가 불변일 수 있어 복사본에 단다(본문 스트림은 그대로 넘긴다).
  const out = new Response(res.body, res)
  out.headers.set('x-robots-tag', NOINDEX_VALUE)
  return out
}

/**
 * 프리뷰 쓰기 차단(오너 11-20: 프리뷰는 prod와 같은 D1을 쓰되 쓰기를 막는다).
 * env.READ_ONLY === '1'(wrangler env.preview에만 있음)일 때 워커가 이 함수를 먼저 부른다.
 * `/api/*`의 GET·HEAD 외 모든 메서드(POST 업로드·투표·데일리·Spill 클리어·track, 앞으로 생길 PUT·DELETE 포함)를
 * 핸들러에 닿기 전에 403으로 끊는다 — 라우트별 목록이 아니라 메서드 기준이라 새 쓰기 라우트도 자동으로 막힌다.
 * 차단 대상이 아니면 null(평소대로 처리).
 */
export const READ_ONLY_ERROR = 'preview is read-only'
const SAFE_METHODS = new Set(['GET', 'HEAD'])

export function readOnlyBlock(req: Request): Response | null {
  if (SAFE_METHODS.has(req.method)) return null
  if (!new URL(req.url).pathname.startsWith('/api/')) return null
  return new Response(JSON.stringify({ error: READ_ONLY_ERROR }), {
    status: 403,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
