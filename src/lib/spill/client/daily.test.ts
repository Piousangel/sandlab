import { describe, it, expect } from 'vitest'
import { DAILY_POOL_IDS, LAUNCH_UTC, dailyIdFor, dayNumber, shareText } from './daily'
import { LEVELS } from '../levels'

const DAY = 86_400_000

describe('Spill 데일리', () => {
  it('번호 체계는 옛 데일리와 같다(#1 = 2026-10-09 UTC)', () => {
    expect(dayNumber(LAUNCH_UTC)).toBe(1)
    expect(dayNumber(LAUNCH_UTC + DAY - 1)).toBe(1)
    expect(dayNumber(LAUNCH_UTC + DAY)).toBe(2)
  })
  it('풀의 모든 id가 실제 레벨이다', () => {
    for (const id of DAILY_POOL_IDS) expect(LEVELS.some((l) => l.id === id), id).toBe(true)
  })
  it('연속한 날은 다른 레벨이고 한 바퀴에 풀 전체를 돈다', () => {
    const len = DAILY_POOL_IDS.length
    const seen = new Set<string>()
    for (let n = 1; n <= len; n++) {
      seen.add(dailyIdFor(n))
      expect(dailyIdFor(n)).not.toBe(dailyIdFor(n + 1))
    }
    expect(seen.size).toBe(len)
    expect(dailyIdFor(1)).toBe(dailyIdFor(1 + len))
  })
  it('같은 번호는 항상 같은 레벨', () => {
    expect(dailyIdFor(39)).toBe(dailyIdFor(39))
  })
  it('공유 문구에 번호·별·수·링크', () => {
    expect(shareText(39, 2, 1, '1-4')).toBe('Sandlab Daily #39 (1-4) ⭐⭐ 1 move\nhttps://sandlab.app/daily')
  })
})
