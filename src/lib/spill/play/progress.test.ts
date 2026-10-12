import { describe, it, expect } from 'vitest'
import { KEY_PREFIX, isNewBest, loadRecord, recordResult, totalStars, type StorageLike } from './progress'
import type { RunResult } from './attempt'

class Mem implements StorageLike {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

const throwing: StorageLike = {
  getItem() { throw new Error('SecurityError') },
  setItem() { throw new Error('QuotaExceeded') },
  removeItem() { throw new Error('nope') },
}

const r = (o: Partial<RunResult> = {}): RunResult => ({
  id: '1-1', lh: 'abcdef01', outcome: 'cleared', reason: null, ticks: 300, moves: 1, dug: 3,
  gems: 1, gemTotal: 1, gemMask: [true], latched: ['a'], targetsLeft: 0, hash: '00000000', ...o,
})

describe('progress (§4.4 per-level keys)', () => {
  it('stores under spill.v1.lvl.<id>', () => {
    const s = new Mem()
    recordResult('1-1', r(), 7, s)
    expect(KEY_PREFIX).toBe('spill.v1.lvl.')
    expect([...s.m.keys()]).toEqual(['spill.v1.lvl.1-1'])
    expect(loadRecord('1-1', s)).toEqual({ v: 1, stars: 7, best: { moves: 1, ticks: 300, dug: 3 }, clears: 1 })
  })

  it('first clear is a new best; worse runs keep the best but union the stars', () => {
    const s = new Mem()
    const a = recordResult('1-1', r({ moves: 2, ticks: 500 }), 1, s)
    expect(a).toMatchObject({ newBest: true, firstClear: true, saved: true })
    const b = recordResult('1-1', r({ moves: 2, ticks: 600 }), 2, s)
    expect(b).toMatchObject({ newBest: false, firstClear: false })
    expect(b.record).toEqual({ v: 1, stars: 3, best: { moves: 2, ticks: 500, dug: 3 }, clears: 2 })
    const c = recordResult('1-1', r({ moves: 1, ticks: 900 }), 5, s)
    expect(c.newBest).toBe(true)
    expect(c.record.best).toEqual({ moves: 1, ticks: 900, dug: 3 })
    expect(c.record.stars).toBe(7)
  })

  it('isNewBest compares moves, then ticks, then dug', () => {
    const rec = { v: 1 as const, stars: 1, best: { moves: 2, ticks: 300, dug: 2 }, clears: 1 }
    expect(isNewBest(null, r())).toBe(true)
    expect(isNewBest(rec, { moves: 2, ticks: 300, dug: 2 })).toBe(false)
    expect(isNewBest(rec, { moves: 2, ticks: 300, dug: 1 })).toBe(true)
    expect(isNewBest(rec, { moves: 3, ticks: 1, dug: 0 })).toBe(false)
    expect(isNewBest(rec, { moves: 1, ticks: 999, dug: 9 })).toBe(true)
  })

  it('failed runs are not recorded', () => {
    const s = new Mem()
    const x = recordResult('1-1', r({ outcome: 'failed', reason: 'stalled' }), 0, s)
    expect(x).toMatchObject({ newBest: false, saved: false })
    expect(s.m.size).toBe(0)
  })

  it('a corrupt entry is isolated: other levels survive and the bad one is replaced on the next clear', () => {
    const s = new Mem()
    recordResult('1-2', r({ id: '1-2' }), 7, s)
    for (const junk of ['{not json', '{"v":1,"stars":"x"}', '[]', 'null', '{"v":1,"stars":9,"best":null,"clears":0}', '{"v":1,"stars":1,"best":{"moves":-1,"ticks":1,"dug":0},"clears":1}']) {
      s.setItem('spill.v1.lvl.1-1', junk)
      expect(loadRecord('1-1', s)).toBeNull()
      expect(loadRecord('1-2', s)?.stars).toBe(7)
      expect(totalStars(['1-1', '1-2'], s)).toBe(3)
    }
    const x = recordResult('1-1', r(), 3, s)
    expect(x).toMatchObject({ firstClear: true, newBest: true, saved: true })
    expect(loadRecord('1-1', s)?.stars).toBe(3)
  })

  it('throwing or missing storage never throws to the caller', () => {
    expect(loadRecord('1-1', throwing)).toBeNull()
    expect(recordResult('1-1', r(), 7, throwing)).toMatchObject({ saved: false, newBest: true })
    expect(totalStars(['1-1'], throwing)).toBe(0)
    expect(loadRecord('1-1', null)).toBeNull()
    expect(recordResult('1-1', r(), 7, null).saved).toBe(false)
  })

  it('default storage path works without window (Node)', () => {
    expect(loadRecord('nope')).toBeNull()
  })
})
