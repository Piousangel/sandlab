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
  it('has the eight §5 levels in order, then the 1-9 bonus', () => {
    expect(W1.map((l) => `${l.id} ${l.name}`)).toEqual([
      '1-1 First Drop', '1-2 Detour', '1-3 Two Pots', '1-4 Hourglass', '1-5 Gatekeeper', '1-6 Displacement', '1-7 Two Taps', '1-8 Cascade', '1-9 Overflow',
    ])
    expect(LEVELS.slice(0, 9)).toEqual(W1)
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
})
