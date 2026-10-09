import { describe, it, expect } from 'vitest'
import { parseTrack } from './track'

describe('parseTrack — /api/track 화이트리스트', () => {
  it('kofi_click은 ref 없이 허용', () => {
    expect(parseTrack({ event: 'kofi_click' })).toEqual({ event: 'kofi_click', ref: '', value: 0 })
  })
  it('챌린지 이벤트는 levelId(ref)와 잉크(value)를 싣는다', () => {
    expect(parseTrack({ event: 'challenge_clear', ref: 'fill-cup', value: 9294 })).toEqual({ event: 'challenge_clear', ref: 'fill-cup', value: 9294 })
    expect(parseTrack({ event: 'challenge_start', ref: 'lava-bridge' })).toEqual({ event: 'challenge_start', ref: 'lava-bridge', value: 0 })
    expect(parseTrack({ event: 'challenge_reset', ref: 'd-001' })?.ref).toBe('d-001')
  })
  it('챌린지 이벤트에 ref가 없거나 형식이 틀리면 거부(AE 카디널리티 보호)', () => {
    expect(parseTrack({ event: 'challenge_start' })).toBeNull()
    expect(parseTrack({ event: 'challenge_start', ref: 'Fill Cup' })).toBeNull()
    expect(parseTrack({ event: 'challenge_start', ref: 'x'.repeat(41) })).toBeNull()
  })
  it('value는 0..1e7 정수만, 아니면 0', () => {
    expect(parseTrack({ event: 'challenge_clear', ref: 'a', value: -5 })?.value).toBe(0)
    expect(parseTrack({ event: 'challenge_clear', ref: 'a', value: 1.5 })?.value).toBe(0)
    expect(parseTrack({ event: 'challenge_clear', ref: 'a', value: 1e8 })?.value).toBe(0)
    expect(parseTrack({ event: 'challenge_clear', ref: 'a', value: '9' })?.value).toBe(0)
  })
  it('모르는 이벤트·잘못된 본문은 null', () => {
    expect(parseTrack({ event: 'pageview' })).toBeNull()
    expect(parseTrack(null)).toBeNull()
    expect(parseTrack('kofi_click')).toBeNull()
  })
})
