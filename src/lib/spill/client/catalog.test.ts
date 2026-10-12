import { describe, it, expect } from 'vitest'
import { groupByWorld, nextLevel, worldUnlocked, lockMessage, worldName, levelById } from './catalog'
import type { LevelDef } from '../level/define'

const lv = (id: string, world: number): LevelDef => ({ id, world, v: 1, name: id, salt: 1, legend: {}, map: '', targets: [] })
const L = [lv('1-1', 1), lv('1-2', 1), lv('2-1', 2), lv('1-3', 1), lv('2-2', 2)]

describe('catalog', () => {
  it('월드별로 묶고 월드 안에서는 정의 순서', () => {
    const g = groupByWorld(L)
    expect(g.map((w) => w.world)).toEqual([1, 2])
    expect(g[0].levels.map((l) => l.id)).toEqual(['1-1', '1-2', '1-3'])
    expect(g[0].name).toBe(worldName(1))
  })
  it('월드 이름', () => {
    expect(worldName(1)).toBe('Flow')
    expect(worldName(2)).toBe('Spark')
    expect(worldName(99)).toBe('World 99')
  })
  it('다음 레벨은 목록 순서(같은 월드 우선 정렬된 순서)', () => {
    expect(nextLevel(L, '1-1')?.id).toBe('1-2')
    expect(nextLevel(L, '1-3')?.id).toBe('2-1')
    expect(nextLevel(L, '2-2')).toBeNull()
    expect(nextLevel(L, 'nope')).toBeNull()
  })
  it('levelById', () => {
    expect(levelById(L, '2-1')?.world).toBe(2)
    expect(levelById(L, 'x')).toBeUndefined()
  })
  it('W1은 항상 열림, 다음 월드는 이전 월드 별 2×레벨 수에서 열림(§4.4)', () => {
    const stars: Record<string, number> = { '1-1': 3, '1-2': 2, '1-3': 0 }
    const of = (id: string) => stars[id] ?? 0
    expect(worldUnlocked(1, L, of)).toBe(true)
    expect(worldUnlocked(2, L, of)).toBe(false)
    stars['1-3'] = 1
    expect(worldUnlocked(2, L, of)).toBe(true)
  })
  it('잠금 문구 "Need 16★ from W1"', () => {
    const eight = Array.from({ length: 8 }, (_, i) => lv(`1-${i + 1}`, 1))
    expect(lockMessage(2, [...eight, lv('2-1', 2)])).toBe('Need 16★ from W1')
  })
})
