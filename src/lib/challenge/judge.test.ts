import { describe, it, expect } from 'vitest'
import { countZone, judge, initialCounts, describeGoal } from './judge'
import { GRID_W, GRID_H } from './grid'
import { buildIndex, PRESETS } from '@/lib/sand/materials'
import type { Level, Goal } from './types'

const idx = buildIndex(PRESETS)
const W = idx.get('water')!
const WOOD = idx.get('wood')!
const FIRE = idx.get('fire')!
const empty = () => new Uint32Array(GRID_W * GRID_H)
const fill = (g: Uint32Array, x: number, y: number, w: number, h: number, m: number) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy * GRID_W + xx] = m
}
const lvl = (goals: Goal[]): Level => ({ v: 1, id: 't', title: 't', blurb: '', hint: '', paintArea: { x: 0, y: 0, w: 1, h: 1 }, shapes: [], palette: {}, goals, stars: [1, 2], solution: [] })
const zone = { x: 100, y: 100, w: 10, h: 10 }

describe('countZone', () => {
  it('구역 안 재료 수와 면적', () => {
    const g = empty()
    fill(g, 100, 100, 10, 5, W)
    fill(g, 0, 0, 5, 5, W) // 구역 밖
    expect(countZone(g, zone, W)).toEqual({ n: 50, area: 100 })
  })
  it("'all'은 격자 전체", () => {
    expect(countZone(empty(), 'all', W)).toEqual({ n: 0, area: 720000 })
  })
  it('수명 비트가 있어도 재료로 센다', () => {
    const g = empty()
    g[100 * GRID_W + 100] = FIRE | (30 << 16)
    expect(countZone(g, zone, FIRE).n).toBe(1)
  })
})

describe('judge', () => {
  it('fill: 정확히 min이면 충족, 1셀 모자라면 미충족', () => {
    const goal: Goal = { type: 'fill', zone, mat: 'water', min: 0.8 }
    const g = empty()
    fill(g, 100, 100, 10, 8, W)
    expect(judge(g, lvl([goal]), [0])[0]).toEqual({ met: true, progress: 1 })
    g[107 * GRID_W + 109] = 0
    const s = judge(g, lvl([goal]), [0])[0]
    expect(s.met).toBe(false)
    expect(s.progress).toBeCloseTo(79 / 80)
  })
  it('clear: 구역에 0개면 충족', () => {
    const goal: Goal = { type: 'clear', zone, mat: 'fire' }
    const g = empty()
    expect(judge(g, lvl([goal]), [0])[0].met).toBe(true)
    g[105 * GRID_W + 105] = FIRE
    expect(judge(g, lvl([goal]), [0])[0]).toEqual({ met: false, progress: 0 })
  })
  it('reach: 1셀이면 충족', () => {
    const goal: Goal = { type: 'reach', zone, mat: 'water' }
    const g = empty()
    expect(judge(g, lvl([goal]), [0])[0].met).toBe(false)
    g[109 * GRID_W + 109] = W
    expect(judge(g, lvl([goal]), [0])[0].met).toBe(true)
  })
  it('protect: 초기 대비 비율, 초기 0이면 미충족(시작부터 클리어 방지)', () => {
    const goal: Goal = { type: 'protect', zone, mat: 'wood', min: 0.5 }
    const g = empty()
    fill(g, 100, 100, 10, 10, WOOD)
    const init = initialCounts(g, lvl([goal]))
    expect(init).toEqual([100])
    fill(g, 100, 100, 10, 5, 0)
    expect(judge(g, lvl([goal]), init)[0].met).toBe(true)
    g[105 * GRID_W + 100] = 0
    expect(judge(g, lvl([goal]), init)[0].met).toBe(false)
    expect(judge(empty(), lvl([goal]), [0])[0]).toEqual({ met: false, progress: 0 })
  })
  it('목표 순서대로 상태를 돌려준다', () => {
    const goals: Goal[] = [{ type: 'clear', zone, mat: 'fire' }, { type: 'reach', zone, mat: 'water' }]
    expect(judge(empty(), lvl(goals), [0, 0]).map((s) => s.met)).toEqual([true, false])
  })
})

describe('survive', () => {
  it('지정 틱에 도달해야 충족, 진행률은 경과 비율', () => {
    const goal: Goal = { type: 'survive', ticks: 1000 }
    expect(judge(empty(), lvl([goal]), [0], 0)[0]).toEqual({ met: false, progress: 0 })
    expect(judge(empty(), lvl([goal]), [0], 500)[0]).toEqual({ met: false, progress: 0.5 })
    expect(judge(empty(), lvl([goal]), [0], 1000)[0]).toEqual({ met: true, progress: 1 })
  })
  it('tick 인자가 없으면 0으로 본다(시작부터 충족 금지)', () => {
    expect(judge(empty(), lvl([{ type: 'survive', ticks: 10 }]), [0])[0].met).toBe(false)
  })
  it('설명 문구', () => {
    expect(describeGoal({ type: 'survive', ticks: 1800 })).toBe('Hold out until the bar fills')
  })
})

describe('describeGoal', () => {
  it('재료 이름과 기준을 사람 말로', () => {
    expect(describeGoal({ type: 'fill', zone, mat: 'water', min: 0.8 })).toBe('Fill the marked area with Water (80%)')
    expect(describeGoal({ type: 'clear', zone: 'all', mat: 'fire' })).toBe('Put out every bit of Fire')
    expect(describeGoal({ type: 'clear', zone, mat: 'wood' })).toBe('Remove all Wood from the marked area')
    expect(describeGoal({ type: 'reach', zone, mat: 'sand' })).toBe('Get Sand into the marked area')
    expect(describeGoal({ type: 'protect', zone, mat: 'wood', min: 0.6 })).toBe('Keep at least 60% of the Wood in the marked area')
  })
})
