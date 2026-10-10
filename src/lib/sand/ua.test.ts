import { describe, it, expect } from 'vitest'
import { uaClass } from './ua'

describe('uaClass — 인앱 브라우저 분류(계측 ref·WebGPU 폴백 안내)', () => {
  it('카카오톡 인앱(안드로이드·iOS)은 kakao', () => {
    expect(uaClass('Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36;KAKAOTALK 2410720')).toBe('kakao')
    expect(uaClass('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.5')).toBe('kakao')
  })
  it('인스타그램 인앱은 insta', () => {
    expect(uaClass('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.34.91')).toBe('insta')
  })
  it('그 외(크롬·사파리·빈 문자열)는 other', () => {
    expect(uaClass('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36')).toBe('other')
    expect(uaClass('')).toBe('other')
  })
})
