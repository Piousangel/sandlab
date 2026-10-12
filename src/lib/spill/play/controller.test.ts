import { describe, it, expect } from 'vitest'
import { SpillController, TICK_MS, MAX_FRAME_MS, CAP_SAMPLE_TICKS, type Phase, type PlayEvent } from './controller'
import { BAD_LEVEL, GATE_LEVEL, POT_LEVEL } from './fixtures'
import type { LevelDef } from '../level/define'
import { M } from '../sim/materials'
import { W } from '../sim/grid'

const DIG = { verb: 'dig' as const, tx: 18, ty: 15, tx2: 18, ty2: 17 }
const DIG2 = { verb: 'dig' as const, tx: 10, ty: 15, tx2: 10, ty2: 17 }
const TRIG = { verb: 'trigger' as const, tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' }

function ctl(level: LevelDef = POT_LEVEL, opts: ConstructorParameters<typeof SpillController>[1] = {}) {
  return new SpillController(level, { now: () => 0, ...opts })
}

function finish(c: SpillController, max = 3000) {
  let n = 0
  while ((c.phase === 'run') && n < max) n += c.advance(1)
  return n
}

function inPhase(p: Phase): SpillController {
  const c = ctl()
  if (p === 'setup') return c
  if (p === 'cleared') c.act(DIG)
  c.run()
  if (p === 'paused') c.pause()
  if (p === 'failed' || p === 'cleared') finish(c)
  expect(c.phase).toBe(p)
  return c
}

function freshHash(level: LevelDef, setup: object[] = []) {
  const c = ctl(level)
  for (const a of setup) c.act(a as typeof DIG)
  return c.sim.hash()
}

describe('SpillController state machine', () => {
  const cmds: Record<string, (c: SpillController) => void> = {
    run: (c) => c.run(),
    pause: (c) => c.pause(),
    resume: (c) => c.resume(),
    retry: (c) => c.retry(),
    undo: (c) => c.undo(),
    clearAll: (c) => c.clearAll(),
    dig: (c) => c.act(DIG2),
  }
  const table: Record<Phase, Record<string, Phase>> = {
    setup: { run: 'run', pause: 'setup', resume: 'setup', retry: 'setup', undo: 'setup', clearAll: 'setup', dig: 'setup' },
    run: { run: 'run', pause: 'paused', resume: 'run', retry: 'setup', undo: 'run', clearAll: 'setup', dig: 'run' },
    paused: { run: 'paused', pause: 'paused', resume: 'run', retry: 'setup', undo: 'paused', clearAll: 'setup', dig: 'paused' },
    failed: { run: 'failed', pause: 'failed', resume: 'failed', retry: 'setup', undo: 'failed', clearAll: 'setup', dig: 'failed' },
    cleared: { run: 'cleared', pause: 'cleared', resume: 'cleared', retry: 'setup', undo: 'cleared', clearAll: 'setup', dig: 'cleared' },
  }
  for (const [from, row] of Object.entries(table) as [Phase, Record<string, Phase>][])
    for (const [cmd, to] of Object.entries(row))
      it(`${from} --${cmd}--> ${to}`, () => {
        const c = inPhase(from)
        cmds[cmd](c)
        expect(c.phase).toBe(to)
        expect(c.getState().phase).toBe(to)
      })

  it('starts in setup with zero moves at tick 0', () => {
    const s = ctl().getState()
    expect(s).toMatchObject({ phase: 'setup', tick: 0, moves: 0, attempt: 1, fails: 0, canUndo: false })
  })
})

describe('Setup: actions, unlimited undo, legality', () => {
  it('each legal action is one move and applies immediately', () => {
    const c = ctl()
    expect(c.act(DIG).ok).toBe(true)
    expect(c.getState().moves).toBe(1)
    expect(c.sim.grid.mat[64 * W + 72]).toBe(M.empty)
  })

  it('illegal input costs zero moves and emits a reject', () => {
    const c = ctl()
    const ev: PlayEvent[] = []
    c.onEvent((e) => ev.push(e))
    const r = c.act({ verb: 'dig', tx: 18, ty: 40, tx2: 18, ty2: 41 })
    expect(r).toEqual({ ok: false, reason: 'illegal' })
    expect(c.getState().moves).toBe(0)
    expect(ev).toEqual([{ type: 'reject', reason: 'illegal' }])
  })

  it('trigger is not allowed in setup', () => {
    const c = ctl(GATE_LEVEL)
    expect(c.act(TRIG)).toEqual({ ok: false, reason: 'phase' })
  })

  it('undo is unlimited in setup and restores the exact grid', () => {
    const c = ctl()
    const h0 = c.sim.hash()
    const digs = [DIG, DIG2, { ...DIG, tx: 30, tx2: 30 }, { ...DIG, tx: 5, tx2: 5 }, { ...DIG, tx: 25, tx2: 25 }]
    for (const d of digs) expect(c.act(d).ok).toBe(true)
    expect(c.getState().moves).toBe(5)
    const h3 = freshHash(POT_LEVEL, digs.slice(0, 3))
    c.undo()
    c.undo()
    expect(c.sim.hash()).toBe(h3)
    for (let k = 0; k < 3; k++) expect(c.undo()).toBe(true)
    expect(c.undo()).toBe(false)
    expect(c.getState()).toMatchObject({ moves: 0, canUndo: false })
    expect(c.sim.hash()).toBe(h0)
  })

  it('undo does nothing outside setup', () => {
    const c = ctl()
    c.act(DIG)
    c.run()
    expect(c.undo()).toBe(false)
    expect(c.getState().moves).toBe(1)
  })
})

describe('Run: move counting §4.1, run-phase actions, trigger while paused', () => {
  it('moves = setup actions + run actions; illegal run input costs nothing', () => {
    const c = ctl()
    c.act(DIG2)
    c.run()
    c.advance(3)
    expect(c.getState().moves).toBe(1)
    expect(c.act(DIG).ok).toBe(true)
    expect(c.act({ verb: 'dig', tx: 18, ty: 40, tx2: 18, ty2: 41 }).ok).toBe(false)
    expect(c.getState().moves).toBe(2)
    expect(c.getState().run).toEqual([{ tick: 3, ...DIG }])
  })

  it('trigger while paused is recorded at the next tick boundary, drops FF to 1x, costs one move', () => {
    const c = ctl(GATE_LEVEL)
    c.run()
    c.setSpeed(4)
    c.advance(12)
    c.pause()
    const gates = c.sim.count(M.gate)
    expect(c.act(TRIG).ok).toBe(true)
    expect(c.sim.count(M.gate)).toBeLessThan(gates)
    const s = c.getState()
    expect(s.phase).toBe('paused')
    expect(s.speed).toBe(1)
    expect(s.moves).toBe(1)
    expect(s.run).toEqual([{ tick: 12, ...TRIG }])
    expect(s.triggered).toEqual(['g1'])
    expect(c.act(TRIG)).toEqual({ ok: false, reason: 'gate' })
    c.resume()
    finish(c)
    expect(c.phase).toBe('cleared')
  })

  it('paused does not tick', () => {
    const c = ctl()
    c.run()
    c.advance(5)
    c.pause()
    expect(c.frame(500)).toBe(0)
    expect(c.advance(10)).toBe(0)
    expect(c.getState().tick).toBe(5)
  })

  it('clears on the latch tick with result, latch event first, then stops ticking', () => {
    const c = ctl()
    const ev: PlayEvent[] = []
    c.onEvent((e) => ev.push(e))
    c.act(DIG)
    c.run()
    finish(c)
    const r = c.getState().result!
    expect(r.outcome).toBe('cleared')
    expect(r.moves).toBe(1)
    expect(r.gems).toBe(1)
    const types = ev.map((e) => e.type)
    expect(types.indexOf('latch')).toBeLessThan(types.indexOf('clear'))
    const latch = ev.find((e) => e.type === 'latch') as Extract<PlayEvent, { type: 'latch' }>
    expect(latch.tick).toBe(r.ticks)
    expect(ev.some((e) => e.type === 'gem')).toBe(true)
    expect(c.advance(10)).toBe(0)
    expect(c.getState().tick).toBe(r.ticks)
  })

  it('idle run fails, counts fails, reports targets left', () => {
    const c = ctl()
    const ev: PlayEvent[] = []
    c.onEvent((e) => ev.push(e))
    c.run()
    finish(c)
    const s = c.getState()
    expect(s.phase).toBe('failed')
    expect(s.fails).toBe(1)
    expect(s.targetsLeft).toBe(1)
    expect(['stalled', 'sourcesStopped']).toContain(s.failReason)
    expect(ev.filter((e) => e.type === 'fail')).toHaveLength(1)
  })

  it('bad target fails instantly with reason bad', () => {
    const c = ctl(BAD_LEVEL)
    c.act(DIG)
    c.run()
    finish(c)
    expect(c.getState().failReason).toBe('bad')
  })
})

describe('Retry keeps placements', () => {
  it('returns to setup synchronously (0 ticks) with setup kept, run actions turned into ghosts', () => {
    const c = ctl()
    c.act(DIG2)
    c.run()
    c.advance(4)
    c.act(DIG)
    finish(c)
    c.retry()
    const s = c.getState()
    expect(s.phase).toBe('setup')
    expect(s.tick).toBe(0)
    expect(s.setup).toEqual([{ tick: 0, ...DIG2 }])
    expect(s.run).toEqual([])
    expect(s.ghosts).toEqual([{ tick: 4, ...DIG }])
    expect(s.moves).toBe(1)
    expect(s.attempt).toBe(2)
    expect(s.result).toBeNull()
    expect(c.sim.hash()).toBe(freshHash(POT_LEVEL, [DIG2]))
  })

  it('retry mid-run restores the setup grid and allows undo again', () => {
    const c = ctl()
    c.act(DIG)
    c.run()
    c.advance(40)
    c.retry()
    expect(c.sim.hash()).toBe(freshHash(POT_LEVEL, [DIG]))
    expect(c.undo()).toBe(true)
    expect(c.getState().moves).toBe(0)
  })

  it('clearAll (long press) wipes placements and ghosts', () => {
    const c = ctl()
    c.act(DIG)
    c.run()
    c.advance(2)
    c.act(DIG2)
    c.clearAll()
    const s = c.getState()
    expect(s).toMatchObject({ phase: 'setup', moves: 0, setup: [], ghosts: [] })
    expect(c.sim.hash()).toBe(freshHash(POT_LEVEL))
  })

  it('retry drops pending scheduled actions', () => {
    const c = ctl(GATE_LEVEL)
    c.schedule([{ tick: 5, ...TRIG }])
    c.run()
    c.advance(2)
    c.retry()
    c.run()
    c.advance(10)
    expect(c.getState().run).toEqual([])
  })

  it('a retried attempt replays identically', () => {
    const c = ctl()
    c.act(DIG)
    c.run()
    finish(c)
    const a = c.getState().result
    c.retry()
    c.run()
    finish(c)
    expect(c.getState().result).toEqual(a)
  })
})

describe('Fixed-step accumulator and FF (§7.3)', () => {
  it('one 60 Hz frame = 1/2/4 ticks at 1x/2x/4x', () => {
    for (const sp of [1, 2, 4] as const) {
      const c = ctl()
      c.run()
      c.setSpeed(sp)
      expect(c.frame(TICK_MS)).toBe(sp)
      expect(c.frame(TICK_MS)).toBe(sp)
    }
  })

  it('accumulates sub-tick frames and clamps long gaps', () => {
    const c = ctl()
    c.run()
    expect(c.frame(TICK_MS / 2)).toBe(0)
    expect(c.frame(TICK_MS / 2)).toBe(1)
    expect(c.frame(50)).toBe(3)
    expect(c.frame(10_000)).toBe(Math.floor((MAX_FRAME_MS * 60) / 1000))
  })

  it('frames do nothing outside run', () => {
    const c = ctl()
    expect(c.frame(100)).toBe(0)
    expect(c.getState().tick).toBe(0)
  })

  it('over the 12 ms frame budget the sim slows down instead of skipping ticks', () => {
    let n = 0
    const c = ctl(POT_LEVEL, { now: () => (n++) * 5 })
    c.run()
    c.setSpeed(4)
    const ticks = c.frame(TICK_MS)
    expect(ticks).toBeGreaterThanOrEqual(1)
    expect(ticks).toBeLessThan(4)
    expect(c.getState().tick).toBe(ticks)
    expect(c.frame(0)).toBe(0)
  })

  it.each([[1, 4], [2, 4], [3, 2], [4, 2], [5, 1]])('auto cap: %i ms/tick → %ix', (ms, cap) => {
    let n = 0
    const c = ctl(POT_LEVEL, { now: () => (n++) * ms })
    c.act(DIG)
    c.run()
    c.setSpeed(4)
    expect(c.getState().capMeasured).toBe(false)
    c.advance(CAP_SAMPLE_TICKS)
    const s = c.getState()
    expect(s.capMeasured).toBe(true)
    expect(s.speedCap).toBe(cap)
    expect(s.speed).toBe(cap)
    expect(c.setSpeed(4)).toBe(cap)
  })

  it('the measured cap survives retry', () => {
    let n = 0
    const c = ctl(POT_LEVEL, { now: () => (n++) * 5 })
    c.act(DIG)
    c.run()
    c.advance(CAP_SAMPLE_TICKS)
    c.retry()
    expect(c.getState()).toMatchObject({ speedCap: 1, capMeasured: true })
  })
})

describe('subscribe / getState', () => {
  it('keeps a stable snapshot between changes and notifies on change', () => {
    const c = ctl()
    let calls = 0
    const off = c.subscribe(() => calls++)
    const a = c.getState()
    expect(c.getState()).toBe(a)
    c.act(DIG)
    expect(calls).toBe(1)
    expect(c.getState()).not.toBe(a)
    c.run()
    c.frame(TICK_MS * 3)
    expect(calls).toBe(3)
    off()
    c.frame(TICK_MS)
    expect(calls).toBe(3)
  })

  it('exposes targets and gem flags for the HUD', () => {
    const c = ctl()
    const s = c.getState()
    expect(s.targets).toEqual([{ id: 'pot', kind: 'fill', latched: false, progress: 0, need: 400, rect: { x: 60, y: 192, w: 24, h: 44 } }])
    expect(s.gems).toEqual([false])
    expect(s.par).toEqual({ moves: 1, secs: 6 })
  })

  it('legal mask follows the current grid', () => {
    const c = ctl()
    expect(c.legalMask('dig')[15 * 40 + 18]).toBe(1)
    c.act(DIG)
    expect(c.legalMask('dig')[15 * 40 + 18]).toBe(0)
  })
})

describe('M7: Retry starts the next attempt at 1x', () => {
  it('speed resets on retry and clear-all', () => {
    const c = new SpillController(GATE_LEVEL, { now: () => 0 })
    c.run()
    c.setSpeed(4)
    expect(c.getState().speed).toBe(4)
    c.retry()
    expect(c.getState().speed).toBe(1)
    c.run()
    c.setSpeed(2)
    c.clearAll()
    expect(c.getState().speed).toBe(1)
  })
})

