import { describe, it, expect } from 'vitest'
import { LEVELS, levelById } from './index'
import { PRESETS } from '@/lib/sand/materials'
import { buildGrid, GRID_W, GRID_H } from '../grid'
import { judge, initialCounts } from '../judge'
import { canPaintAt, areaFor } from '../area'

const SLUGS = new Set(PRESETS.map((m) => m.slug))
const inGrid = (z: { x: number; y: number; w: number; h: number }) =>
  z.x >= 0 && z.y >= 0 && z.w > 0 && z.h > 0 && z.x + z.w <= GRID_W && z.y + z.h <= GRID_H

describe('레벨 정합성', () => {
  it('20개, id 유일·URL-safe, levelById', () => {
    expect(LEVELS.length).toBe(20)
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
        for (const a of Object.values(l.areaFor ?? {})) expect(inGrid(a)).toBe(true)
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
          for (const [x, y] of s.pts) expect(canPaintAt(areaFor(l, s.mat), x, y, s.r), `${x},${y}`).toBe(true)
        }
      })
      it('지름길 없음: 목표 재료를 직접 칠해 목표 구역에 떨어뜨릴 수 없다(구조물로 막힌 경우 제외)', () => {
        // 2026-10-09 리뷰: lava-bridge는 칠 영역 오른쪽 끝이 턱 위라 다리 없이 물을 목표에 떨굴 수 있었다.
        const MAX_R = 14
        const grid = buildGrid(l)
        const SOLID = new Set(['wall', 'metal', 'stone'].map((m) => PRESETS.findIndex((p) => p.slug === m)))
        for (const g of l.goals) {
          if (g.type !== 'reach' || g.zone === 'all' || !(g.mat in l.palette)) continue
          const area = areaFor(l, g.mat)
          for (let x = Math.max(area.x, g.zone.x - MAX_R); x < Math.min(area.x + area.w, g.zone.x + g.zone.w + MAX_R); x++) {
            // 칠 영역 바닥에서 목표 구역 위까지 이 열에 단단한 구조물이 하나라도 있으면 막힌 것
            let blocked = false
            for (let y = area.y + area.h; y < g.zone.y; y++) if (SOLID.has(grid[y * GRID_W + x] & 0xffff)) blocked = true
            expect(blocked, `${g.mat} straight down at x=${x}`).toBe(true)
          }
        }
      })
      it('지름길 없음: 점화 재료(fire/lava)로 목표 연료 구역 옆을 직접 칠할 수 없다', () => {
        // 2026-10-09 리뷰: oil-slick은 기름 없이 나무 옆에 불을 칠하면 끝났다.
        const MAX_R = 14
        for (const g of l.goals) {
          if (g.type !== 'clear' || g.zone === 'all' || !['wood', 'plant', 'oil'].includes(g.mat)) continue
          for (const ign of ['fire', 'lava']) {
            if (!(ign in l.palette)) continue
            const a = areaFor(l, ign)
            const near = a.x < g.zone.x + g.zone.w + MAX_R && a.x + a.w > g.zone.x - MAX_R && a.y < g.zone.y + g.zone.h + MAX_R && a.y + a.h > g.zone.y - MAX_R
            expect(near, `${ign} area reaches ${g.mat} zone`).toBe(false)
          }
        }
      })
      it('시작 격자에서 이미 전부 충족이면 안 된다', () => {
        const g = buildGrid(l)
        expect(judge(g, l, initialCounts(g, l)).every((s) => s.met)).toBe(false)
      })
    })
  }
})
