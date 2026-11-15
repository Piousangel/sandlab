'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/sand/gallery'
import { classifyLanding } from '@/lib/sand/landing'

/** 세션당 1회 `landing` 이벤트 — 유입 채널(?ref= 태그·referrer 분류)을 AE에 남긴다. 화면에는 아무것도 그리지 않는다. */
export default function LandingBeacon() {
  useEffect(() => {
    try {
      if (new URLSearchParams(location.search).get('autoplay')) return // 검증용 자동 플레이는 계측하지 않는다
      if (sessionStorage.getItem('sl-landing')) return
      sessionStorage.setItem('sl-landing', '1')
      const ref = classifyLanding(location.search, document.referrer, location.hostname)
      if (ref) trackEvent('landing', ref)
    } catch {
      /* 저장소 차단·계측 실패는 무시 */
    }
  }, [])
  return null
}
