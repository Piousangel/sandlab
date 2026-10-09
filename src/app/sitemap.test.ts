import { describe, it, expect } from 'vitest'
import sitemap from './sitemap'
import { SITE } from '@/lib/site'

describe('sitemap', () => {
  const urls = sitemap().map((e) => e.url)
  it('콘텐츠 페이지를 모두 담는다', () => {
    for (const p of ['', '/gallery', '/materials', '/materials/lava', '/materials/water', '/about', '/privacy']) {
      expect(urls).toContain(`${SITE}${p}`)
    }
  })
  it('empty 재료 페이지와 중복 URL이 없다', () => {
    expect(urls).not.toContain(`${SITE}/materials/empty`)
    expect(new Set(urls).size).toBe(urls.length)
  })
})
