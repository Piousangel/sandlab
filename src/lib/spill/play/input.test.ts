import { describe, it, expect } from 'vitest'
import {
  checkAction, dropAnchor, gateBoxes, hitGate, legalMask, pointerToTile, snapLine, stampSize, DROP_GHOST_PX, HIT_PX,
} from './input'
import { parseLevel } from '../level/parse'
import { defineLevel } from '../level/define'
import { Sim } from '../sim/sim'
import { tilePath } from '../sim/actions'
import { TH, TW, W } from '../sim/grid'
import { M } from '../sim/materials'
import { GATE_LEVEL, POT_LEVEL } from './fixtures'

const DIRS: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

describe('snapLine (§3.3 8-direction tile snap)', () => {
  it('maps every angle to the nearest of 8 directions', () => {
    for (let deg = 0; deg < 360; deg += 5) {
      if (deg % 45 === 22.5) continue
      const rad = (deg * Math.PI) / 180
      const s = snapLine(20.5, 30.5, 20.5 + Math.cos(rad) * 6, 30.5 + Math.sin(rad) * 6, 99)
      const [ex, ey] = DIRS[Math.round(deg / 45) % 8]
      expect([Math.sign(s.tx2 - s.tx), Math.sign(s.ty2 - s.ty)], `deg ${deg}`).toEqual([ex, ey])
    }
  })

  it('snapped end lies exactly on the ray so tilePath does not re-snap', () => {
    const s = snapLine(10.2, 10.9, 14.9, 17.1, 99)
    const dx = s.tx2 - s.tx
    const dy = s.ty2 - s.ty
    expect(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)).toBe(true)
    const p = tilePath(s.tx, s.ty, s.tx2, s.ty2)
    expect(p[0]).toEqual([s.tx, s.ty])
    expect(p[p.length - 1]).toEqual([s.tx2, s.ty2])
  })

  it('clamps the tile count to maxLen and to the grid', () => {
    const s = snapLine(5.5, 5.5, 5.5, 50.5, 4)
    expect(s).toEqual({ tx: 5, ty: 5, tx2: 5, ty2: 8 })
    const d = snapLine(2.5, 2.5, -10, -10, 99)
    expect(d).toEqual({ tx: 2, ty: 2, tx2: 0, ty2: 0 })
    const r = snapLine(TW - 2 + 0.5, 1.5, TW + 30, 1.5, 99)
    expect(r.tx2).toBe(TW - 1)
  })

  it('a tap without drag is a single tile', () => {
    expect(snapLine(7.4, 9.6, 7.6, 9.4, 5)).toEqual({ tx: 7, ty: 9, tx2: 7, ty2: 9 })
  })
})

describe('pointer mapping, drop ghost, trigger hit test', () => {
  const rect = { left: 10, top: 20, width: 320, height: 480 }

  it('maps CSS pixels to fractional tiles', () => {
    const p = pointerToTile(10 + 8 * 3.5, 20 + 8 * 7.25, rect)
    expect(p.fx).toBeCloseTo(3.5)
    expect(p.fy).toBeCloseTo(7.25)
  })

  it('drop ghost sits 24 CSS px above the finger and centres the stamp', () => {
    expect(DROP_GHOST_PX).toBe(24)
    expect(stampSize('spark')).toBe(1)
    expect(stampSize('ice')).toBe(2)
    const finger = { x: 10 + 8 * 12.5, y: 20 + 8 * 20.5 + 24 }
    expect(dropAnchor(finger.x, finger.y, rect, 1)).toEqual({ tx: 12, ty: 20 })
    expect(dropAnchor(finger.x, finger.y, rect, 2)).toEqual({ tx: 12, ty: 20 })
    expect(dropAnchor(10 + 8 * 12.2, 20 + 8 * 20.2 + 24, rect, 2)).toEqual({ tx: 11, ty: 19 })
    expect(dropAnchor(0, 0, rect, 2)).toEqual({ tx: 0, ty: 0 })
    expect(dropAnchor(9999, 9999, rect, 2)).toEqual({ tx: TW - 2, ty: TH - 2 })
  })

  it('finds gate boxes and hits them with at least a 44 px box', () => {
    const lvl = parseLevel(GATE_LEVEL)
    const boxes = gateBoxes(lvl)
    expect(boxes.map((b) => b.name)).toEqual(['g2', 'g1'].sort((a, b) => lvl.gates.indexOf(a) - lvl.gates.indexOf(b)))
    const g1 = boxes.find((b) => b.name === 'g1')!
    expect(g1).toMatchObject({ x: 68, y: 62, w: 8, h: 8 })
    const css = rect.width / W
    const cx = rect.left + (g1.x + g1.w / 2) * css
    const cy = rect.top + (g1.y + g1.h / 2) * css
    expect(HIT_PX).toBe(44)
    expect(hitGate(cx, cy, rect, boxes)).toBe('g1')
    expect(hitGate(cx + 21, cy - 21, rect, boxes)).toBe('g1')
    expect(hitGate(cx + 23, cy, rect, boxes)).toBeNull()
    expect(hitGate(cx, cy, rect, boxes, ['g1'])).toBeNull()
  })
})

