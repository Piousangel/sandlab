import { describe, it, expect } from 'vitest'
import { TickRate } from './rate'
import { runStress } from './cases'
import { Sim } from '../sim/sim'

// 리뷰 S0 #5: S0 게이트는 "2x 유지"인데 HUD가 실제로 돈 틱/s를 안 보여 줬다.
describe('TickRate — 실제 틱/s와 배속 유지 판정', () => {
  it('1초 창에서 돈 틱 수로 틱/s를 낸다', () => {
    const r = new TickRate(1000)
    for (let t = 0; t <= 1000; t += 16) r.add(t, 2) // 프레임마다 2틱 ≈ 125 틱/s
    expect(r.ticksPerSec(1000)).toBeGreaterThan(118)
    expect(r.ticksPerSec(1000)).toBeLessThan(130)
  })

  it('목표(60×배속)의 95% 이상이면 유지, 아니면 아님', () => {
    const r = new TickRate(1000)
    for (let t = 0; t <= 1000; t += 16) r.add(t, 2)
    expect(r.held(1000, 2)).toBe(true)
    expect(r.held(1000, 4)).toBe(false)
  })

  it('창 밖의 오래된 기록은 버린다', () => {
    const r = new TickRate(1000)
    for (let t = 0; t <= 1000; t += 16) r.add(t, 4)
    for (let t = 1016; t <= 2100; t += 16) r.add(t, 1)
    expect(r.ticksPerSec(2100)).toBeLessThan(70)
  })

  it('창이 덜 찼으면(시작 직후) 판정하지 않는다', () => {
    const r = new TickRate(1000)
    r.add(0, 2); r.add(16, 2)
    expect(r.held(16, 2)).toBe(null)
  })
})

describe('runStress — 평균과 최악 1초 (리뷰 Minor #1)', () => {
  it('최악 1초(60틱 묶음) 비용을 따로 낸다', () => {
    let t = 0
    // 가짜 시계: 부를 때마다 1ms씩 흐른다
    const r = runStress(new Sim(), () => (t += 1), 120)
    expect(r.ticks).toBe(120)
    expect(r.avgMs).toBeGreaterThan(0)
    expect(r.worstSecMs).toBeGreaterThanOrEqual(r.avgMs)
  })
})
