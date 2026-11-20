import { describe, expect, it } from 'vitest'
import { classifyLanding, LANDING_REFS } from './landing'

const own = 'sandlab.app'
describe('classifyLanding', () => {
  it('?ref= 태그가 referrer보다 우선', () => {
    expect(classifyLanding('?ref=bluesky', 'https://bsky.app/', own)).toBe('tag-bluesky')
    expect(classifyLanding('?ref=Reddit', '', own)).toBe('tag-reddit')
    expect(classifyLanding('?ref=threads', 'https://www.threads.net/', own)).toBe('tag-threads')
  })
  it('모르는 태그는 tag-other(임의 문자열이 AE로 새지 않는다)', () => {
    expect(classifyLanding('?ref=zzz-<script>', '', own)).toBe('tag-other')
  })
  it('referrer 호스트를 묶음으로 분류', () => {
    expect(classifyLanding('', 'https://www.google.com/', own)).toBe('ref-google')
    expect(classifyLanding('', 'https://www.google.co.kr/search?q=x', own)).toBe('ref-google')
    expect(classifyLanding('', 'https://search.naver.com/', own)).toBe('ref-naver')
    expect(classifyLanding('', 'https://t.co/abc', own)).toBe('ref-x')
    expect(classifyLanding('', 'https://news.ycombinator.com/', own)).toBe('ref-hn')
    expect(classifyLanding('', 'https://example.org/', own)).toBe('ref-other')
    expect(classifyLanding('', 'https://www.threads.net/@sandlab', own)).toBe('ref-threads')
    expect(classifyLanding('', 'https://l.threads.com/?u=x', own)).toBe('ref-threads')
    expect(classifyLanding('', 'https://notthreads.net/', own)).toBe('ref-other')
  })
  it('referrer 없음·불량은 direct, 내부 이동은 null', () => {
    expect(classifyLanding('', '', own)).toBe('direct')
    expect(classifyLanding('', 'not a url', own)).toBe('direct')
    expect(classifyLanding('', 'https://sandlab.app/play', own)).toBeNull()
  })
  it('모든 출력은 서버 화이트리스트 안', () => {
    for (const [s, r] of [['?ref=x', ''], ['', 'https://bing.com'], ['?ref=q', ''], ['', '']] as const) {
      expect(LANDING_REFS).toContain(classifyLanding(s, r, own))
    }
  })
})
