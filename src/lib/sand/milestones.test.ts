import { describe, it, expect } from 'vitest'
import { checkPourMilestone } from './milestones'

const GRID = 720_000 // W*H

describe('checkPourMilestone', () => {
  it('임계 미달이면 null, multReached 그대로', () => {
    const r = checkPourMilestone(1000, GRID, 0)
    expect(r.message).toBeNull()
    expect(r.multReached).toBe(0)
  })

  it('첫 임계(10%)를 넘으면 문구와 배수를 돌려준다', () => {
    const r = checkPourMilestone(GRID * 0.1, GRID, 0)
    expect(r.message).toBe('10% of a canvas poured')
    expect(r.multReached).toBe(0.1)
  })

  it('이미 도달한 배수는 다시 안 울린다', () => {
    const r = checkPourMilestone(GRID * 0.1, GRID, 0.1)
    expect(r.message).toBeNull()
    expect(r.multReached).toBe(0.1)
  })

  it('한 번에 여러 임계를 건너뛰면 가장 높은 것 하나만 알린다', () => {
    const r = checkPourMilestone(GRID * 3, GRID, 0)
    expect(r.message).toBe('2× a canvas poured')
    expect(r.multReached).toBe(2)
  })

  it('마지막 임계(25배)를 넘으면 그 이후로는 계속 null', () => {
    const r1 = checkPourMilestone(GRID * 30, GRID, 0)
    expect(r1.multReached).toBe(25)
    const r2 = checkPourMilestone(GRID * 100, GRID, r1.multReached)
    expect(r2.message).toBeNull()
    expect(r2.multReached).toBe(25)
  })

  it('연쇄 호출 — 실제 사용 패턴처럼 누적값이 점점 늘어날 때 순서대로 딱 한 번씩만 울린다', () => {
    let mult = 0
    const seen: string[] = []
    for (const total of [GRID * 0.05, GRID * 0.1, GRID * 0.3, GRID * 0.6, GRID * 1.2]) {
      const r = checkPourMilestone(total, GRID, mult)
      if (r.message) seen.push(r.message)
      mult = r.multReached
    }
    expect(seen).toEqual([
      '10% of a canvas poured',
      'Half a canvas poured',
      'A whole canvas worth poured',
    ])
  })
})
