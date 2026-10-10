/**
 * WebGPU 폴백 안내(스펙 §9 S1 ③) — 방문자가 이미 쓰는 브라우저로 "다시 열라"고 하지 않는다.
 * iOS는 모든 브라우저가 WebKit이라 브라우저를 바꿔도 소용없고, WebGPU는 iOS 26부터다 → iOS 업데이트 안내.
 * 주의: iOS 26부터 UA의 OS 버전은 18_6으로 고정된다. 그래서 Safari 버전(Version/NN)을 우선 보고,
 * OS 토큰은 18 미만일 때만 "확실히 낮음"으로 쓴다. 버전을 모르면 단정하지 않는다.
 */
import { uaClass } from './ua'

export type GpuAdviceKind = 'kakao' | 'insta' | 'ios-update' | 'browser-update' | 'blocked-here' | 'other-browser'

export interface GpuAdvice {
  kind: GpuAdviceKind
  heading: string
  body: string
}

const num = (ua: string, re: RegExp): number | null => {
  const m = ua.match(re)
  return m ? Number(m[1]) : null
}

const IOS_UPDATE: GpuAdvice = {
  kind: 'ios-update',
  heading: 'Sandlab needs iOS 26 or later',
  body:
    'Every iPhone and iPad browser runs on the same engine, and it gets WebGPU in iOS 26. ' +
    'Update in Settings → General → Software Update, or copy the link and open it on a computer.',
}

const BLOCKED_HERE: GpuAdvice = {
  kind: 'blocked-here',
  heading: 'WebGPU couldn’t start on this device',
  body:
    'Your browser supports WebGPU, but it’s switched off here or your graphics driver isn’t supported. ' +
    'Update the browser and system, or copy the link and open it on another device.',
}

const OTHER_BROWSER: GpuAdvice = {
  kind: 'other-browser',
  heading: 'Open Sandlab in Chrome, Edge or Safari',
  body: 'The sandbox runs on your graphics card through WebGPU, and this browser doesn’t provide it.',
}

export function gpuAdvice(ua: string): GpuAdvice {
  const ios = /iPhone|iPad|iPod/.test(ua)
  const safariVer = num(ua, /Version\/(\d+)/)
  const iosOs = ios ? num(ua, /OS (\d+)_/) : null
  // iOS 버전: 확실히 26 미만 / 확실히 26 이상 / 모름
  const iosKnownOld = ios && ((safariVer !== null && safariVer < 26) || (iosOs !== null && iosOs < 18))
  const iosKnownNew = ios && safariVer !== null && safariVer >= 26
  // 버전을 모르는 iOS(OS 18_x 고정값)는 iOS 18일 수도 26일 수도 있다
  const iosOldOrUnknown = ios && !iosKnownNew

  const app = uaClass(ua)
  if (app === 'kakao' || app === 'insta') {
    if (iosKnownOld) return IOS_UPDATE
    const name = app === 'kakao' ? 'KakaoTalk' : 'Instagram'
    return {
      kind: app,
      heading: 'Open Sandlab in your phone’s browser',
      body:
        `${name}’s in-app browser can’t run the sandbox. Open this page in ` +
        (ios ? 'Safari — your iPhone needs iOS 26 or later for it to work there.' : 'Chrome.'),
    }
  }

  if (ios) {
    if (iosOldOrUnknown) return IOS_UPDATE
    return {
      ...BLOCKED_HERE,
      body:
        'Safari supports WebGPU, but it’s switched off here. Check Settings → Apps → Safari → Advanced → ' +
        'Feature Flags → WebGPU, or copy the link and open it on another device.',
    }
  }

  if (/Firefox\//.test(ua) || /SamsungBrowser|OPR\/|UCBrowser|YaBrowser/.test(ua)) return OTHER_BROWSER

  const chrome = num(ua, /Chrome\/(\d+)/)
  if (chrome !== null) {
    // WebGPU: 데스크톱 Chrome/Edge 113+, 안드로이드 Chrome 121+
    const min = /Android/.test(ua) ? 121 : 113
    if (chrome < min) {
      return {
        kind: 'browser-update',
        heading: 'Update your browser to use Sandlab',
        body: `The sandbox needs WebGPU, which arrived in Chrome ${min}. Update the browser and reload this page.`,
      }
    }
    return BLOCKED_HERE
  }

  if (/Macintosh/.test(ua) && safariVer !== null) {
    if (safariVer < 26) {
      return {
        kind: 'browser-update',
        heading: 'Update Safari to use Sandlab',
        body: 'The sandbox needs WebGPU, which arrived in Safari 26 (macOS Tahoe). Update macOS, or open this page in Chrome.',
      }
    }
    return BLOCKED_HERE
  }

  return OTHER_BROWSER
}
