import { describe, it, expect } from 'vitest'
import { InkMeter } from './ink'

describe('InkMeter', () => {
  it('같은 자리를 다시 칠하면 0을 센다', () => {
    const m = new InkMeter({ water: 1000 })
    const a = m.stamp('water', 100, 100, 100, 100, 3)
    expect(a).toBeGreaterThan(0)
    expect(m.stamp('water', 100, 100, 100, 100, 3)).toBe(0)
    expect(m.used('water')).toBe(a)
  })
  it('r=0 수평 선분 길이 10 → 11픽셀', () => {
    const m = new InkMeter({ sand: 1000 })
    expect(m.stamp('sand', 0, 0, 10, 0, 0)).toBe(11)
  })
  it('r=3 원(점) → 29픽셀 (x²+y² ≤ 9)', () => {
    const m = new InkMeter({ sand: 1000 })
    expect(m.stamp('sand', 50, 50, 50, 50, 3)).toBe(29)
  })
  it('격자 밖은 세지 않는다', () => {
    const m = new InkMeter({ sand: 1000 })
    expect(m.stamp('sand', 0, 0, 0, 0, 3)).toBe(11) // 사분원 + 축
  })
  it('재료마다 따로 센다(같은 자리 다른 재료는 새로 셈)', () => {
    const m = new InkMeter({ sand: 1000, water: 1000 })
    m.stamp('sand', 10, 10, 10, 10, 2)
    expect(m.stamp('water', 10, 10, 10, 10, 2)).toBe(m.used('sand'))
    expect(m.total()).toBe(m.used('sand') * 2)
  })
  it('left는 예산-사용, 0 아래로 안 간다', () => {
    const m = new InkMeter({ water: 5 })
    m.stamp('water', 0, 0, 10, 0, 0)
    expect(m.used('water')).toBe(11)
    expect(m.left('water')).toBe(0)
  })
  it('팔레트 밖 재료는 무시', () => {
    const m = new InkMeter({ water: 100 })
    expect(m.stamp('lava', 10, 10, 10, 10, 3)).toBe(0)
    expect(m.total()).toBe(0)
  })
  it('reset은 전부 지운다', () => {
    const m = new InkMeter({ water: 100 })
    m.stamp('water', 10, 10, 10, 10, 2)
    m.reset()
    expect(m.total()).toBe(0)
    expect(m.left('water')).toBe(100)
  })
})
