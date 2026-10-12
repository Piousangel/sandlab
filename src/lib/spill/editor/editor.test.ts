import { describe, expect, it } from 'vitest'
import { parseLevel } from '../level/parse'
import { levelHash } from '../level/hash'
import { W1 } from '../levels/w1'
import { blankLevel, devFromActions, joinLevel, levelSource, splitLevel, withDev, withPar } from './editor'

const level = W1[0]

describe('editor helpers', () => {
  it('split then join round-trips a level exactly', () => {
    const { meta, map } = splitLevel(level)
    expect(map).toBe(level.map.trim())
    expect(meta).not.toContain('"map"')
    const r = joinLevel(meta, map)
    expect(r.ok).toBe(true)
    if (r.ok) expect(levelHash(r.def)).toBe(levelHash(level))
  })

  it('join reports JSON errors', () => {
    const r = joinLevel('{ nope', level.map)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/JSON/)
  })

  it('join reports map errors from the parser', () => {
    const r = joinLevel(splitLevel(level).meta, level.map.split('\n').slice(1).join('\n'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/rows/)
  })

  it('join reports unknown legend characters', () => {
    const bad = level.map.replace('.', 'Z')
    const r = joinLevel(splitLevel(level).meta, bad)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/"Z"/)
  })

  it('turns recorded actions into dev tuples', () => {
    expect(devFromActions([
      { tick: 0, verb: 'dig', tx: 1, ty: 2, tx2: 1, ty2: 5 },
      { tick: 40, verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' },
    ])).toEqual([[0, 'dig', 1, 2, 1, 5], [40, 'trigger', 0, 0, 0, 0, 'g1']])
  })

  it('withDev and withPar return new definitions', () => {
    const d = withDev(level, [[0, 'dig', 3, 3, 3, 4]])
    expect(d.dev).toEqual([[0, 'dig', 3, 3, 3, 4]])
    expect(level.dev).not.toEqual(d.dev)
    const p = withPar(level, 2, 5.5)
    expect(p.par).toEqual({ moves: 2, secs: 5.5 })
  })

  it('levelSource emits a defineLevel module with the literal map', () => {
    const src = levelSource(level)
    expect(src).toContain("import { defineLevel } from '../../level/define'")
    expect(src).toContain('export default defineLevel(')
    expect(src).toContain(level.map.trim().split('\n')[5])
    expect(src).not.toContain('frame(')
  })

  it('blankLevel parses and has an empty interior', () => {
    const b = blankLevel()
    const p = parseLevel(b)
    expect(p.mat.some((m) => m === 0)).toBe(true)
    expect(b.map.split('\n')).toHaveLength(120)
  })
})
