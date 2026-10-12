export const FAIL_WINDOW = 90
export const MOVE_EPS = 64
export const HARD_CAP = 2700
export const WAIT_WINDOW = 600

export type FailReason = 'stalled' | 'sourcesStopped' | 'bad' | 'crate' | 'timeout'

export interface TickObs {
  tick: number
  moved: number
  progressed: boolean
  sourcesLeft: number
  burning: number
  bad: boolean
  crateBroken: boolean
  waiting?: boolean
}

export class FailureDetector {
  private stall = 0
  private idle = 0
  private wait = 0

  reset(): void {
    this.stall = 0
    this.idle = 0
    this.wait = 0
  }

  observe(o: TickObs): FailReason | null {
    if (o.bad) return 'bad'
    if (o.crateBroken) return 'crate'
    if (o.waiting) {
      this.stall = 0
      this.wait++
      if (this.wait >= WAIT_WINDOW) return 'stalled'
    } else this.stall = !o.progressed && o.moved < MOVE_EPS ? this.stall + 1 : 0
    this.idle = o.sourcesLeft === 0 && o.moved === 0 && o.burning === 0 ? this.idle + 1 : 0
    if (this.stall >= FAIL_WINDOW) return 'stalled'
    if (this.idle >= FAIL_WINDOW) return 'sourcesStopped'
    if (o.tick >= HARD_CAP) return 'timeout'
    return null
  }
}
