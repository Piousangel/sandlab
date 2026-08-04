/**
 * 세션 스코프 "처음 써본 재료" 알림 — 온-페이지 체류시간 장치.
 *
 * 왜 이렇게 약하게 만들었나:
 *   진짜 "발견" 메커니즘(Infinite Craft류 — "이 조합 처음 봄")은 셀룰러 오토마타 반응이
 *   전부 WGSL 셰이더 안에서 일어나서, CPU/JS가 "방금 그 반응이 실제로 일어났다"를 알려면
 *   셰이더에 이벤트를 내보내게 하거나 격자를 주기적으로 읽어야 한다 — 둘 다 실브라우저
 *   시각/성능 검증이 필요하다("시뮬에 더 붓지 마라" 원칙과도 저울질). 그 검증이 막힌
 *   세션이라, 대신 클라이언트에서 이미 아는 사실(이번 방문에 어떤 재료를 실제로 칠했는가)만
 *   으로 만든 약한 버전. GPU 리드백 0, 새 셰이더 0 — 순수 JS 세션 상태.
 *
 * 리로드하면 사라진다(세션 스코프) — 재방문 훅(Yours 탭)과는 다른 층위, 방문 "안"의 장치다.
 */

/**
 * 이번 세션에 처음 칠하는 재료면 토스트 문구를 돌려주고 tried에 추가한다.
 * 이미 써본 재료거나 빈 칸(지우개)이면 null.
 */
export function noteFirstTry(
  tried: Set<string>,
  slug: string,
  displayName: string,
  total: number,
): string | null {
  if (slug === 'empty' || tried.has(slug)) return null
  tried.add(slug)
  if (tried.size >= total) return `New: ${displayName} — every material tried!`
  return `New: ${displayName} (${tried.size}/${total} tried)`
}
