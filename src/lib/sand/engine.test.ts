import { describe, it, expect } from 'vitest'
import { pickQuality } from './engine'

/** 적응형 품질 히스테리시스 — 저사양에서 블룸을 끄되 임계 부근 깜빡임을 막는다. */
describe('pickQuality (적응형 블룸 스킵)', () => {
  it('버벅이면(fps<38) 블룸을 끈다(lite=true)', () => {
    expect(pickQuality(30, false)).toBe(true)
    expect(pickQuality(37, false)).toBe(true)
  })

  it('여유되면(fps>52) 블룸을 복원한다(lite=false)', () => {
    expect(pickQuality(60, true)).toBe(false)
    expect(pickQuality(53, true)).toBe(false)
  })

  it('중간대(38~52)는 현 상태를 유지한다(히스테리시스)', () => {
    expect(pickQuality(45, true)).toBe(true) // lite였으면 유지
    expect(pickQuality(45, false)).toBe(false) // full이었으면 유지
    expect(pickQuality(38, true)).toBe(true) // 경계: 38은 <38 아님 → 유지
    expect(pickQuality(52, false)).toBe(false) // 경계: 52는 >52 아님 → 유지
  })

  it('측정 전(fps<=0)엔 현 상태를 유지한다', () => {
    expect(pickQuality(0, false)).toBe(false)
    expect(pickQuality(0, true)).toBe(true)
  })

  it('깜빡임 방지: 40fps 근처를 오가도 티어가 튀지 않는다', () => {
    let lite = false
    for (const fps of [50, 45, 42, 46, 44, 48]) lite = pickQuality(fps, lite) // 전부 중간대
    expect(lite).toBe(false) // 한 번도 38 밑/52 위로 안 갔으니 full 유지
    lite = pickQuality(35, lite) // 확실히 버벅 → lite
    expect(lite).toBe(true)
    for (const fps of [40, 44, 48, 50]) lite = pickQuality(fps, lite) // 애매하게 회복
    expect(lite).toBe(true) // 52 넘기 전엔 lite 유지(깜빡임 방지)
    expect(pickQuality(55, lite)).toBe(false) // 확실히 여유 → 복원
  })
})
