import { describe, it, expect } from 'vitest'
import { validateDaily, summarize } from './daily'
import { dailyFor, LAUNCH_UTC } from '../src/lib/challenge/daily'
import { starsFor } from '../src/lib/challenge/clear'

const DAY = 86_400_000
const now = LAUNCH_UTC + 4 * DAY + 3_600_000 // 데일리 #5
const lvl = dailyFor(5)
const budget = Object.values(lvl.palette).reduce((a, b) => a + b, 0)
const ok = { day: 5, levelId: lvl.id, ink: lvl.stars[0], stars: 3 }

describe('validateDaily', () => {
  it('정상 제출', () => {
    expect(validateDaily(ok, now)).toEqual({ day: 5, levelId: lvl.id, ink: lvl.stars[0], stars: 3 })
  })
  it('서버 기준 오늘 ±1일만(시간대 경계 허용)', () => {
    expect(validateDaily({ ...ok, day: 4, levelId: dailyFor(4).id, ink: dailyFor(4).stars[0] }, now)).not.toBeNull()
    expect(validateDaily({ ...ok, day: 6, levelId: dailyFor(6).id, ink: dailyFor(6).stars[0] }, now)).not.toBeNull()
    expect(validateDaily({ ...ok, day: 3, levelId: dailyFor(3).id, ink: dailyFor(3).stars[0] }, now)).toBeNull()
  })
  it('그날의 레벨이 아니면 거부', () => {
    expect(validateDaily({ ...ok, levelId: dailyFor(6).id }, now)).toBeNull()
  })
  it('잉크는 1..예산합 정수, 별은 잉크로 계산한 값과 일치해야 한다', () => {
    expect(validateDaily({ ...ok, ink: 0 }, now)).toBeNull()
    expect(validateDaily({ ...ok, ink: budget + 1 }, now)).toBeNull()
    expect(validateDaily({ ...ok, ink: 12.5 }, now)).toBeNull()
    expect(validateDaily({ ...ok, ink: lvl.stars[1] + 1, stars: 3 }, now)).toBeNull()
    const ink = lvl.stars[1] + 1
    if (ink <= budget) expect(validateDaily({ ...ok, ink, stars: starsFor(ink, lvl.stars) }, now)).not.toBeNull()
  })
  it('형식이 틀린 본문은 null', () => {
    expect(validateDaily(null, now)).toBeNull()
    expect(validateDaily({ day: '5' }, now)).toBeNull()
  })
})

describe('summarize', () => {
  it('백분위·별 분포', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ ink: (i + 1) * 10, stars: i < 50 ? 3 : i < 80 ? 2 : 1 }))
    expect(summarize(rows)).toEqual({ clears: 100, inkPercentiles: [100, 250, 500, 750, 900], stars: [20, 30, 50] })
  })
  it('빈 결과', () => {
    expect(summarize([])).toEqual({ clears: 0, inkPercentiles: [], stars: [0, 0, 0] })
  })
})
