import { describe, it, expect } from 'vitest'
import { hash32, q16, roll } from './rng'

describe('hash32 (정수 결정적 해시)', () => {
  it('같은 입력 → 같은 출력, uint32 범위', () => {
    const a = hash32(3, 7, 120, 0x3a1f)
    expect(a).toBe(hash32(3, 7, 120, 0x3a1f))
    expect(Number.isInteger(a)).toBe(true)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(2 ** 32)
  })

  it('인자 하나만 바뀌어도 출력이 바뀐다', () => {
    const base = hash32(1, 2, 3, 4)
    expect(hash32(2, 2, 3, 4)).not.toBe(base)
    expect(hash32(1, 3, 3, 4)).not.toBe(base)
    expect(hash32(1, 2, 4, 4)).not.toBe(base)
    expect(hash32(1, 2, 3, 5)).not.toBe(base)
  })

  it('고정 값 스냅샷 — 해시 함수가 바뀌면 모든 리플레이가 깨진다', () => {
    expect([hash32(0, 0, 0, 0), hash32(1, 2, 3, 4), hash32(159, 239, 2700, 0xffff)]).toMatchInlineSnapshot(`
      [
        3599889139,
        2615451804,
        4154717259,
      ]
    `)
  })

  it('하위 16비트가 대략 균등하다(확률 비교용)', () => {
    let below = 0
    const N = 20000
    for (let i = 0; i < N; i++) if ((hash32(i % 160, (i / 160) | 0, 7, 9) & 0xffff) < 0x8000) below++
    expect(below / N).toBeGreaterThan(0.47)
    expect(below / N).toBeLessThan(0.53)
  })
})

describe('q16 / roll', () => {
  it('q16은 퍼센트(정수)를 Q16으로 바꾼다', () => {
    expect(q16(100)).toBe(65536)
    expect(q16(50)).toBe(32768)
    expect(q16(0)).toBe(0)
  })
  it('roll(h, Q16) = (h & 0xffff) < chance', () => {
    expect(roll(0x0000_0010, 0x11)).toBe(true)
    expect(roll(0xffff_0011, 0x11)).toBe(false)
    expect(roll(0xabcd_ffff, 65536)).toBe(true)
    expect(roll(0, 0)).toBe(false)
  })
})
