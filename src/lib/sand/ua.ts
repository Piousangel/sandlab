/**
 * 인앱 브라우저 분류 — 계측 ref(gpu_unsupported·puzzle_land)와 WebGPU 폴백 안내 문구가 같이 쓴다.
 * 원시 UA 문자열은 AE로 보내지 않는다(카디널리티·개인정보). 이 세 값만 나간다.
 */
export const UA_CLASSES = ['kakao', 'insta', 'other'] as const
export type UaClass = (typeof UA_CLASSES)[number]

export function uaClass(ua: string): UaClass {
  if (/KAKAOTALK/i.test(ua)) return 'kakao'
  if (/Instagram/i.test(ua)) return 'insta'
  return 'other'
}

/** 브라우저에서 현재 UA 분류. SSR(navigator 없음)에선 other. */
export function currentUaClass(): UaClass {
  return typeof navigator === 'undefined' ? 'other' : uaClass(navigator.userAgent || '')
}

/** share_click이 허용하는 공유 지점 — 버튼마다 고정 문자열. */
export const SHARE_SURFACES = ['sandbox-link', 'sandbox-copy', 'sandbox-share', 'daily'] as const
export type ShareSurface = (typeof SHARE_SURFACES)[number]
