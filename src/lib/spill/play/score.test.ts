import { describe, it, expect } from 'vitest'
import { compareResults, formatMoves, formatSecs, hudLine, overPar, parSecsFromBest, parTicks, starMask, stars } from './score'
import type { RunResult } from './attempt'
import { POT_LEVEL } from './fixtures'
import { defineLevel } from '../level/define'

const base: RunResult = {
  id: 't-pot', lh: '00000000', outcome: 'cleared', reason: null, ticks: 300, moves: 1, dug: 3,
  gems: 1, gemTotal: 1, gemMask: [true], latched: ['pot'], targetsLeft: 0, hash: '00000000',
}

describe('stars (§4.3)', () => {
  it('par secs to ticks without float drift', () => {
    expect(parTicks(6)).toBe(360)
    expect(parTicks(5.8)).toBe(348)
    expect(parTicks(0.1)).toBe(6)
  })

  it('three stars: clear, all gems, moves<=par AND ticks<=par', () => {
    expect(stars(base, POT_LEVEL)).toEqual({ clear: true, gems: true, par: true, count: 3 })
    expect(stars({ ...base, ticks: 360 }, POT_LEVEL).par).toBe(true)
    expect(stars({ ...base, ticks: 361 }, POT_LEVEL).par).toBe(false)
    expect(stars({ ...base, moves: 2 }, POT_LEVEL).par).toBe(false)
    expect(stars({ ...base, gems: 0, gemMask: [false] }, POT_LEVEL)).toEqual({ clear: true, gems: false, par: true, count: 2 })
  })

  it('failed runs earn nothing even under par', () => {
    expect(stars({ ...base, outcome: 'failed', reason: 'stalled' }, POT_LEVEL)).toEqual({ clear: false, gems: false, par: false, count: 0 })
  })

  it('a level without gems gives the gem star with the clear; without par no par star', () => {
    const lvl = defineLevel({ ...POT_LEVEL, gems: [], par: undefined })
    expect(stars({ ...base, gems: 0, gemTotal: 0, gemMask: [] }, lvl)).toEqual({ clear: true, gems: true, par: false, count: 2 })
  })

  it('bitmask 1=clear 2=gems 4=par', () => {
    expect(starMask({ clear: true, gems: false, par: true, count: 2 })).toBe(5)
  })

  it('par.secs = dev best × 1.15 rounded up to 0.1 s', () => {
    expect(parSecsFromBest(300)).toBe(5.8)
    expect(parSecsFromBest(360)).toBe(6.9)
    expect(parSecsFromBest(120)).toBe(2.3)
  })
})

describe('ranking and HUD text', () => {
  it('fewer moves, then fewer ticks, then fewer dug tiles', () => {
    expect(compareResults({ moves: 1, ticks: 900, dug: 9 }, { moves: 2, ticks: 10, dug: 0 })).toBeLessThan(0)
    expect(compareResults({ moves: 2, ticks: 10, dug: 9 }, { moves: 2, ticks: 11, dug: 0 })).toBeLessThan(0)
    expect(compareResults({ moves: 2, ticks: 10, dug: 3 }, { moves: 2, ticks: 10, dug: 4 })).toBeLessThan(0)
    expect(compareResults({ moves: 2, ticks: 10, dug: 4 }, { moves: 2, ticks: 10, dug: 4 })).toBe(0)
  })

  it('formats "N move(s) · par P / T.Ts" and never shows a time under par when it is over', () => {
    expect(formatMoves(1)).toBe('1 move')
    expect(formatMoves(0)).toBe('0 moves')
    expect(formatSecs(360)).toBe('6.0s')
    expect(formatSecs(361)).toBe('6.1s')
    expect(hudLine(1, { moves: 2, secs: 6 })).toBe('1 move · par 2 / 6.0s')
    expect(hudLine(3, null)).toBe('3 moves')
    expect(overPar(3, 361, { moves: 2, secs: 6 })).toEqual({ moves: true, time: true })
    expect(overPar(2, 360, { moves: 2, secs: 6 })).toEqual({ moves: false, time: false })
  })
})
