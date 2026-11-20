import { describe, it, expect } from 'vitest'
import { parseDevice, parseTrack } from './track'

describe('parseTrack — /api/track 화이트리스트', () => {
  it('kofi_click은 ref 없이 허용', () => {
    expect(parseTrack({ event: 'kofi_click' })).toEqual({ event: 'kofi_click', ref: '', value: 0 })
  })
  it('챌린지 이벤트는 levelId(ref)와 잉크(value)를 싣는다', () => {
    expect(parseTrack({ event: 'challenge_clear', ref: 'fill-cup', value: 9294 })).toEqual({ event: 'challenge_clear', ref: 'fill-cup', value: 9294 })
    expect(parseTrack({ event: 'challenge_start', ref: 'lava-bridge' })).toEqual({ event: 'challenge_start', ref: 'lava-bridge', value: 0 })
    expect(parseTrack({ event: 'challenge_reset', ref: 'd-001' })?.ref).toBe('d-001')
    expect(parseTrack({ event: 'daily_start', ref: '1-4' })?.event).toBe('daily_start')
    expect(parseTrack({ event: 'daily_clear', ref: 'Bad Ref' })).toBeNull()
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

describe('parseTrack — landing(유입 분류)', () => {
  it('고정 분류만 허용', () => {
    for (const r of ['tag-bluesky', 'tag-other', 'ref-google', 'ref-other', 'direct']) {
      expect(parseTrack({ event: 'landing', ref: r })).toEqual({ event: 'landing', ref: r, value: 0 })
    }
  })
  it('임의 호스트·태그·ref 없음은 거부(카디널리티 보호)', () => {
    expect(parseTrack({ event: 'landing', ref: 'evil.example.com' })).toBeNull()
    expect(parseTrack({ event: 'landing', ref: 'tag-whatever' })).toBeNull()
    expect(parseTrack({ event: 'landing' })).toBeNull()
  })
})

describe('parseTrack — S1 value는 화면 코드만(리뷰 5)', () => {
  it('gpu_unsupported value는 0(홈)·1(퍼즐)만, 그 밖은 거부', () => {
    expect(parseTrack({ event: 'gpu_unsupported', ref: 'kakao', value: 0 })?.value).toBe(0)
    expect(parseTrack({ event: 'gpu_unsupported', ref: 'kakao', value: 1 })?.value).toBe(1)
    expect(parseTrack({ event: 'gpu_unsupported', ref: 'kakao', value: 5 })).toBeNull()
    expect(parseTrack({ event: 'gpu_unsupported', ref: 'kakao', value: 9294 })).toBeNull()
  })
  it('puzzle_land value는 0만, 그 밖은 거부', () => {
    expect(parseTrack({ event: 'puzzle_land', ref: 'insta' })?.value).toBe(0)
    expect(parseTrack({ event: 'puzzle_land', ref: 'insta', value: 1 })).toBeNull()
  })
})

describe('북극성 계측(11-20) — first_stroke · landing 홈 표시 · 기기 id', () => {
  it('first_stroke는 ref home만, value는 1(홈 landing 세션)·0만', () => {
    expect(parseTrack({ event: 'first_stroke', ref: 'home' })).toEqual({ event: 'first_stroke', ref: 'home', value: 0 })
    expect(parseTrack({ event: 'first_stroke', ref: 'home', value: 1 })?.value).toBe(1)
    expect(parseTrack({ event: 'first_stroke', ref: 'home', value: 999 })?.value).toBe(0)
    expect(parseTrack({ event: 'first_stroke' })).toBeNull()
    expect(parseTrack({ event: 'first_stroke', ref: 'gallery' })).toBeNull()
  })
  it('landing value는 1(홈 진입)만 살리고 나머지는 0 — 옛 클라이언트(value 없음)도 받는다', () => {
    expect(parseTrack({ event: 'landing', ref: 'direct', value: 1 })?.value).toBe(1)
    expect(parseTrack({ event: 'landing', ref: 'direct' })?.value).toBe(0)
    expect(parseTrack({ event: 'landing', ref: 'direct', value: 7 })?.value).toBe(0)
    expect(parseTrack({ event: 'landing', ref: 'tag-threads', value: 1 })).toEqual({ event: 'landing', ref: 'tag-threads', value: 1 })
    expect(parseTrack({ event: 'landing', ref: 'ref-threads' })?.ref).toBe('ref-threads')
  })
  it('parseDevice: UUID·폴백 형식만, 그 밖은 빈 값(원시 문자열이 AE로 새지 않는다)', () => {
    expect(parseDevice({ event: 'x', d: '3f2b8c1e-9a4d-4e7b-8c2a-1b2c3d4e5f60' })).toBe('3f2b8c1e-9a4d-4e7b-8c2a-1b2c3d4e5f60')
    expect(parseDevice({ d: 'm3x9k2-ab12cd34ef' })).toBe('m3x9k2-ab12cd34ef')
    expect(parseDevice({ d: 'short' })).toBe('')
    expect(parseDevice({ d: 'x'.repeat(41) })).toBe('')
    expect(parseDevice({ d: 'Mozilla/5.0 (iPhone)' })).toBe('')
    expect(parseDevice({ d: 'user@example.com' })).toBe('')
    expect(parseDevice({ d: 12345678 })).toBe('')
    expect(parseDevice({})).toBe('')
    expect(parseDevice(null)).toBe('')
  })
  it('봇 UA(JS 실행 크롤러·헤드리스)는 기기 id를 버린다 — 렌더마다 새 id로 북극성이 부풀지 않게', () => {
    const d = '3f2b8c1e-9a4d-4e7b-8c2a-1b2c3d4e5f60'
    expect(parseDevice({ d }, 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe('')
    expect(parseDevice({ d }, 'Mozilla/5.0 HeadlessChrome/120.0')).toBe('')
    expect(parseDevice({ d }, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')).toBe(d)
  })
  it('기기 id가 있어도 parseTrack 판정은 그대로(이벤트 화이트리스트가 우선)', () => {
    expect(parseTrack({ event: 'pageview', d: '3f2b8c1e-9a4d-4e7b-8c2a-1b2c3d4e5f60' })).toBeNull()
    expect(parseTrack({ event: 'kofi_click', d: 'bad id!' })).toEqual({ event: 'kofi_click', ref: '', value: 0 })
  })
})
