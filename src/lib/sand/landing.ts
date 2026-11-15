/**
 * 유입 분류 — 첫 방문(세션당 1회)에 `landing` 이벤트로 보낸다.
 * 마케팅 게시 링크의 `?ref=<채널>` 태그가 우선이고, 없으면 document.referrer 호스트를 몇 개 묶음으로 분류한다.
 * 원시 호스트·쿼리는 AE로 보내지 않는다(카디널리티·개인정보): 아래 고정 값만 나간다.
 */
export const LANDING_TAGS = ['bluesky', 'x', 'reddit', 'hn', 'discord', 'mastodon'] as const
export const LANDING_REFERRERS = [
  'google', 'bing', 'duckduckgo', 'naver', 'daum', 'reddit', 'x', 'bluesky', 'facebook', 'youtube', 'hn', 'other',
] as const

/** worker/track.ts가 받아들이는 landing ref 전체. */
export const LANDING_REFS: readonly string[] = [
  ...LANDING_TAGS.map((t) => `tag-${t}`),
  'tag-other',
  ...LANDING_REFERRERS.map((r) => `ref-${r}`),
  'direct',
]

const HOST_CLASSES: [RegExp, (typeof LANDING_REFERRERS)[number]][] = [
  [/(^|\.)google\./, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)naver\.com$/, 'naver'],
  [/(^|\.)daum\.net$/, 'daum'],
  [/(^|\.)reddit\.com$/, 'reddit'],
  [/^(t\.co|(www\.)?(x|twitter)\.com)$/, 'x'],
  [/(^|\.)bsky\.app$/, 'bluesky'],
  [/(^|\.)(facebook|fb)\.com$|^l\.facebook\.com$/, 'facebook'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/^news\.ycombinator\.com$/, 'hn'],
]

/**
 * @returns landing ref. 같은 사이트 안 이동(내부 referrer)이면 null — 첫 진입이 아니므로 보내지 않는다.
 */
export function classifyLanding(search: string, referrer: string, ownHost: string): string | null {
  const tag = new URLSearchParams(search).get('ref')?.toLowerCase() ?? ''
  if (tag) return (LANDING_TAGS as readonly string[]).includes(tag) ? `tag-${tag}` : 'tag-other'
  if (!referrer) return 'direct'
  let host = ''
  try {
    host = new URL(referrer).hostname.toLowerCase()
  } catch {
    return 'direct'
  }
  if (host === ownHost) return null
  const hit = HOST_CLASSES.find(([re]) => re.test(host))
  return `ref-${hit ? hit[1] : 'other'}`
}
