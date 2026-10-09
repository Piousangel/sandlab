import { describe, it, expect } from 'vitest'
import { materialStaticParams } from '@/lib/guide/reactions'

describe('materialStaticParams', () => {
  it('empty 없이 가이드 재료 전부의 slug를 낸다', () => {
    const slugs = materialStaticParams().map((p) => p.slug)
    expect(slugs).not.toContain('empty')
    expect(slugs).toContain('lava')
    expect(slugs.length).toBe(18)
  })
  it('slug는 소문자 알파벳만 (verify-ads.mjs 허용 정규식과 일치)', () => {
    for (const { slug } of materialStaticParams()) expect(slug).toMatch(/^[a-z]+$/)
  })
})
