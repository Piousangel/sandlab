import { describe, it, expect } from 'vitest'
import { gpuAdvice } from './gpuAdvice'

const UA = {
  iosSafari18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
  iosSafari26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iosChrome17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
  iosChrome18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
  iosKakao17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.5',
  iosKakao18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.5',
  androidKakao: 'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36;KAKAOTALK 2410720',
  iosInsta17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.34.91',
  androidInsta: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 345.0.0.34.91 Android',
  androidChrome130: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  androidChrome110: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36',
  winChrome130: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  winEdge130: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  macSafari18: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
}

const says = (ua: string) => {
  const a = gpuAdvice(ua)
  return `${a.heading} ${a.body}`
}

describe('gpuAdvice — 이미 쓰는 브라우저로 다시 가라고 하지 않는다(리뷰 2)', () => {
  it('iOS 26 미만 Safari·Chrome은 "iOS 업데이트" 안내(Safari/Chrome으로 열라고 하지 않음)', () => {
    for (const ua of [UA.iosSafari18, UA.iosChrome17, UA.iosChrome18]) {
      const a = gpuAdvice(ua)
      expect(a.kind).toBe('ios-update')
      expect(says(ua)).toMatch(/iOS 26/)
      expect(says(ua)).not.toMatch(/Open .*(in|with) (Chrome|Safari)/i)
    }
  })
  it('iOS 26 Safari에서 실패하면 업데이트가 아니라 "이 기기에서 시작 못 함"', () => {
    const a = gpuAdvice(UA.iosSafari26)
    expect(a.kind).toBe('blocked-here')
    expect(says(UA.iosSafari26)).not.toMatch(/update (your )?iPhone|iOS 26 or later/i)
  })
  it('최신 Chrome·Edge(안드로이드·데스크톱)는 "다른 브라우저로 열기"가 아니라 기기·설정 문제', () => {
    for (const ua of [UA.androidChrome130, UA.winChrome130, UA.winEdge130]) {
      expect(gpuAdvice(ua).kind).toBe('blocked-here')
      expect(says(ua)).not.toMatch(/Open .* in (a recent )?Chrome/i)
    }
  })
  it('오래된 Chrome은 업데이트 안내', () => {
    expect(gpuAdvice(UA.androidChrome110).kind).toBe('browser-update')
  })
  it('macOS Safari 26 미만은 Safari 업데이트(또는 Chrome) 안내', () => {
    const a = gpuAdvice(UA.macSafari18)
    expect(a.kind).toBe('browser-update')
    expect(says(UA.macSafari18)).toMatch(/Safari 26/)
  })
  it('카톡 인앱: iOS 버전이 확실히 낮으면 외부 브라우저로 보내지 않고 업데이트 안내', () => {
    expect(gpuAdvice(UA.iosKakao17).kind).toBe('ios-update')
    expect(gpuAdvice(UA.iosInsta17).kind).toBe('ios-update')
  })
  it('카톡 인앱: 안드로이드·버전 불명 iOS는 외부 브라우저 안내, iOS는 iOS 26 조건을 본문에 적는다', () => {
    expect(gpuAdvice(UA.androidKakao).kind).toBe('kakao')
    const ios = gpuAdvice(UA.iosKakao18)
    expect(ios.kind).toBe('kakao')
    expect(ios.body).toMatch(/iOS 26/)
  })
  it('인스타 인앱(안드로이드)은 insta', () => {
    expect(gpuAdvice(UA.androidInsta).kind).toBe('insta')
  })
  it('파이어폭스·삼성 인터넷·빈 UA는 다른 브라우저 안내', () => {
    for (const ua of [UA.firefox, UA.samsung, '']) expect(gpuAdvice(ua).kind).toBe('other-browser')
  })
  it('모든 안내에 제목과 본문이 있다', () => {
    for (const ua of Object.values(UA)) {
      const a = gpuAdvice(ua)
      expect(a.heading.length).toBeGreaterThan(0)
      expect(a.body.length).toBeGreaterThan(0)
    }
  })
})
