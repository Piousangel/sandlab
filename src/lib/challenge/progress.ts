/** 레벨별 최고 기록 — 가입 없음 원칙이라 브라우저에만. 저장소가 막혀도 플레이는 정상. */
export interface Best {
  stars: 1 | 2 | 3
  ink: number
}

const KEY = 'sandlab.challenge.v1'

export function loadProgress(): Record<string, Best> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as Record<string, Best>) : {}
  } catch {
    return {}
  }
}

const better = (a: Best, b: Best) => a.stars > b.stars || (a.stars === b.stars && a.ink < b.ink)

/** 기존보다 좋을 때만 저장(별이 많거나, 같은 별에 잉크가 적거나). 최종 best를 돌려준다. */
export function saveBest(levelId: string, b: Best): Best {
  const all = loadProgress()
  const prev = all[levelId]
  if (prev && !better(b, prev)) return prev
  all[levelId] = b
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* 저장 실패해도 이번 판 결과는 보여준다 */
  }
  return b
}
