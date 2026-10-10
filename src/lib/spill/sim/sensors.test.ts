import { describe, it, expect } from 'vitest'
import { countRect, Sensors } from './sensors'
import { createGrid, W } from './grid'
import { M } from './materials'

describe('센서 rect 카운트', () => {
  it('rect 안의 지정 재료만 센다, 격자 밖은 잘린다', () => {
    const g = createGrid()
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.mat[y * W + x] = M.water
    g.mat[10] = M.water
    expect(countRect(g, { x: 0, y: 0, w: 4, h: 4 }, M.water)).toBe(16)
    expect(countRect(g, { x: -8, y: -8, w: 10, h: 10 }, M.water)).toBe(4)
    expect(countRect(g, { x: 0, y: 0, w: 4, h: 4 }, M.sand)).toBe(0)
  })

  it('pad=1이면 이웃까지 본다(ignite 타깃)', () => {
    const g = createGrid()
    g.mat[20 * W + 19] = M.fire
    const s = new Sensors([{ x: 20, y: 20, w: 8, h: 8, mat: M.fire }, { x: 20, y: 20, w: 8, h: 8, mat: M.fire, pad: 1 }])
    s.update(g)
    expect(Array.from(s.values)).toEqual([0, 1])
  })
})
