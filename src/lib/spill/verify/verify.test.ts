import { beforeAll, describe, expect, it } from 'vitest'
import { parseLevel } from '../level/parse'
import { parSecsFromBest } from '../play/score'
import { devActions } from '../play/attempt'
import { PLUG_GATE_LEVEL, PLUG_LEVEL } from './fixtures'
import { evaluate } from './evaluate'
import { digCandidates, triggerCandidates, shiftAction } from './candidates'
import { comboCount, combos, sampleCombos } from './space'
import { verifyLevel, localRunner, saltsFor, CHECK_IDS, type CheckId } from './verify'

const plug = parseLevel(PLUG_LEVEL)
const plugGate = parseLevel(PLUG_GATE_LEVEL)
const byId = (r: Awaited<ReturnType<typeof verifyLevel>>, id: CheckId) => r.checks.find((c) => c.id === id)!

describe('evaluate', () => {
  it('runs the dev solution to a clear without throwing', () => {
    const o = evaluate(plug, devActions(plug))
    expect(o.legal).toBe(true)
    expect(o.cleared).toBe(true)
    expect(o.moves).toBe(1)
    expect(o.gemTotal).toBe(1)
  })

  it('reports an illegal action instead of throwing', () => {
    const o = evaluate(plug, [{ tick: 0, verb: 'dig', tx: 2, ty: 30, tx2: 2, ty2: 31 }])
    expect(o.legal).toBe(false)
    expect(o.cleared).toBe(false)
  })

  it('an action scheduled after the attempt ended is not a clear', () => {
    const o = evaluate(plug, [{ tick: 5000, verb: 'dig', tx: 19, ty: 14, tx2: 19, ty2: 15 }])
    expect(o.cleared).toBe(false)
    expect(o.legal).toBe(false)
  })

  it('doing nothing fails', () => {
    expect(evaluate(plug, []).cleared).toBe(false)
  })

  it('a different salt can be passed', () => {
    const a = evaluate(plug, devActions(plug), 1)
    const b = evaluate(plug, devActions(plug), 2)
    expect(a.cleared && b.cleared).toBe(true)
    expect(a.hash).not.toBe(b.hash)
  })
})

describe('candidates', () => {
  it('dig candidates are legal, at tick 0, and distinct by the dirt tiles they remove', () => {
    const cs = digCandidates(plug)
    expect(cs.length).toBeGreaterThan(8)
    expect(cs.length).toBeLessThan(60)
    const keys = new Set(cs.map((c) => c.key))
    expect(keys.size).toBe(cs.length)
    for (const c of cs) {
      expect(c.action.tick).toBe(0)
      expect(evaluate(plug, [c.action]).legal).toBe(true)
    }
  })

  it('dig candidates respect maxLen', () => {
    for (const c of digCandidates(plug)) {
      const a = c.action
      expect(Math.max(Math.abs(a.tx2 - a.tx), Math.abs(a.ty2 - a.ty)) + 1).toBeLessThanOrEqual(2)
    }
  })

  it('trigger candidates step through time for each allowed gate', () => {
    const ts = triggerCandidates(plugGate, 6, 60)
    expect(ts.map((t) => t.action.tick)).toEqual([0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60])
    expect(new Set(ts.map((t) => t.action.arg))).toEqual(new Set(['g1']))
    expect(new Set(ts.map((t) => t.group)).size).toBe(1)
    expect(triggerCandidates(plug, 6, 60)).toEqual([])
  })

  it('shiftAction moves both ends of a line by one tile', () => {
    expect(shiftAction({ tick: 0, verb: 'dig', tx: 3, ty: 4, tx2: 3, ty2: 6 }, 1, -1)).toEqual({ tick: 0, verb: 'dig', tx: 4, ty: 3, tx2: 4, ty2: 5 })
  })
})

describe('space', () => {
  const items = ['a', 'b', 'c', 'd'].map((k, i) => ({ key: k, group: i < 2 ? 'g' : k }))

  it('counts and enumerates k-combinations, never two from one exclusive group', () => {
    expect(comboCount(items, 0)).toBe(1)
    expect(comboCount(items, 1)).toBe(4)
    expect(comboCount(items, 2)).toBe(5)
    const all = [...combos(items, 2)].map((c) => c.map((x) => x.key).join(''))
    expect(all.sort()).toEqual(['ac', 'ad', 'bc', 'bd', 'cd'])
  })

  it('samples are deterministic, distinct, valid and capped', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ key: String(i), group: String(i) }))
    const s1 = sampleCombos(many, 3, 50, 7).map((c) => c.map((x) => x.key).join(','))
    const s2 = sampleCombos(many, 3, 50, 7).map((c) => c.map((x) => x.key).join(','))
    expect(s1).toEqual(s2)
    expect(s1.length).toBe(50)
    expect(new Set(s1).size).toBe(50)
    for (const c of s1) expect(new Set(c.split(',')).size).toBe(3)
  })
})

