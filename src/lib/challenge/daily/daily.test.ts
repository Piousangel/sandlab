import { describe, it, expect } from 'vitest'
import { dayNumber, dailyFor, DAILY_POOL, LAUNCH_UTC } from './index'

const DAY = 86_400_000

describe('dayNumber (UTC)', () => {
  it('런치 당일 0시 UTC = 1, 그 전도 1', () => {
    expect(dayNumber(LAUNCH_UTC)).toBe(1)
    expect(dayNumber(LAUNCH_UTC - 5 * DAY)).toBe(1)
  })
  it('자정 경계: 23:59:59.999Z까지 같은 날, 00:00:00.000Z에 다음 날', () => {
    expect(dayNumber(LAUNCH_UTC + DAY - 1)).toBe(1)
    expect(dayNumber(LAUNCH_UTC + DAY)).toBe(2)
    expect(dayNumber(LAUNCH_UTC + 41 * DAY + 3_600_000)).toBe(42)
  })
})

describe('데일리 풀', () => {
  it('30개, id 유일(d-001…), 결정적', () => {
    expect(DAILY_POOL.length).toBe(30)
    expect(DAILY_POOL[0].id).toBe('d-001')
    expect(new Set(DAILY_POOL.map((l) => l.id)).size).toBe(30)
    expect(dailyFor(1)).toBe(DAILY_POOL[0])
  })
  it('풀을 순환한다', () => {
    expect(dailyFor(31)).toBe(DAILY_POOL[0])
    expect(dailyFor(60)).toBe(DAILY_POOL[29])
  })
  it('연속한 날은 다른 원본 레벨에서 나온다', () => {
    for (let i = 1; i < DAILY_POOL.length; i++) expect(DAILY_POOL[i].title === DAILY_POOL[i - 1].title, `${i}`).toBe(false)
  })
})
