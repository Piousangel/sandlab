/**
 * 실제로 돈 틱/s와 배속 유지 판정 (리뷰 S0 #5, §7.3 S0 게이트 "2x 이상 유지").
 * 루프는 프레임 예산(12ms)을 넘으면 틱을 버리지 않고 느리게 돈다 — 그러면 ms/tick이 낮아도
 * 배속이 실제로는 유지되지 않을 수 있으므로 창(기본 1초) 안에서 돈 틱 수를 직접 센다.
 */
import { TICKS_PER_SEC } from './cases'

/** 목표의 이 비율 이상이면 "유지" */
export const HELD_RATIO = 0.95

export class TickRate {
  private t: number[] = []
  private n: number[] = []
  constructor(private readonly windowMs = 1000) {}

  /** now 시각의 프레임에서 ticks틱을 돌렸다 */
  add(now: number, ticks: number): void {
    this.t.push(now)
    this.n.push(ticks)
    const cut = now - this.windowMs
    let k = 0
    while (k < this.t.length && this.t[k] < cut) k++
    if (k > 0) { this.t.splice(0, k); this.n.splice(0, k) }
  }

  /** 창이 거의 찼을 때만 의미가 있다 — 아니면 null */
  private span(now: number): number | null {
    if (this.t.length < 2) return null
    const span = now - this.t[0]
    return span >= this.windowMs * 0.9 ? span : null
  }

  ticksPerSec(now: number): number {
    if (this.t.length < 2) return 0
    const span = now - this.t[0]
    if (span <= 0) return 0
    let s = 0
    for (let k = 1; k < this.n.length; k++) s += this.n[k] // 첫 기록은 창의 시작점
    return (s * 1000) / span
  }

  /** speed배속(60×speed 틱/s)을 유지하는가. 창이 덜 찼으면 null */
  held(now: number, speed: number): boolean | null {
    if (this.span(now) === null) return null
    return this.ticksPerSec(now) >= TICKS_PER_SEC * speed * HELD_RATIO
  }

  reset(): void {
    this.t = []
    this.n = []
  }
}
