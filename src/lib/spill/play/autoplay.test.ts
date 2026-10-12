import { describe, it, expect } from 'vitest'
import { autoplaySync, startAutoplay, startWatch } from './autoplay'
import { SpillController, TICK_MS } from './controller'
import { devActions, simulate } from './attempt'
import { GATE_LEVEL, POT_LEVEL } from './fixtures'
import { defineLevel } from '../level/define'

describe('autoplay (dev solution through the controller)', () => {
  it.each([POT_LEVEL, GATE_LEVEL])('$id: same result as direct simulate', (lvl) => {
    const c = new SpillController(lvl, { now: () => 0 })
    const r = autoplaySync(c)
    expect(c.phase).toBe('cleared')
    expect(r).toEqual(simulate(lvl, devActions(lvl)))
  })

  it('frame-driven autoplay (UI loop) reaches the same result', () => {
    const c = new SpillController(GATE_LEVEL, { now: () => 0 })
    startAutoplay(c)
    expect(c.phase).toBe('run')
    c.setSpeed(4)
    for (let k = 0; c.phase === 'run' && k < 3000; k++) c.frame(TICK_MS)
    expect(c.getState().result).toEqual(simulate(GATE_LEVEL, devActions(GATE_LEVEL)))
  })

  it('restarts from a dirty controller and handles tick-0 triggers', () => {
    const lvl = defineLevel({ ...GATE_LEVEL, dev: [[0, 'trigger', 0, 0, 0, 0, 'g1']] })
    const c = new SpillController(lvl, { now: () => 0 })
    c.act({ verb: 'dig', tx: 3, ty: 15, tx2: 3, ty2: 17 })
    c.run()
    c.advance(20)
    const r = autoplaySync(c)
    expect(r).toEqual(simulate(lvl, devActions(lvl)))
    expect(c.getState().setup).toEqual([])
  })

  it('Watch keeps the player plan aside and Retry restores it (dev actions never become the player setup)', () => {
    const c = new SpillController(GATE_LEVEL, { now: () => 0 })
    const mine = { verb: 'dig' as const, tx: 3, ty: 15, tx2: 3, ty2: 17 }
    expect(c.act(mine).ok).toBe(true)
    startWatch(c)
    expect(c.getState().watching).toBe(true)
    expect(c.getState().setup).toEqual([])
    c.advance(3000)
    expect(c.phase).toBe('cleared')
    expect(c.getState().watching).toBe(true)
    c.retry()
    const s = c.getState()
    expect(s.phase).toBe('setup')
    expect(s.watching).toBe(false)
    expect(s.setup).toEqual([{ tick: 0, ...mine }])
    expect(s.ghosts).toEqual([])
  })

  it('clear-all during a watch drops the saved plan', () => {
    const c = new SpillController(GATE_LEVEL, { now: () => 0 })
    c.act({ verb: 'dig', tx: 3, ty: 15, tx2: 3, ty2: 17 })
    startWatch(c)
    c.clearAll()
    expect(c.getState().watching).toBe(false)
    expect(c.getState().setup).toEqual([])
  })
})

