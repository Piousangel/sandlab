'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/sand/gallery'
import { classifyLanding } from '@/lib/sand/landing'
import { HOME_LANDING_KEY } from '@/lib/sand/measure'
import { VISIT_STORAGE_KEY, shouldSendVisit, utcDay } from '@/lib/visitors'

/** 오늘 방문자 비콘(오너 11-20) — 브라우저·UTC 날짜당 1회 POST /api/visit(localStorage, 값은 날짜뿐). 서버가 같은 날 같은 IP를 한 번만 센다. */
function sendVisit() {
  try {
    const now = Date.now()
    if (!shouldSendVisit(localStorage.getItem(VISIT_STORAGE_KEY), now, navigator.webdriver === true)) return
    localStorage.setItem(VISIT_STORAGE_KEY, utcDay(now))
    if (navigator.sendBeacon) navigator.sendBeacon('/api/visit')
    else fetch('/api/visit', { method: 'POST', keepalive: true }).catch(() => {})
  } catch {
    /* 저장소 차단·계측 실패는 무시 */
  }
}

/** 세션당 1회 `landing` 이벤트 — 유입 채널(?ref= 태그·referrer 분류)을 AE에 남긴다. 화면에는 아무것도 그리지 않는다.
 *  + 오늘 방문자 비콘(sendVisit). */
export default function LandingBeacon() {
  useEffect(() => {
    try {
      if (new URLSearchParams(location.search).get('autoplay')) return // 검증용 자동 플레이는 계측하지 않는다
      if (navigator.webdriver === true) return // QA·자동화 브라우저도 유입·첫 붓기율 분모에서 뺀다
      sendVisit()
      if (sessionStorage.getItem('sl-landing')) return
      sessionStorage.setItem('sl-landing', '1')
      const ref = classifyLanding(location.search, document.referrer, location.hostname)
      if (!ref) return
      const home = location.pathname === '/'
      if (home) sessionStorage.setItem(HOME_LANDING_KEY, '1') // first_stroke value 1의 근거(분자·분모 같은 세션)
      trackEvent('landing', ref, home ? 1 : 0) // value 1 = 홈 진입(첫 붓기율 분모)
    } catch {
      /* 저장소 차단·계측 실패는 무시 */
    }
  }, [])
  return null
}
