import { describe, expect, it } from 'vitest'
import { parseLevel } from '../level/parse'
import { levelHash } from '../level/hash'
import { devActions, simulate } from '../play/attempt'
import { parTicks } from '../play/score'
import { WAIT_WINDOW } from '../play/failure'
import { LEVELS } from '.'
import { W1 } from './w1'

const W1_MATS = new Set(['empty', 'wall', 'dirt', 'sand', 'water', 'gate', 'spout'])

describe('W1 Flow levels', () => {
  it('has the eight §5 levels in order, then the 1-9 and 1-10 bonus levels', () => {
    expect(W1.map((l) => `${l.id} ${l.name}`)).toEqual([
      '1-1 First Drop', '1-2 Detour', '1-3 Two Pots', '1-4 Hourglass', '1-5 Gatekeeper', '1-6 Displacement', '1-7 Two Taps', '1-8 Cascade', '1-9 Overflow', '1-10 Twin Cups',
    ])
    expect(LEVELS.slice(0, 10)).toEqual(W1)
    expect(LEVELS.slice(10).map((l) => `${l.id} ${l.name}`)).toEqual(['2-1 Wooden Door', '2-2 Fuse', '2-3 Plank Bridge'])
  })

  it('ids, salts and hashes are unique', () => {
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length)
    expect(new Set(LEVELS.map((l) => l.salt)).size).toBe(LEVELS.length)
    expect(new Set(LEVELS.map((l) => levelHash(l))).size).toBe(LEVELS.length)
  })

  for (const l of W1) {
    describe(`${l.id} ${l.name}`, () => {
      it('uses only W1 materials and verbs, and has hint, par and a dev solution', () => {
        const p = parseLevel(l)
        for (const spec of Object.values(l.legend)) expect(W1_MATS.has(spec.split(':')[0])).toBe(true)
        for (const s of Object.values(l.spouts ?? {})) expect(['water', 'sand']).toContain(s.mat)
        expect(l.world).toBe(1)
        expect(l.verbs?.drop ?? null).toBeNull()
        expect(l.verbs?.line ?? null).toBeNull()
        expect(l.hint).toBeTruthy()
        expect(l.par).toBeTruthy()
        expect(l.dev?.length).toBe(l.par!.moves)
        expect(Number.isInteger(l.par!.secs * 10)).toBe(true)
        expect(p.targets.some((t) => t.kind !== 'bad')).toBe(true)
        for (const a of l.dev!) expect(['dig', 'trigger']).toContain(a[1])
      })

      it('dev solution clears within 12 s and within par', () => {
        const r = simulate(l, devActions(l))
        expect(r.outcome).toBe('cleared')
        expect(r.ticks).toBeLessThanOrEqual(720)
        expect(r.moves).toBeLessThanOrEqual(l.par!.moves)
        expect(r.ticks).toBeLessThanOrEqual(parTicks(l.par!.secs))
      })

      it('doing nothing fails', () => {
        expect(simulate(l, []).outcome).toBe('failed')
      })
    })
  }

  describe('gate levels wait for the first tap (C1)', () => {
    const tr = (tick: number, arg: string) => ({ tick, verb: 'trigger' as const, tx: 0, ty: 0, tx2: 0, ty2: 0, arg })
    const byId = (id: string) => W1.find((l) => l.id === id)!
    it('1-7 clears when the player takes 3 s to find the first gate', () => {
      expect(simulate(byId('1-7'), [tr(180, 'g1'), tr(220, 'g2')]).outcome).toBe('cleared')
    })
    it('1-8 clears with slow taps after the setup digs', () => {
      const digs = devActions(byId('1-8')).filter((a) => a.verb === 'dig')
      expect(simulate(byId('1-8'), [...digs, tr(120, 'g2'), tr(160, 'g1')]).outcome).toBe('cleared')
    })
    it('doing nothing on a gate-only start still fails, after WAIT_WINDOW', () => {
      const r = simulate(byId('1-7'), [])
      expect(r.reason).toBe('stalled')
      expect(r.ticks).toBe(WAIT_WINDOW)
    })
  })

  describe('2-1 Wooden Door (spark reach)', () => {
    const w2 = LEVELS.find((l) => l.id === '2-1')!
    const spark = (tx: number, ty: number) => [{ tick: 0, verb: 'drop' as const, tx, ty, tx2: tx, ty2: ty, arg: 'spark' }]
    it('dev solution clears within par; doing nothing stalls, and the fire counts as progress', () => {
      const r = simulate(w2, devActions(w2))
      expect(r.outcome).toBe('cleared')
      expect(r.ticks).toBeLessThanOrEqual(parTicks(w2.par!.secs))
      expect(simulate(w2, []).reason).toBe('stalled')
    })
    it('a spark just under the plug clears; one seven tiles below fizzles', () => {
      expect(simulate(w2, spark(9, 15)).outcome).toBe('cleared')
      expect(simulate(w2, spark(9, 21)).outcome).toBe('failed')
    })
  })
  describe('2-2 Fuse (fire travels along a fuse)', () => {
    const l = LEVELS.find((x) => x.id === '2-2')!
    const spark = (tx: number, ty: number) => ({ tick: 0, verb: 'drop' as const, tx, ty, tx2: tx, ty2: ty, arg: 'spark' })
    const fuse = (tx: number, ty: number, tx2: number, ty2: number) => ({ tick: 0, verb: 'line' as const, tx, ty, tx2, ty2, arg: 'fuse' })
    it('dev solution clears within par; doing nothing stalls', () => {
      const r = simulate(l, devActions(l))
      expect(r.outcome).toBe('cleared')
      expect(r.ticks).toBeLessThanOrEqual(parTicks(l.par!.secs))
      expect(simulate(l, []).reason).toBe('stalled')
    })
    it('a spark alone opens only one door; a fuse that reaches one door is not enough', () => {
      expect(simulate(l, [spark(13, 14)]).outcome).toBe('failed')
      expect(simulate(l, [fuse(14, 14, 20, 14), spark(19, 15)]).outcome).toBe('failed')
      expect(simulate(l, [fuse(14, 14, 25, 14)]).outcome).toBe('failed')
    })
    it('a fuse spanning both doors clears from any corridor row', () => {
      expect(simulate(l, [fuse(14, 15, 25, 15), spark(19, 16)]).outcome).toBe('cleared')
      expect(simulate(l, [fuse(14, 16, 25, 16), spark(19, 15)]).outcome).toBe('cleared')
    })
  })
  describe('2-3 Plank Bridge (a plank is solid ground)', () => {
    const l = LEVELS.find((x) => x.id === '2-3')!
    const plank = (tx: number, ty: number, tx2: number, ty2: number) => ({ tick: 0, verb: 'line' as const, tx, ty, tx2, ty2, arg: 'plank' })
    it('dev solution clears within par; doing nothing stalls', () => {
      const r = simulate(l, devActions(l))
      expect(r.outcome).toBe('cleared')
      expect(r.ticks).toBeLessThanOrEqual(parTicks(l.par!.secs))
      expect(simulate(l, []).reason).toBe('stalled')
    })
    it('a slope or a bridge too deep in the pit fails; a gap at the ledge leaks and misses par', () => {
      expect(simulate(l, [plank(17, 18, 24, 25)]).outcome).toBe('failed')
      expect(simulate(l, [plank(17, 25, 24, 18)]).outcome).toBe('failed')
      expect(simulate(l, [plank(17, 36, 24, 36)]).outcome).toBe('failed')
      const gap = simulate(l, [plank(18, 20, 24, 20)])
      expect(gap.ticks).toBeGreaterThan(parTicks(l.par!.secs))
    })
    it('a level wall-to-wall bridge clears from several rows, slower when deeper', () => {
      const hi = simulate(l, [plank(17, 20, 24, 20)])
      const lo = simulate(l, [plank(17, 26, 24, 26)])
      expect(hi.outcome).toBe('cleared')
      expect(lo.outcome).toBe('cleared')
      expect(lo.ticks).toBeGreaterThan(hi.ticks)
    })
  })
})
