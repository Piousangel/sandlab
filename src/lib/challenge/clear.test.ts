import { describe, it, expect } from 'vitest'
import { ClearTracker, CLEAR_STREAK, starsFor } from './clear'

const ok = [{ met: true, progress: 1 }]
const no = [{ met: false, progress: 0.5 }]

describe('ClearTracker', () => {
  it('연속 4회 충족한 push에서만 true', () => {
    expect(CLEAR_STREAK).toBe(4)
    const t = new ClearTracker()
    expect([t.push(ok), t.push(ok), t.push(ok)]).toEqual([false, false, false])
    expect(t.push(ok)).toBe(true)
    expect(t.cleared).toBe(true)
    expect(t.push(ok)).toBe(false)
  })
  it('중간에 미충족이면 연속이 끊긴다', () => {
    const t = new ClearTracker()
    t.push(ok); t.push(ok); t.push(no); t.push(ok); t.push(ok); t.push(ok)
    expect(t.cleared).toBe(false)
    expect(t.push(ok)).toBe(true)
  })
  it('목표가 없으면(빈 배열) 충족이 아니다', () => {
    const t = new ClearTracker()
    for (let i = 0; i < 6; i++) t.push([])
    expect(t.cleared).toBe(false)
  })
  it('reset 후 다시 센다', () => {
    const t = new ClearTracker()
    for (let i = 0; i < 4; i++) t.push(ok)
    t.reset()
    expect(t.cleared).toBe(false)
    expect(t.push(ok)).toBe(false)
  })
})

describe('starsFor', () => {
  it('3성·2성 상한 이하, 그 외 1성', () => {
    expect(starsFor(100, [100, 200])).toBe(3)
    expect(starsFor(101, [100, 200])).toBe(2)
    expect(starsFor(200, [100, 200])).toBe(2)
    expect(starsFor(201, [100, 200])).toBe(1)
  })
})
