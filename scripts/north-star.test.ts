import { describe, expect, it } from 'vitest'
import { devicesSql, firstPourSql, northStarLines, TOUCH_EVENTS } from './north-star.mjs'

describe('north-star — 지표 파일 북극성 줄', () => {
  it('손댄 방문자는 첫 획·퍼즐 시작 이벤트에서 기기 id(blob5)로 센다', () => {
    const sql = devicesSql(TOUCH_EVENTS)
    expect(sql).toContain("(blob1 = 'first_stroke' OR blob1 = 'challenge_start' OR blob1 = 'daily_start')")
    expect(sql).toContain("blob5 != ''")
    expect(sql).toContain('GROUP BY d')
    expect(firstPourSql()).toContain("blob1 = 'landing' AND double2 = 1")
  })
  it('행 수 = 기기 수, 첫 붓기율은 first_stroke ÷ 홈 landing', () => {
    const lines = northStarLines({
      touched: [{ d: 'a' }, { d: 'b' }, { d: 'c' }],
      dailyClear: [{ d: 'a' }],
      pour: [{ event: 'first_stroke', n: '6' }, { event: 'landing', n: 10 }],
      since: '2026-11-01',
      today: '2026-11-21',
    })
    expect(lines[0]).toBe('북극성 — 주간 손댄 방문자(7일, 고유 기기): 3')
    expect(lines[1]).toBe('데일리 클리어 기기(7일): 1 · 첫 붓기율(7일, 세션): 60% (6/10)')
  })
  it('측정 7일 전이면 부분 값이라 적고, 홈 진입 0이면 비율을 지어내지 않는다', () => {
    const lines = northStarLines({ touched: [], dailyClear: [], pour: [], since: '2026-11-21', today: '2026-11-23' })
    expect(lines[0]).toContain('(부분: 측정 2026-11-21부터 2일치)')
    expect(lines[1]).toContain('— (홈 진입 0, 첫 획 0)')
  })
})