describe('saltsFor', () => {
  it('gives 16 distinct salts that differ from the level salt', () => {
    const s = saltsFor(0x7e51)
    expect(s).toHaveLength(16)
    expect(new Set(s).size).toBe(16)
    expect(s).not.toContain(0x7e51)
  })
})

const FAST = { solverLimit: 120, windowRange: 25 }
const fast = (def: typeof PLUG_LEVEL) => verifyLevel(def, localRunner(), FAST)

describe('verifyLevel', () => {
  let plugReport: Awaited<ReturnType<typeof verifyLevel>>
  beforeAll(async () => { plugReport = await fast(PLUG_LEVEL) })

  it('reports every check id once', () => {
    const r = plugReport
    expect(r.checks.map((c) => c.id).sort()).toEqual([...CHECK_IDS].sort())
  })

  it('flags a par time that does not follow the 1.15x rule and suggests the right one', () => {
    const r = plugReport
    expect(byId(r, 'dev-clears').pass).toBe(true)
    expect(byId(r, 'dev-12s').pass).toBe(true)
    expect(byId(r, 'idle-fails').pass).toBe(true)
    const par = byId(r, 'par')
    expect(par.pass).toBe(false)
    expect(r.bestTicks).toBeGreaterThan(0)
    expect(r.suggestedParSecs).toBe(parSecsFromBest(r.bestTicks!))
    expect(par.detail).toContain(String(r.suggestedParSecs))
    expect(r.pass).toBe(false)
  })

  it('passes par when par.secs matches the best known solution', async () => {
    const fixed = { ...PLUG_LEVEL, par: { moves: 1, secs: plugReport.suggestedParSecs! } }
    const r = await fast(fixed)
    expect(byId(r, 'par').pass).toBe(true)
    expect(byId(r, 'solver').pass).toBe(true)
    expect(byId(r, 'solver').detail).toMatch(/exhaustive/)
  })

  it('the solver catches a par that is higher than the true minimum', async () => {
    const r = await fast({ ...PLUG_LEVEL, par: { moves: 2, secs: 9.9 } })
    const s = byId(r, 'solver')
    expect(s.pass).toBe(false)
    expect(s.detail).toMatch(/1 move/)
  })

  it('a 1-move level needs a slower 1-move clear than par (Par-1 rule)', () => {
    const r = plugReport
    const p1 = byId(r, 'par1-slow')
    expect(typeof p1.pass).toBe('boolean')
    expect(p1.detail).toMatch(/1-move clears/)
  })

  it('trigger jitter and the timing window are measured around each dev trigger', async () => {
    const r = await fast(PLUG_GATE_LEVEL)
    const j = byId(r, 'trigger-jitter')
    const w = byId(r, 'timing-window')
    expect(j.detail).toMatch(/g1/)
    expect(w.detail).toMatch(/g1/)
    expect(j.pass).toBe(true)
    expect(w.pass).toBe(true)
  })

  it('levels without triggers pass the trigger checks trivially', () => {
    const r = plugReport
    expect(byId(r, 'trigger-jitter').pass).toBe(true)
    expect(byId(r, 'trigger-jitter').detail).toMatch(/no trigger/)
    expect(byId(r, 'timing-window').pass).toBe(true)
  })

  it('a dev solution that does not clear fails and skips dependent checks', async () => {
    const r = await fast({ ...PLUG_LEVEL, dev: [] })
    expect(byId(r, 'dev-clears').pass).toBe(false)
    expect(byId(r, 'salts-16').pass).toBe(false)
    expect(r.pass).toBe(false)
  })

  it('reports progress through the runner', async () => {
    const seen: number[] = []
    await verifyLevel({ ...PLUG_LEVEL, dev: [] }, localRunner({ onProgress: (done) => seen.push(done) }), FAST)
    expect(seen.length).toBeGreaterThan(0)
  })
})
