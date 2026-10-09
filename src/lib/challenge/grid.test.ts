import { describe, it, expect } from 'vitest'
import { buildGrid, GRID_W, GRID_H } from './grid'
import { buildIndex, PRESETS } from '@/lib/sand/materials'
import type { Level } from './types'

const idx = buildIndex(PRESETS)
const lvl = (shapes: Level['shapes']): Level => ({
  v: 1, id: 't', title: 't', blurb: '', hint: '', shapes, palette: {}, goals: [], stars: [1, 2], solution: [],
})
const at = (g: Uint32Array, x: number, y: number) => g[y * GRID_W + x] & 0xffff

describe('buildGrid', () => {
  it('1200×600 빈 격자에서 시작한다', () => {
    const g = buildGrid(lvl([]))
    expect(g.length).toBe(GRID_W * GRID_H)
    expect(g.every((v) => v === 0)).toBe(true)
  })
  it('rect는 지정 범위만 칠한다(끝 좌표 미포함)', () => {
    const g = buildGrid(lvl([{ kind: 'rect', mat: 'wall', x: 10, y: 20, w: 3, h: 2 }]))
    expect(at(g, 10, 20)).toBe(idx.get('wall'))
    expect(at(g, 12, 21)).toBe(idx.get('wall'))
    expect(at(g, 13, 20)).toBe(0)
    expect(at(g, 10, 22)).toBe(0)
  })
  it('나중 도형이 앞 도형을 덮는다', () => {
    const g = buildGrid(lvl([
      { kind: 'rect', mat: 'wall', x: 0, y: 0, w: 10, h: 10 },
      { kind: 'rect', mat: 'water', x: 5, y: 5, w: 10, h: 10 },
    ]))
    expect(at(g, 2, 2)).toBe(idx.get('wall'))
    expect(at(g, 6, 6)).toBe(idx.get('water'))
  })
  it('격자 밖은 잘라낸다(음수·초과)', () => {
    const g = buildGrid(lvl([{ kind: 'rect', mat: 'stone', x: -5, y: 595, w: 10, h: 20 }]))
    expect(at(g, 0, 599)).toBe(idx.get('stone'))
    expect(at(g, 4, 599)).toBe(idx.get('stone'))
    expect(at(g, 5, 599)).toBe(0)
  })
  it('수명 있는 재료는 상위 16비트에 수명을 넣는다(불 45)', () => {
    const g = buildGrid(lvl([{ kind: 'rect', mat: 'fire', x: 0, y: 0, w: 1, h: 1 }]))
    expect(g[0] >>> 16).toBe(45)
    expect(g[0] & 0xffff).toBe(idx.get('fire'))
  })
  it('circle은 반지름 안만, line은 두께/2 안만', () => {
    const g = buildGrid(lvl([
      { kind: 'circle', mat: 'sand', x: 100, y: 100, r: 5 },
      { kind: 'line', mat: 'wood', x0: 200, y0: 300, x1: 300, y1: 300, t: 4 },
    ]))
    expect(at(g, 105, 100)).toBe(idx.get('sand'))
    expect(at(g, 104, 104)).toBe(0) // 거리 5.66 > 5
    expect(at(g, 250, 302)).toBe(idx.get('wood'))
    expect(at(g, 250, 303)).toBe(0)
  })
  it('없는 재료 slug는 예외', () => {
    expect(() => buildGrid(lvl([{ kind: 'rect', mat: 'nope', x: 0, y: 0, w: 1, h: 1 }]))).toThrow()
  })
})
