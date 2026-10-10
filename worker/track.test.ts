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

describe('parseTrack — S1 계측(gpu_unsupported · puzzle_land · share_click)', () => {
  it('gpu_unsupported·puzzle_land는 UA 분류(kakao|insta|other)를 ref로 싣는다', () => {
    for (const ev of ['gpu_unsupported', 'puzzle_land']) {
      for (const ua of ['kakao', 'insta', 'other']) {
        expect(parseTrack({ event: ev, ref: ua })).toEqual({ event: ev, ref: ua, value: 0 })
      }
    }
    expect(parseTrack({ event: 'gpu_unsupported', ref: 'other', value: 1 })?.value).toBe(1)
  })
  it('UA 분류 밖의 ref·ref 없음은 거부(원시 UA 문자열이 AE로 새지 않게)', () => {
    expect(parseTrack({ event: 'gpu_unsupported' })).toBeNull()
    expect(parseTrack({ event: 'gpu_unsupported', ref: 'chrome' })).toBeNull()
    expect(parseTrack({ event: 'puzzle_land', ref: 'Mozilla/5.0 KAKAOTALK' })).toBeNull()
  })
  it('share_click은 정해진 공유 지점만 ref로 허용', () => {
    for (const s of ['sandbox-link', 'sandbox-copy', 'sandbox-share', 'daily']) {
      expect(parseTrack({ event: 'share_click', ref: s })).toEqual({ event: 'share_click', ref: s, value: 0 })
    }
    expect(parseTrack({ event: 'share_click' })).toBeNull()
    expect(parseTrack({ event: 'share_click', ref: 'twitter' })).toBeNull()
  })
})
