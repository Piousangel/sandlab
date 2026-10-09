import { describe, it, expect } from 'vitest'
import { materialStaticParams } from '@/lib/guide/reactions'
import { COPY } from '@/lib/guide/copy'

describe('materialStaticParams', () => {
  it('page:true 재료만 개별 페이지를 갖는다(empty·얇은 재료 제외)', () => {
    const slugs = materialStaticParams().map((p) => p.slug).sort()
    const expected = Object.entries(COPY).filter(([, c]) => c.page).map(([s]) => s).sort()
    expect(slugs).toEqual(expected)
    expect(slugs).not.toContain('empty')
    expect(slugs).not.toContain('wall')
    expect(slugs).toContain('lava')
  })
  it('slug는 소문자 알파벳만 (verify-ads.mjs 허용 정규식과 일치)', () => {
    for (const { slug } of materialStaticParams()) expect(slug).toMatch(/^[a-z]+$/)
  })
})
