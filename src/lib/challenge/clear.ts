import type { GoalStatus } from './types'

/** 판정 주기 0.5초 × 4회 ≈ 2초 연속 충족 = 클리어(순간적으로 스치는 건 인정하지 않는다). */
export const CLEAR_STREAK = 4

export class ClearTracker {
  private streak = 0
  private done = false

  /** 이번 push로 처음 클리어됐으면 true. 목표가 없으면 충족으로 보지 않는다. */
  push(statuses: GoalStatus[]): boolean {
    if (this.done) return false
    const all = statuses.length > 0 && statuses.every((s) => s.met)
    this.streak = all ? this.streak + 1 : 0
    if (this.streak >= CLEAR_STREAK) {
      this.done = true
      return true
    }
    return false
  }

  get cleared(): boolean {
    return this.done
  }

  reset(): void {
    this.streak = 0
    this.done = false
  }
}

export function starsFor(totalInk: number, stars: [number, number]): 1 | 2 | 3 {
  if (totalInk <= stars[0]) return 3
  if (totalInk <= stars[1]) return 2
  return 1
}
