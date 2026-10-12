import { describe, it, expect } from 'vitest'
import { fromReplay, parseReplay, replayResult, serializeReplay, toReplay, MAX_REPLAY_ACTIONS, VERB_CODES } from './replay'
import { SpillController, TICK_MS } from './controller'
import { devActions, simulate } from './attempt'
import { parseLevel } from '../level/parse'
import { levelHash } from '../level/hash'
import { GATE_LEVEL, POT_LEVEL } from './fixtures'

const DIG = { verb: 'dig' as const, tx: 18, ty: 15, tx2: 18, ty2: 17 }

describe('replay JSON (§7.5)', () => {
  it('encodes [tick, verbCode, tx, ty, tx2, ty2] with gate index for triggers', () => {
    expect(VERB_CODES).toEqual({ dig: 0, drop: 1, line: 2, trigger: 3 })
    const lvl = parseLevel(GATE_LEVEL)
    const r = toReplay(lvl, [{ tick: 0, ...DIG }, { tick: 30, verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' }])
    expect(r).toEqual({ v: 1, id: 't-gate', lh: levelHash(GATE_LEVEL), a: [[0, 0, 18, 15, 18, 17], [30, 3, lvl.gates.indexOf('g1'), 0, 0, 0]] })
    expect(serializeReplay(r).length).toBeLessThan(150)
  })

  it('round-trips through JSON text to the same actions', () => {
    const lvl = parseLevel(GATE_LEVEL)
    const acts = [{ tick: 0, ...DIG }, { tick: 30, verb: 'trigger' as const, tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' }]
    const back = fromReplay(lvl, parseReplay(serializeReplay(toReplay(lvl, acts))))
    expect(back).toEqual(acts)
  })

  it('rejects malformed or foreign replays', () => {
    const lvl = parseLevel(POT_LEVEL)
    const ok = toReplay(lvl, [{ tick: 0, ...DIG }])
    expect(() => parseReplay('not json')).toThrow()
    expect(() => parseReplay({ ...ok, v: 2 })).toThrow(/version/)
    expect(() => parseReplay({ ...ok, a: [[0, 0, 1.5, 0, 0, 0]] })).toThrow(/action 0/)
    expect(() => parseReplay({ ...ok, a: [[0, 9, 1, 1, 1, 1]] })).toThrow(/action 0/)
    expect(() => parseReplay({ ...ok, a: [[0, 0, 1, 1, 1]] })).toThrow(/action 0/)
    expect(() => parseReplay({ ...ok, a: Array.from({ length: MAX_REPLAY_ACTIONS + 1 }, () => [0, 0, 1, 1, 1, 1]) })).toThrow(/too many/)
    expect(() => parseReplay({ ...ok, lh: 'zz' })).toThrow(/lh/)
    expect(() => fromReplay(lvl, { ...ok, lh: '00000000' })).toThrow(/lh/)
    expect(() => fromReplay(lvl, { ...ok, id: 'other' })).toThrow(/id/)
    expect(() => fromReplay(parseLevel(GATE_LEVEL), { ...toReplay(parseLevel(GATE_LEVEL), []), a: [[3, 3, 7, 0, 0, 0]] })).toThrow(/gate/)
  })
})

describe('deterministic re-sim', () => {
  it('controller play (frames, FF, pause, trigger while paused) re-simulates to the same result hash', () => {
    const c = new SpillController(GATE_LEVEL, { now: () => 0 })
    c.act({ verb: 'dig', tx: 3, ty: 15, tx2: 3, ty2: 17 })
    c.run()
    c.setSpeed(4)
    c.frame(TICK_MS * 1.5)
    c.frame(7)
    c.setSpeed(2)
    c.frame(TICK_MS * 3)
    c.pause()
    c.act({ verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' })
    c.resume()
    c.setSpeed(4)
    const dts = [16, 17, 33, 5, 16.7, 50]
    for (let k = 0; c.phase === 'run' && k < 2000; k++) c.frame(dts[k % dts.length])
    const s = c.getState()
    expect(s.phase).toBe('cleared')
    const text = serializeReplay(c.replay())
    const r = replayResult(GATE_LEVEL, parseReplay(text))
    expect(r).toEqual(s.result)
    expect(r.moves).toBe(2)
  })

  it('a failed attempt also re-simulates to the same failure tick and hash', () => {
    const c = new SpillController(POT_LEVEL, { now: () => 0 })
    c.run()
    c.advance(10)
    c.act({ verb: 'dig', tx: 3, ty: 15, tx2: 3, ty2: 17 })
    while (c.phase === 'run') c.advance(50)
    expect(c.phase).toBe('failed')
    expect(replayResult(POT_LEVEL, c.replay())).toEqual(c.getState().result)
  })

  it('dev solution via replay equals direct simulate', () => {
    const lvl = parseLevel(POT_LEVEL)
    const r = toReplay(lvl, devActions(lvl))
    expect(replayResult(lvl, r)).toEqual(simulate(lvl, devActions(lvl)))
  })
})
