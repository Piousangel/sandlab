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
