import { describe, it, expect } from 'vitest'
import { computeScale, paintCells, PALETTE } from './canvas'
import { accumulateGlow, GLOW_W, GLOW_H } from './glow'
import { createGrid, W, H } from '../sim/grid'
import { M } from '../sim/materials'

describe('computeScale (§3 정수 DPR 배율)', () => {
  it('기기 픽셀 기준 정수 배율 — DPR 2.8125, 390×844 폰', () => {
    const s = computeScale(390 - 32, 600, 2.8125)
    // floor(min(358, 400) * 2.8125 / 160) = floor(6.29) = 6 → 6 / 2.8125 CSS px/셀
    expect(s.devicePerCell).toBe(6)
    expect(s.cssPerCell).toBeCloseTo(6 / 2.8125, 6)
    expect(s.cssW).toBeCloseTo(160 * (6 / 2.8125), 6)
    expect(s.cssH).toBeCloseTo(240 * (6 / 2.8125), 6)
  })
  it('높이가 좁으면 높이(×2/3)가 폭을 제한한다', () => {
    const s = computeScale(1440, 600, 1)
    expect(s.devicePerCell).toBe(2) // floor(400/160)
  })
  it('공간이 아무리 작아도 기기 픽셀 1배는 보장', () => {
    expect(computeScale(50, 50, 1).devicePerCell).toBe(1)
  })
})

describe('paintCells (본 레이어)', () => {
  it('빈칸은 배경색, 재료는 팔레트색(노이즈 ±)', () => {
    const g = createGrid()
    g.mat[0] = M.wall
    const out = new Uint32Array(W * H)
    paintCells(g, out, 0)
    expect(out[W * H - 1]).toBe(PALETTE[M.empty][0])
    expect(PALETTE[M.wall]).toContain(out[0])
  })
  it('같은 격자 → 같은 픽셀(셀 좌표 고정 노이즈)', () => {
    const g = createGrid()
    for (let i = 0; i < W * 10; i++) g.mat[i] = M.sand
    const a = new Uint32Array(W * H)
    const b = new Uint32Array(W * H)
    paintCells(g, a, 0)
    paintCells(g, b, 0)
    expect(a).toEqual(b)
  })
  it('액체 윗면 1셀은 하이라이트(아래 셀보다 밝다)', () => {
    const g = createGrid()
    for (let y = 100; y < 110; y++) for (let x = 0; x < W; x++) g.mat[y * W + x] = M.water
    const out = new Uint32Array(W * H)
    paintCells(g, out, 0)
    const lum = (c: number) => (c & 0xff) + ((c >>> 8) & 0xff) + ((c >>> 16) & 0xff)
    let top = 0, mid = 0
    for (let x = 0; x < W; x++) { top += lum(out[100 * W + x]); mid += lum(out[105 * W + x]) }
    expect(top).toBeGreaterThan(mid)
  })
})

describe('accumulateGlow (40×60 발광 레이어)', () => {
  it('발광 재료가 있는 4×4 블록만 빛난다', () => {
    const g = createGrid()
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.mat[y * W + x] = M.lava
    g.mat[100 * W + 100] = M.water
    const rgb = new Float32Array(GLOW_W * GLOW_H * 3)
    accumulateGlow(g, rgb)
    expect(rgb[0]).toBeGreaterThan(0)
    const k = (25 * GLOW_W + 25) * 3
    expect(rgb[k] + rgb[k + 1] + rgb[k + 2]).toBe(0)
  })
})
