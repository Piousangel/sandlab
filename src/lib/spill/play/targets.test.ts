import { describe, it, expect } from 'vitest'
import { Judge } from './targets'
import { parseLevel } from '../level/parse'
import { createGrid, W, type Grid } from '../sim/grid'
import { M } from '../sim/materials'
import { defineLevel, type LevelDef, type TargetDef } from '../level/define'
import { POT_LEVEL } from './fixtures'

function lvl(targets: TargetDef[], gems: LevelDef['gems'] = []) {
  return parseLevel(defineLevel({ ...POT_LEVEL, targets, gems }))
}

function fill(g: Grid, x: number, y: number, w: number, h: number, m: number) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g.mat[yy * W + xx] = m
}

describe('Judge (§4.2 latch targets, §4.3 gems)', () => {
  it('fill latches at need and stays latched after the material leaves', () => {
    const j = new Judge(lvl([{ id: 'a', kind: 'fill', rect: [0, 0, 2, 2], mat: 'water', need: 10 }]))
    const g = createGrid()
    j.init(g)
    fill(g, 0, 0, 3, 3, M.water)
    let u = j.update(g)
    expect(u.latched).toEqual([])
    expect(u.progressed).toBe(true)
    expect(j.targets[0].progress).toBe(9)
    g.mat[3] = M.water
    u = j.update(g)
    expect(u.latched).toEqual(['a'])
    expect(u.allLatched).toBe(true)
    fill(g, 0, 0, 8, 8, M.empty)
    u = j.update(g)
    expect(j.targets[0].latched).toBe(true)
    expect(u.latched).toEqual([])
    expect(u.progressed).toBe(false)
  })

  it('progress only counts a new maximum', () => {
    const j = new Judge(lvl([{ id: 'a', kind: 'fill', rect: [0, 0, 2, 2], mat: 'water', need: 50 }]))
    const g = createGrid()
    j.init(g)
    fill(g, 0, 0, 4, 1, M.water)
    expect(j.update(g).progressed).toBe(true)
    fill(g, 0, 0, 4, 1, M.empty)
    expect(j.update(g).progressed).toBe(false)
    fill(g, 0, 0, 4, 1, M.water)
    expect(j.update(g).progressed).toBe(false)
    fill(g, 0, 1, 1, 1, M.water)
    expect(j.update(g).progressed).toBe(true)
  })

  it('ignite counts fire on the 1-cell border; reach defaults to steam', () => {
    const j = new Judge(lvl([
      { id: 'torch', kind: 'ignite', rect: [2, 2, 2, 2] },
      { id: 'bell', kind: 'reach', rect: [10, 10, 2, 2] },
    ]))
    const g = createGrid()
    j.init(g)
    g.mat[8 * W + 7] = M.fire
    g.mat[40 * W + 40] = M.water
    let u = j.update(g)
    expect(u.latched).toEqual(['torch'])
    g.mat[41 * W + 41] = M.steam
    u = j.update(g)
    expect(u.latched).toEqual(['bell'])
    expect(u.allLatched).toBe(true)
  })

  it('bad targets never count toward clear and report bad at need', () => {
    const j = new Judge(lvl([
      { id: 'a', kind: 'fill', rect: [0, 0, 2, 2], mat: 'water', need: 1 },
      { id: 'x', kind: 'bad', rect: [10, 10, 2, 2], mat: 'sand', need: 2 },
    ]))
    const g = createGrid()
    j.init(g)
    g.mat[40 * W + 40] = M.sand
    expect(j.update(g).bad).toBe(false)
    g.mat[40 * W + 41] = M.sand
    expect(j.update(g).bad).toBe(true)
    g.mat[0] = M.water
    const u = j.update(g)
    expect(u.allLatched).toBe(true)
    expect(j.targets.map((t) => t.id)).toEqual(['a', 'x'])
  })

  it('protect latches after holdTicks of intact crates and breaks instantly when a crate cell is lost', () => {
    const t: TargetDef = { id: 'box', kind: 'protect', rect: [0, 0, 2, 2], holdTicks: 3 }
    const g = createGrid()
    fill(g, 0, 0, 4, 4, M.crate)
    const j = new Judge(lvl([t]))
    j.init(g)
    expect(j.update(g).latched).toEqual([])
    expect(j.update(g).progressed).toBe(true)
    expect(j.update(g).latched).toEqual(['box'])

    const k = new Judge(lvl([t]))
    k.init(g)
    k.update(g)
    g.mat[0] = M.empty
    expect(k.update(g).crateBroken).toBe(true)
  })

  it('gems are collected once when their material touches the rect', () => {
    const j = new Judge(lvl([{ id: 'a', kind: 'fill', rect: [0, 0, 2, 2], mat: 'water', need: 999 }], [
      { rect: [4, 4, 2, 2], mat: 'water' },
      { rect: [8, 8, 2, 2], mat: 'sand' },
    ]))
    const g = createGrid()
    j.init(g)
    g.mat[17 * W + 17] = M.water
    let u = j.update(g)
    expect(u.gems).toEqual([0])
    expect(u.progressed).toBe(true)
    g.mat[17 * W + 17] = M.empty
    u = j.update(g)
    expect(u.gems).toEqual([])
    expect(j.gems).toEqual([true, false])
    expect(j.gemCount).toBe(1)
  })

  it('a level with only bad targets can never clear', () => {
    const j = new Judge(lvl([{ id: 'x', kind: 'bad', rect: [10, 10, 2, 2], mat: 'sand', need: 5 }]))
    const g = createGrid()
    j.init(g)
    expect(j.update(g).allLatched).toBe(false)
  })
})
