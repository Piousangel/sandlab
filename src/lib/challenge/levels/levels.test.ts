import { describe, it, expect } from 'vitest'
import { LEVELS, levelById } from './index'
import { PRESETS } from '@/lib/sand/materials'
import { buildGrid, GRID_W, GRID_H } from '../grid'
import { judge, initialCounts } from '../judge'
import { canPaintAt } from '../area'

const SLUGS = new Set(PRESETS.map((m) => m.slug))
const inGrid = (z: { x: number; y: number; w: number; h: number }) =>
  z.x >= 0 && z.y >= 0 && z.w > 0 && z.h > 0 && z.x + z.w <= GRID_W && z.y + z.h <= GRID_H

describe('레벨 정합성', () => {
  it('10개, id 유일·URL-safe, levelById', () => {
    expect(LEVELS.length).toBe(10)
    const ids = LEVELS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
    expect(levelById(ids[0])).toBe(LEVELS[0])
    expect(levelById('nope')).toBeUndefined()
  })
  for (const l of LEVELS) {
    describe(l.id, () => {
      it('포맷 v1, 문구(blurb 40단어+·hint), 재료 slug 실재', () => {
        expect(l.v).toBe(1)
        expect(l.blurb.split(/\s+/).length).toBeGreaterThanOrEqual(40)
        expect(l.hint.length).toBeGreaterThan(10)
        for (const s of l.shapes) expect(SLUGS.has(s.mat), s.mat).toBe(true)
        for (const g of l.goals) if ('mat' in g) expect(SLUGS.has(g.mat), g.mat).toBe(true)
        for (const m of Object.keys(l.palette)) expect(SLUGS.has(m), m).toBe(true)
      })
      it('구역·칠 영역이 격자 안', () => {
        expect(inGrid(l.paintArea)).toBe(true)
        for (const g of l.goals) if ('zone' in g && g.zone !== 'all') expect(inGrid(g.zone)).toBe(true)
      })
      it('별 기준: 3성 < 2성 ≤ 예산 합', () => {
        const sum = Object.values(l.palette).reduce((a, b) => a + b, 0)
        expect(l.stars[0]).toBeLessThan(l.stars[1])
        expect(l.stars[1]).toBeLessThanOrEqual(sum)
      })
      it('모범답안: 팔레트 재료, 모든 점이 칠 영역 안, 획이 겹치지 않음', () => {
        expect(l.solution.length).toBeGreaterThan(0)
        let lastEnd = -1
        for (const s of [...l.solution].sort((a, b) => a.tick - b.tick)) {
          expect(s.mat in l.palette, s.mat).toBe(true)
          expect(s.tick).toBeGreaterThanOrEqual(lastEnd)
          lastEnd = s.tick + s.pts.length
          for (const [x, y] of s.pts) expect(canPaintAt(l.paintArea, x, y, s.r), `${x},${y}`).toBe(true)
        }
      })
      it('시작 격자에서 이미 전부 충족이면 안 된다', () => {
        const g = buildGrid(l)
        expect(judge(g, l, initialCounts(g, l)).every((s) => s.met)).toBe(false)
      })
    })
  }
})
