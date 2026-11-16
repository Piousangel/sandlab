/**
 * Spill 데일리 — UTC 날짜 → 번호 → 레벨. 순수 함수라 전 세계가 같은 날 같은 퍼즐을 받는다.
 * 번호 체계는 옛 데일리와 같다(#1 = 2026-10-09). 풀은 고정 id 목록이라 레벨을 추가해도 오늘 퍼즐이 바뀌지 않는다.
 */
export const LAUNCH_UTC = Date.UTC(2026, 9, 9)
const DAY_MS = 86_400_000

/** 1-1은 튜토리얼이라 제외. 목록을 바꾸면 이후 날짜의 퍼즐이 바뀌니 추가는 허용, 순서 변경은 금지. */
export const DAILY_POOL_IDS = ['1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9', '1-10'] as const

export function dayNumber(nowMs: number): number {
  return Math.max(1, Math.floor((nowMs - LAUNCH_UTC) / DAY_MS) + 1)
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** 연속한 두 날이 같은 레벨이 되지 않고(보폭 ≥2) 풀 전체를 한 바퀴 도는(서로소) 보폭. */
function stepFor(len: number): number {
  for (let s = 2; s < len; s++) if (gcd(s, len) === 1) return s
  return 1
}

export function dailyIdFor(n: number): string {
  const len = DAILY_POOL_IDS.length
  return DAILY_POOL_IDS[((Math.max(1, n) - 1) * stepFor(len)) % len]
}

export function shareText(n: number, stars: number, moves: number, levelId: string): string {
  return `Sandlab Daily #${n} (${levelId}) ${'⭐'.repeat(stars)} ${moves} ${moves === 1 ? 'move' : 'moves'}\nhttps://sandlab.app/daily`
}

const KEY = 'sandlab.spill-daily.v1'
export type DailyRec = { stars: number; moves: number }

export function loadDaily(day: number): DailyRec | null {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, DailyRec>
    return all[day] ?? null
  } catch {
    return null
  }
}

/** 그날 첫 클리어만 기록한다. */
export function saveDaily(day: number, r: DailyRec): void {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, DailyRec>
    if (all[day]) return
    all[day] = r
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* 저장 실패해도 결과 표시는 된다 */
  }
}
