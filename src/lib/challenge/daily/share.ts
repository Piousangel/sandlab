/** 데일리 공유 문구·순위 표시·당일 기록. 공유 문구엔 번호만(로컬 날짜를 쓰면 시간대마다 어긋난다). */
export function shareText(n: number, stars: number, ink: number): string {
  return `Sandlab Daily #${n} ${'⭐'.repeat(stars)} ${ink.toLocaleString('en-US')} ink\nhttps://sandlab.app/daily`
}

/** 서버가 주는 백분위 [p10,p25,p50,p75,p90]로 대략의 위치. 잉크가 적을수록 상위. 순위표는 없다. */
export function rankLabel(ink: number, pct: number[]): string {
  if (pct.length < 5) return 'One of the first to solve it today'
  if (ink <= pct[0]) return 'Top 10% today'
  if (ink <= pct[1]) return 'Top 25% today'
  if (ink <= pct[2]) return 'Top half today'
  return 'Solved today'
}

const KEY = 'sandlab.daily.v1'
type Rec = { stars: number; ink: number }

export function loadDaily(day: number): Rec | null {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, Rec>
    return all[day] ?? null
  } catch {
    return null
  }
}

/** 그날 첫 클리어만 기록한다(서버도 IP당 하루 1건). */
export function saveDaily(day: number, r: Rec): void {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, Rec>
    if (all[day]) return
    all[day] = r
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* 저장 실패해도 결과 표시는 된다 */
  }
}
