import { describe, it, expect } from 'vitest'
import { shareText, rankLabel, loadDaily, saveDaily } from './share'
import { beforeEach, afterEach, vi } from 'vitest'

describe('shareText', () => {
  it('번호·별·잉크·링크만(로컬 날짜 없음)', () => {
    expect(shareText(12, 3, 4210)).toBe('Sandlab Daily #12 ⭐⭐⭐ 4,210 ink\nhttps://sandlab.app/daily')
    expect(shareText(1, 1, 999)).toBe('Sandlab Daily #1 ⭐ 999 ink\nhttps://sandlab.app/daily')
  })
})

describe('rankLabel', () => {
  const p = [100, 250, 500, 750, 900]
  it('백분위 구간으로 위치를 말한다(잉크 적을수록 상위)', () => {
    expect(rankLabel(90, p)).toBe('Top 10% today')
    expect(rankLabel(100, p)).toBe('Top 10% today')
    expect(rankLabel(200, p)).toBe('Top 25% today')
    expect(rankLabel(400, p)).toBe('Top half today')
    expect(rankLabel(800, p)).toBe('Solved today')
  })
  it('제출이 적으면(백분위 없음) 첫 기록 문구', () => {
    expect(rankLabel(400, [])).toBe('One of the first to solve it today')
  })
})

describe('데일리 기록(localStorage)', () => {
  const mem = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
  }
  beforeEach(() => vi.stubGlobal('localStorage', mem()))
  afterEach(() => vi.unstubAllGlobals())
  it('날짜별 첫 기록만 저장', () => {
    expect(loadDaily(5)).toBeNull()
    saveDaily(5, { stars: 2, ink: 500 })
    saveDaily(5, { stars: 3, ink: 100 })
    expect(loadDaily(5)).toEqual({ stars: 2, ink: 500 })
  })
  it('저장소가 막혀도 예외 없음', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } })
    expect(loadDaily(5)).toBeNull()
    expect(() => saveDaily(5, { stars: 1, ink: 1 })).not.toThrow()
  })
})
