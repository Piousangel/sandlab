import { describe, it, expect } from 'vitest'
import { tbucket, TBUCKET_TICKS, histBars, MIN_SAMPLE, shareText } from './hist'

describe('tbucket (0.5초 버킷)', () => {
  it('30틱 = 0.5초', () => {
    expect(TBUCKET_TICKS).toBe(30)
    expect(tbucket(0)).toBe(0)
    expect(tbucket(29)).toBe(0)
    expect(tbucket(30)).toBe(1)
    expect(tbucket(359)).toBe(11)
  })
})

describe('histBars (분포 막대, 표본 50 미만이면 숨김)', () => {
  const cells: [number, number, number][] = [[1, 10, 20], [1, 12, 30], [2, 11, 40]]
  it('표본이 50 미만이면 null', () => {
    expect(MIN_SAMPLE).toBe(50)
    expect(histBars({ cells: [[1, 10, 49]], total: 49 }, 1, 300)).toBeNull()
  })
  it('같은 수의 시간 막대 + 내 위치', () => {
    const h = histBars({ cells, total: 90 }, 1, 12 * 30 + 5)!
    expect(h.bars.map((b) => b.bucket)).toEqual([10, 11, 12])
    expect(h.bars.map((b) => b.cnt)).toEqual([20, 0, 30])
    expect(h.you).toBe(2)
    expect(h.sample).toBe(50)
  })
  it('같은 수 표본이 50 미만이면 전체 수 합산', () => {
    const h = histBars({ cells: [[1, 10, 10], [2, 11, 60]], total: 70 }, 1, 300)!
    expect(h.sample).toBe(70)
    expect(h.bars.reduce((a, b) => a + b.cnt, 0)).toBe(70)
  })
  it('내 버킷이 범위 밖이면 막대를 늘린다', () => {
    const h = histBars({ cells: [[1, 10, 60]], total: 60 }, 1, 14 * 30)!
    expect(h.bars[h.bars.length - 1].bucket).toBe(14)
    expect(h.you).toBe(h.bars.length - 1)
  })
})

describe('shareText', () => {
  it('캠페인 공유문(§6.5)', () => {
    expect(shareText('1-1', 3, 1, 348, 'sandlab.app')).toBe('Sandlab Spill 1-1 ★★★ 1 move · 5.8s sandlab.app/play/1-1')
    expect(shareText('2-3', 1, 2, 600, 'sandlab.app')).toBe('Sandlab Spill 2-3 ★☆☆ 2 moves · 10.0s sandlab.app/play/2-3')
  })
})
