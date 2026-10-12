import { describe, it, expect } from 'vitest'
import { FailureDetector, FAIL_WINDOW, HARD_CAP, MOVE_EPS, WAIT_WINDOW, type TickObs } from './failure'

const quiet = (tick: number, o: Partial<TickObs> = {}): TickObs => ({
  tick, moved: 0, progressed: false, sourcesLeft: 10, burning: 0, bad: false, crateBroken: false, ...o,
})

function feed(d: FailureDetector, n: number, o: Partial<TickObs> = {}, from = 1) {
  let r = null
  for (let t = from; t < from + n; t++) {
    r = d.observe(quiet(t, o))
    if (r) return { r, t }
  }
  return { r, t: -1 }
}

describe('FailureDetector (§4.2)', () => {
  it('constants match the spec', () => {
    expect(FAIL_WINDOW).toBe(90)
    expect(MOVE_EPS).toBe(64)
    expect(HARD_CAP).toBe(2700)
  })

  it('(a) stalls after exactly 90 consecutive quiet ticks, not 89', () => {
    const d = new FailureDetector()
    expect(feed(d, 89).r).toBeNull()
    expect(d.observe(quiet(90))).toBe('stalled')
  })

  it('(a) moved 63 counts as quiet, moved 64 resets the window', () => {
    const d = new FailureDetector()
    expect(feed(d, 89, { moved: MOVE_EPS - 1 }).r).toBeNull()
    expect(d.observe(quiet(90, { moved: MOVE_EPS }))).toBeNull()
    expect(feed(d, 89, { moved: MOVE_EPS - 1 }, 91).r).toBeNull()
    expect(d.observe(quiet(180, { moved: 63 }))).toBe('stalled')
  })

  it('(a) sensor progress resets the window', () => {
    const d = new FailureDetector()
    feed(d, 89)
    expect(d.observe(quiet(90, { progressed: true }))).toBeNull()
    expect(feed(d, 89, {}, 91).r).toBeNull()
    expect(d.observe(quiet(180))).toBe('stalled')
  })

  it('(b) sources stopped for 90 ticks fails even with sensor progress', () => {
    const d = new FailureDetector()
    const r = feed(d, 200, { sourcesLeft: 0, progressed: true })
    expect(r).toEqual({ r: 'sourcesStopped', t: 90 })
  })

  it('(b) is held off while a spout still has material, something moves, or something burns', () => {
    for (const o of [{ sourcesLeft: 1 }, { moved: 1 }, { burning: 1 }]) {
      const d = new FailureDetector()
      expect(feed(d, 200, { sourcesLeft: 0, progressed: true, ...o }).r).toBeNull()
    }
  })

  it('bad latch and crate damage fail instantly', () => {
    expect(new FailureDetector().observe(quiet(1, { bad: true, moved: 999 }))).toBe('bad')
    expect(new FailureDetector().observe(quiet(1, { crateBroken: true, moved: 999 }))).toBe('crate')
  })

  it('hard cap at tick 2700 even while busy', () => {
    const d = new FailureDetector()
    expect(feed(d, HARD_CAP - 1, { moved: 999 }).r).toBeNull()
    expect(d.observe(quiet(HARD_CAP, { moved: 999 }))).toBe('timeout')
  })

  it('reset clears the windows', () => {
    const d = new FailureDetector()
    feed(d, 89)
    d.reset()
    expect(feed(d, 89).r).toBeNull()
  })

  it('while waiting for a first gate tap with nothing moved, the stall window is WAIT_WINDOW', () => {
    expect(WAIT_WINDOW).toBe(600)
    const d = new FailureDetector()
    expect(feed(d, WAIT_WINDOW - 1, { waiting: true }).r).toBeNull()
    expect(d.observe(quiet(WAIT_WINDOW, { waiting: true }))).toBe('stalled')
  })

  it('leaving the waiting state starts a fresh 90-tick stall window', () => {
    const d = new FailureDetector()
    expect(feed(d, 400, { waiting: true }).r).toBeNull()
    expect(feed(d, FAIL_WINDOW - 1, {}, 401).r).toBeNull()
    expect(d.observe(quiet(401 + FAIL_WINDOW - 1))).toBe('stalled')
  })
})
