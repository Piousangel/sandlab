import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadProgress, saveBest } from './progress'

function memStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 }
}

describe('progress', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memStorage()))
  afterEach(() => vi.unstubAllGlobals())

  it('처음엔 빈 기록', () => {
    expect(loadProgress()).toEqual({})
  })
  it('첫 기록 저장', () => {
    expect(saveBest('a', { stars: 2, ink: 500 })).toEqual({ stars: 2, ink: 500 })
    expect(loadProgress()).toEqual({ a: { stars: 2, ink: 500 } })
  })
  it('더 나쁜 기록은 덮지 않는다', () => {
    saveBest('a', { stars: 3, ink: 400 })
    expect(saveBest('a', { stars: 2, ink: 100 })).toEqual({ stars: 3, ink: 400 })
    expect(saveBest('a', { stars: 3, ink: 450 })).toEqual({ stars: 3, ink: 400 })
  })
  it('같은 별이면 잉크가 적을 때 갱신, 별이 많으면 갱신', () => {
    saveBest('a', { stars: 2, ink: 400 })
    expect(saveBest('a', { stars: 2, ink: 300 })).toEqual({ stars: 2, ink: 300 })
    expect(saveBest('a', { stars: 3, ink: 900 })).toEqual({ stars: 3, ink: 900 })
  })
  it('localStorage가 throw해도 예외 없이 동작', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } })
    expect(loadProgress()).toEqual({})
    expect(saveBest('a', { stars: 1, ink: 5 })).toEqual({ stars: 1, ink: 5 })
  })
  it('깨진 JSON은 빈 기록', () => {
    localStorage.setItem('sandlab.challenge.v1', '{nope')
    expect(loadProgress()).toEqual({})
  })
})
