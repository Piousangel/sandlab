import { describe, it, expect } from 'vitest'
import { Attempt, MAX_ACTIONS, devActions, simulate } from './attempt'
import { parseLevel } from '../level/parse'
import { BAD_LEVEL, GATE_LEVEL, POT_LEVEL, PROTECT_LEVEL } from './fixtures'
import { FAIL_WINDOW, WAIT_WINDOW } from './failure'

describe('Attempt / simulate (shared tick loop)', () => {
  it('dev solution clears the pot level within par time and grabs the gem', () => {
    const r = simulate(POT_LEVEL, devActions(POT_LEVEL))
    expect(r.outcome).toBe('cleared')
    expect(r.moves).toBe(1)
    expect(r.dug).toBe(3)
    expect(r.gems).toBe(1)
    expect(r.gemMask).toEqual([true])
    expect(r.ticks).toBeLessThanOrEqual(POT_LEVEL.par!.secs * 60)
    expect(r.latched).toEqual(['pot'])
    expect(r.hash).toMatch(/^[0-9a-f]{8}$/)
  })

  it('clear happens on the tick the last target latches', () => {
    const a = new Attempt(parseLevel(POT_LEVEL))
    a.apply({ verb: 'dig', tx: 18, ty: 15, tx2: 18, ty2: 17 })
    let latchTick = -1
    while (a.status === 'live') {
      const u = a.step()
      if (u.latched.length) latchTick = a.sim.tick
    }
    expect(a.status).toBe('cleared')
    expect(a.endTick).toBe(latchTick)
    expect(a.judge.targets[0].latchTick).toBe(latchTick)
  })

  it('doing nothing fails (stalled or sources stopped) well before the hard cap', () => {
    const r = simulate(POT_LEVEL, [])
    expect(r.outcome).toBe('failed')
    expect(['stalled', 'sourcesStopped']).toContain(r.reason)
    expect(r.ticks).toBeGreaterThanOrEqual(FAIL_WINDOW)
    expect(r.ticks).toBeLessThan(1200)
    expect(r.targetsLeft).toBe(1)
  })

  it('bad target fails instantly when reached', () => {
    const r = simulate(BAD_LEVEL, devActions(BAD_LEVEL))
    expect(r.outcome).toBe('failed')
    expect(r.reason).toBe('bad')
  })

  it('protect target latches after holdTicks', () => {
    const r = simulate(PROTECT_LEVEL, [])
    expect(r.outcome).toBe('cleared')
    expect(r.ticks).toBe(30)
  })

  it('run-phase trigger at its tick opens the gate and clears', () => {
    const r = simulate(GATE_LEVEL, devActions(GATE_LEVEL))
    expect(r.outcome).toBe('cleared')
    expect(r.moves).toBe(1)
  })

  it('same inputs give the same hash; a different salt gives a different trajectory', () => {
    const a = simulate(POT_LEVEL, devActions(POT_LEVEL))
    const b = simulate(POT_LEVEL, devActions(POT_LEVEL))
    expect(b).toEqual(a)
    const c = simulate(POT_LEVEL, devActions(POT_LEVEL), { salt: 12345 })
    expect(c.hash === a.hash && c.ticks === a.ticks).toBe(false)
  })

  it('rejects an illegal action instead of silently skipping it', () => {
    expect(() => simulate(POT_LEVEL, [{ tick: 0, verb: 'dig', tx: 18, ty: 40, tx2: 18, ty2: 41 }])).toThrow(/illegal/)
    expect(() => simulate(POT_LEVEL, [{ tick: 5, verb: 'dig', tx: 18, ty: 15, tx2: 18, ty2: 17 }, { tick: 2, verb: 'dig', tx: 10, ty: 15, tx2: 10, ty2: 17 }])).toThrow(/order/)
  })

  it('caps an attempt at 32 actions (replay limit)', () => {
    const a = new Attempt(parseLevel(POT_LEVEL))
    for (let x = 1; x <= MAX_ACTIONS; x++) expect(a.apply({ verb: 'dig', tx: x, ty: 16, tx2: x, ty2: 16 }).ok).toBe(true)
    expect(a.apply({ verb: 'dig', tx: 35, ty: 16, tx2: 35, ty2: 16 })).toEqual({ ok: false, reason: 'limit' })
  })

  it('gatesClosed counts tappable gates not yet triggered', () => {
    const a = new Attempt(parseLevel(GATE_LEVEL))
    expect(a.gatesClosed).toBe(2)
    a.apply({ verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g2' })
    expect(a.gatesClosed).toBe(1)
    a.reset()
    expect(a.gatesClosed).toBe(2)
    expect(new Attempt(parseLevel(POT_LEVEL)).gatesClosed).toBe(0)
  })
})
