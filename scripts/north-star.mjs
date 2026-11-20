/**
 * 북극성 줄(NORTH-STAR 2장) — daily-metrics.mjs가 AE에서 읽은 값을 지표 파일 한 덩어리로 만든다.
 * AE 열: blob1 = 이벤트, blob5 = 익명 기기 id(/api/track, 11-20 측정 PR부터), double2 = value(landing 1 = 홈 진입).
 * 측정 PR 배포 전 이벤트에는 blob5가 비어 있어 북극성에서 빠진다 — 7일 창이 다 차기 전 값은 '부분'이라 적는다.
 */

/** 주간 손댄 방문자 = 첫 획 또는 퍼즐 시작 기기. */
export const TOUCH_EVENTS = ['first_stroke', 'challenge_start', 'daily_start']

/** IN 대신 OR — 지금 지표 쿼리가 이미 쓰는 문법만 쓴다(AE SQL 문서 접근 불가로 미확인 구문 회피). */
const anyOf = (xs) => `(${xs.map((x) => `blob1 = '${x}'`).join(' OR ')})`

/** 기기별 1행 — 행 수가 distinct 기기 수다(AE SQL의 COUNT(DISTINCT) 지원 여부와 무관하게 동작). */
export function devicesSql(events, days = 7) {
  return `SELECT blob5 AS d, SUM(_sample_interval) AS n FROM sandlab_events
     WHERE timestamp > NOW() - INTERVAL '${days}' DAY AND ${anyOf(events)} AND blob5 != ''
     GROUP BY d LIMIT 100000`
}

/** 첫 붓기율 분자·분모(세션 수). */
export function firstPourSql(days = 7) {
  return `SELECT blob1 AS event, SUM(_sample_interval) AS n FROM sandlab_events
     WHERE timestamp > NOW() - INTERVAL '${days}' DAY
       AND (blob1 = 'first_stroke' OR (blob1 = 'landing' AND double2 = 1))
     GROUP BY event`
}

/**
 * @param {{ touched: unknown[], dailyClear: unknown[], pour: { event: string, n: number | string }[], since: string, today: string }} a
 * @returns {string[]} 지표 파일에 그대로 찍을 줄
 */
export function northStarLines({ touched, dailyClear, pour, since, today }) {
  const n = (ev) => Number(pour.find((r) => r.event === ev)?.n ?? 0)
  const strokes = n('first_stroke')
  const homes = n('landing')
  const days = Math.floor((Date.parse(today) - Date.parse(since)) / 86400000)
  const partial = days < 7 ? ` (부분: 측정 ${since}부터 ${Math.max(days, 0)}일치)` : ''
  const rate = homes > 0 ? `${Math.round((strokes / homes) * 100)}% (${strokes}/${homes})` : `— (홈 진입 0, 첫 획 ${strokes})`
  return [
    `북극성 — 주간 손댄 방문자(7일, 고유 기기): ${touched.length}${partial}`,
    `데일리 클리어 기기(7일): ${dailyClear.length} · 첫 붓기율(7일, 세션): ${rate}`,
  ]
}