describe('legalMask (§7.5 legalTiles auto)', () => {
  it('dig: tiles holding any dirt; drop/line: fully empty tiles', () => {
    const sim = new Sim()
    sim.load(POT_LEVEL)
    const dig = legalMask(sim.grid, 'dig')
    expect(dig[15 * TW + 18]).toBe(1)
    expect(dig[17 * TW + 18]).toBe(1)
    expect(dig[18 * TW + 18]).toBe(0)
    expect(dig[5 * TW + 18]).toBe(0)
    const drop = legalMask(sim.grid, 'drop')
    expect(drop[40 * TW + 20]).toBe(1)
    expect(drop[5 * TW + 18]).toBe(0)
    expect(drop[0]).toBe(0)
    sim.grid.mat[40 * 4 * W + 20 * 4] = M.sand
    expect(legalMask(sim.grid, 'line')[40 * TW + 20]).toBe(0)
  })
})

describe('checkAction (legality, maxLen, charges, gates)', () => {
  const pot = parseLevel(POT_LEVEL)
  const fresh = () => { const s = new Sim(); s.load(pot); return s.grid }
  const none = { drops: 0, lines: 0, triggered: [] as string[] }

  it('accepts the dev dig and counts dug tiles', () => {
    const r = checkAction(pot, fresh(), { verb: 'dig', tx: 18, ty: 15, tx2: 18, ty2: 17 }, none)
    expect(r).toEqual({ ok: true, action: { verb: 'dig', tx: 18, ty: 15, tx2: 18, ty2: 17 }, dug: 3 })
  })

  it('rejects digs that touch no dirt, are too long, or are not 8-direction', () => {
    const g = fresh()
    expect(checkAction(pot, g, { verb: 'dig', tx: 18, ty: 40, tx2: 18, ty2: 42 }, none)).toEqual({ ok: false, reason: 'illegal' })
    expect(checkAction(pot, g, { verb: 'dig', tx: 18, ty: 10, tx2: 18, ty2: 16 }, none)).toEqual({ ok: false, reason: 'maxLen' })
    expect(checkAction(pot, g, { verb: 'dig', tx: 18, ty: 10, tx2: 18, ty2: 15 }, none).ok).toBe(true)
    expect(checkAction(pot, g, { verb: 'dig', tx: 18, ty: 15, tx2: 19, ty2: 17 }, none)).toEqual({ ok: false, reason: 'shape' })
    expect(checkAction(pot, g, { verb: 'dig', tx: 18, ty: 15, tx2: 18, ty2: TH + 2 }, none)).toEqual({ ok: false, reason: 'bounds' })
  })

  it('rejects verbs the level does not allow', () => {
    const g = fresh()
    expect(checkAction(pot, g, { verb: 'drop', tx: 20, ty: 40, tx2: 20, ty2: 40 }, none)).toEqual({ ok: false, reason: 'verb' })
    expect(checkAction(pot, g, { verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' }, none)).toEqual({ ok: false, reason: 'verb' })
  })

  it('drop: empty tiles only, level kind fills arg, charges enforced', () => {
    const lvl = parseLevel(defineLevel({ ...POT_LEVEL, verbs: { drop: { kind: 'ice', charges: 1 }, line: { mat: 'plank', maxLen: 3, charges: 1 } } }))
    const g = fresh()
    expect(checkAction(lvl, g, { verb: 'drop', tx: 20, ty: 40, tx2: 0, ty2: 0 }, none))
      .toEqual({ ok: true, action: { verb: 'drop', tx: 20, ty: 40, tx2: 20, ty2: 40, arg: 'ice' }, dug: 0 })
    expect(checkAction(lvl, g, { verb: 'drop', tx: 20, ty: 40, tx2: 0, ty2: 0, arg: 'spark' }, none)).toEqual({ ok: false, reason: 'verb' })
    expect(checkAction(lvl, g, { verb: 'drop', tx: 20, ty: 40, tx2: 0, ty2: 0 }, { ...none, drops: 1 })).toEqual({ ok: false, reason: 'charges' })
    expect(checkAction(lvl, g, { verb: 'drop', tx: 18, ty: 15, tx2: 0, ty2: 0 }, none)).toEqual({ ok: false, reason: 'illegal' })
    expect(checkAction(lvl, g, { verb: 'drop', tx: TW - 1, ty: 40, tx2: 0, ty2: 0 }, none)).toEqual({ ok: false, reason: 'bounds' })
    expect(checkAction(lvl, g, { verb: 'line', tx: 20, ty: 40, tx2: 22, ty2: 42 }, none).ok).toBe(true)
    expect(checkAction(lvl, g, { verb: 'line', tx: 20, ty: 40, tx2: 22, ty2: 42 }, { ...none, lines: 1 })).toEqual({ ok: false, reason: 'charges' })
    expect(checkAction(lvl, g, { verb: 'line', tx: 18, ty: 14, tx2: 18, ty2: 16 }, none)).toEqual({ ok: false, reason: 'illegal' })
  })

  it('trigger: allowed gate, once only', () => {
    const gate = parseLevel(GATE_LEVEL)
    const s = new Sim()
    s.load(gate)
    const t = { verb: 'trigger' as const, tx: 5, ty: 5, tx2: 5, ty2: 5, arg: 'g1' }
    expect(checkAction(gate, s.grid, t, none)).toEqual({ ok: true, action: { verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' }, dug: 0 })
    expect(checkAction(gate, s.grid, t, { ...none, triggered: ['g1'] })).toEqual({ ok: false, reason: 'gate' })
    expect(checkAction(gate, s.grid, { ...t, arg: 'zz' }, none)).toEqual({ ok: false, reason: 'gate' })
  })
})
