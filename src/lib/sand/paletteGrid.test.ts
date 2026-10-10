import { describe, it, expect } from 'vitest'
import { paletteGrid, chipContentHeight } from './paletteGrid'

describe('paletteGrid — 세로 폰 팔레트가 남는 높이를 칩 크기로 흡수', () => {
  it('빈 공간 없이 n개를 담는 행·열을 고른다', () => {
    const g = paletteGrid(344, 262, 18)
    expect(g.cols * g.rows).toBeGreaterThanOrEqual(18)
    expect(g.cols * (g.rows - 1)).toBeLessThan(18) // 통째로 빈 행 없음
  })
  it('공간이 클수록 칩(점·라벨)이 커진다', () => {
    const small = paletteGrid(344, 150, 18)
    const big = paletteGrid(374, 430, 18)
    expect(big.dot).toBeGreaterThan(small.dot)
    expect(big.label).toBeGreaterThanOrEqual(small.label)
  })
  it('키 큰 공간에선 열을 줄여 행을 늘린다(셀이 정사각에 가깝게)', () => {
    expect(paletteGrid(374, 430, 18).cols).toBeLessThan(paletteGrid(344, 150, 18).cols)
  })
  it('점은 셀 안에 들어가고, 하한·상한을 지킨다', () => {
    for (const [w, h] of [[344, 60], [344, 262], [374, 430], [800, 900]]) {
      const g = paletteGrid(w, h, 18)
      expect(g.dot).toBeGreaterThanOrEqual(18)
      expect(g.dot).toBeLessThanOrEqual(56)
      expect(g.label).toBeGreaterThanOrEqual(9)
      expect(g.label).toBeLessThanOrEqual(14)
    }
  })
  it('측정 전(0×0)에도 터지지 않는다', () => {
    const g = paletteGrid(0, 0, 18)
    expect(g.cols).toBeGreaterThan(0)
    expect(Number.isFinite(g.dot)).toBe(true)
  })
})

describe('paletteGrid — 칩 내용이 셀 높이를 넘지 않는다(리뷰 10)', () => {
  it('아주 낮은 영역(분할 화면 등)에서도 점+라벨이 셀 안에 든다, 안 들면 라벨을 숨긴다', () => {
    for (const [w, h] of [[344, 40], [344, 60], [344, 90], [344, 120], [344, 262], [374, 430], [300, 70]]) {
      const g = paletteGrid(w, h, 18)
      const cellH = h / g.rows
      if (cellH >= 18) expect(chipContentHeight(g)).toBeLessThanOrEqual(cellH)
    }
  })
  it('공간이 넉넉하면 라벨을 보인다', () => {
    expect(paletteGrid(344, 262, 18).showLabel).toBe(true)
  })
  it('셀이 31px 미만이면 라벨을 숨긴다', () => {
    expect(paletteGrid(344, 60, 18).showLabel).toBe(false)
  })
})
