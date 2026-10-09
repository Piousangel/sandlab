import { describe, it, expect } from 'vitest'
import { ARTICLES, articleBySlug } from './articles'

const words = (a: (typeof ARTICLES)[number]) =>
  a.sections.flatMap((s) => [s.heading, ...s.paragraphs]).join(' ').split(/\s+/).filter(Boolean).length

describe('learn 기사', () => {
  it('세 편이 있고 slug가 유일하며 URL-safe하다', () => {
    const slugs = ARTICLES.map((a) => a.slug)
    expect(slugs).toEqual(expect.arrayContaining(['margolus-falling-sand', 'materials-as-data', 'history-of-falling-sand-games']))
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/)
  })
  it('각 기사는 900단어 이상, 설명 155자 이하, 날짜 형식, 출처 있음', () => {
    for (const a of ARTICLES) {
      expect(words(a), a.slug).toBeGreaterThanOrEqual(900)
      expect(a.description.length, a.slug).toBeLessThanOrEqual(155)
      expect(a.published, a.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(a.updated >= a.published, a.slug).toBe(true)
      expect(a.sources.length, a.slug).toBeGreaterThan(0)
    }
  })
  it('자리표시자·미완성 흔적이 없다', () => {
    for (const a of ARTICLES) {
      const all = JSON.stringify(a)
      expect(all, a.slug).not.toMatch(/\[maker name\]|\[date\]|TODO|TBD|lorem/i)
    }
  })
  it('articleBySlug는 없는 slug에 undefined', () => {
    expect(articleBySlug('nope')).toBeUndefined()
    expect(articleBySlug('materials-as-data')?.title).toBeTruthy()
  })
})
