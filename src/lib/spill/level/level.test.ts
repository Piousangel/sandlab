import { describe, it, expect } from 'vitest'
import { defineLevel, type LevelDef } from './define'
import { parseLevel, MAP_COLS, MAP_ROWS } from './parse'
import { fnv1a32, levelHash, normalizeJson } from './hash'
import { MapCanvas } from './mapcanvas'
import { M } from '../sim/materials'
import { W, H } from '../sim/grid'

function base(): LevelDef {
  const c = new MapCanvas()
  c.rect(0, 119, 80, 1, '#') // 바닥 줄
  c.rect(10, 10, 4, 1, 'S') // spout 4칸 = 8셀
  c.rect(20, 50, 6, 2, 'G')
  c.rect(30, 60, 2, 2, 'd')
  c.rect(40, 70, 1, 1, 'p')
  return {
    id: 't-1', v: 1, world: 0, name: 'Test', salt: 0x1234,
    legend: { '#': 'wall', '.': 'empty', d: 'dirt', p: 'plank', G: 'gate:g1', S: 'spout:s1' },
    map: c.toString(),
    spouts: { s1: { mat: 'water', rate: 2, total: 100 } },
    targets: [{ id: 'a', kind: 'fill', rect: [10, 50, 4, 4], mat: 'water', need: 40 }],
  }
}

describe('MapCanvas', () => {
  it('80×120 문자 맵을 만든다', () => {
    const s = new MapCanvas().toString()
    const rows = s.split('\n')
    expect(rows).toHaveLength(MAP_ROWS)
    expect(rows.every((r) => r.length === MAP_COLS)).toBe(true)
  })
  it('범위 밖 rect는 잘린다', () => {
    const c = new MapCanvas()
    c.rect(78, 118, 10, 10, '#')
    const rows = c.toString().split('\n')
    expect(rows[119].slice(78)).toBe('##')
  })
})

describe('parseLevel (§7.5 맵 1/2 축척)', () => {
  it('문자 1개 = 2×2셀', () => {
    const p = parseLevel(defineLevel(base()))
    expect(p.mat.length).toBe(W * H)
    const at = (x: number, y: number) => p.mat[y * W + x]
    expect(at(0, 238)).toBe(M.wall)
    expect(at(159, 239)).toBe(M.wall)
    expect(at(0, 237)).toBe(M.empty)
    expect(at(60, 120)).toBe(M.dirt)
    expect(at(63, 123)).toBe(M.dirt)
    expect(at(64, 120)).toBe(M.empty)
  })

  it('gate와 spout 셀은 life 칸에 그룹 번호(1부터)를 담는다', () => {
    const p = parseLevel(defineLevel(base()))
    const i = 100 * W + 40 // gate 영역 (20,50)*2
    expect(p.mat[i]).toBe(M.gate)
    expect(p.life[i]).toBe(1)
    expect(p.gates).toEqual(['g1'])
    const s = 20 * W + 20
    expect(p.mat[s]).toBe(M.spout)
    expect(p.life[s]).toBe(1)
    expect(p.spouts).toEqual([{ key: 's1', mat: M.water, rate: 2, total: 100 }])
  })

  it('가연 고체는 hp로 life를 초기화한다', () => {
    const p = parseLevel(defineLevel(base()))
    expect(p.mat[140 * W + 80]).toBe(M.plank)
    expect(p.life[140 * W + 80]).toBeGreaterThan(0)
  })

  it('타깃 rect는 타일 단위 → 셀 ×4', () => {
    const p = parseLevel(defineLevel(base()))
    expect(p.targets[0]).toMatchObject({ id: 'a', kind: 'fill', x: 40, y: 200, w: 16, h: 16, mat: M.water, need: 40 })
  })

  it('행 길이가 틀리면 몇 번째 행인지 알려 준다', () => {
    const d = base()
    const rows = d.map.split('\n')
    rows[5] = rows[5].slice(1)
    expect(() => parseLevel({ ...d, map: rows.join('\n') })).toThrow(/row 5/)
  })

  it('범례에 없는 문자, 없는 재료, 정의 안 된 spout는 오류', () => {
    const d = base()
    expect(() => parseLevel({ ...d, map: d.map.replace('.', 'z') })).toThrow(/legend/)
    expect(() => parseLevel({ ...d, legend: { ...d.legend, d: 'dirtt' } })).toThrow(/dirtt/)
    expect(() => parseLevel({ ...d, spouts: {} })).toThrow(/s1/)
  })

  it('defineLevel은 2×2타일보다 작은 센서 rect를 거부한다(§4.2)', () => {
    const d = base()
    expect(() => defineLevel({ ...d, targets: [{ id: 'a', kind: 'fill', rect: [0, 0, 1, 2], mat: 'water', need: 1 }] })).toThrow(/2×2/)
  })
})

describe('levelHash (FNV-1a32 정규화 JSON)', () => {
  it('FNV-1a32 기준값', () => {
    expect(fnv1a32('')).toBe('811c9dc5')
    expect(fnv1a32('a')).toBe('e40c292c')
  })
  it('키 순서와 무관하다', () => {
    expect(normalizeJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe('{"a":[{"c":3,"d":2}],"b":1}')
    const d = base()
    const shuffled = Object.fromEntries(Object.entries(d).reverse()) as unknown as LevelDef
    expect(levelHash(shuffled)).toBe(levelHash(d))
  })
  it('맵 한 글자가 바뀌면 해시가 바뀐다', () => {
    const d = base()
    expect(levelHash({ ...d, map: d.map.replace('.', '#') })).not.toBe(levelHash(d))
  })
})
