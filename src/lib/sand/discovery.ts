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

/**
 * 유휴 제안 — "물을 용암에 부어봐" 같은 넛지. materials.ts의 reactions(단일 진실 공급원)에서
 * 직접 뽑아 여기 따로 하드코딩하지 않는다 — 반응 테이블이 바뀌면 자동으로 따라온다.
 *
 * 반응이 실제로 일어났는지는(=WGSL 안에서만 일어남) 감지하지 않는다 — "해봐"만 제안하고
 * "일어났다"는 확인하지 않는다. 그래서 GPU 리드백도 셰이더 변경도 필요 없다.
 */
export interface SuggestionPair {
  a: string
  b: string
  aName: string
  bName: string
}

export function buildSuggestionPairs(
  mats: { slug: string; name: string; reactions: { with: string }[] }[],
): SuggestionPair[] {
  const bySlug = new Map(mats.map((m) => [m.slug, m]))
  const seen = new Set<string>()
  const pairs: SuggestionPair[] = []
  for (const m of mats) {
    for (const r of m.reactions) {
      if (r.with === 'empty' || r.with === m.slug) continue
      const other = bySlug.get(r.with)
      if (!other) continue
      const key = [m.slug, r.with].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ a: m.slug, b: r.with, aName: m.name, bName: other.name })
    }
  }
  return pairs
}

/**
 * 아직 두 재료를 다 안 써본 반응쌍 중 하나를 골라 제안 문구를 만든다.
 * 전부 시도했으면(둘 다 tried인 쌍만 남으면) null — 더 넛지할 게 없다.
 */
export function pickSuggestion(
  pairs: SuggestionPair[],
  tried: Set<string>,
  rand: () => number = Math.random,
): string | null {
  const untried = pairs.filter((p) => !tried.has(p.a) || !tried.has(p.b))
  if (untried.length === 0) return null
  const p = untried[Math.floor(rand() * untried.length)]
  return `Try ${p.aName} on ${p.bName}`
}
