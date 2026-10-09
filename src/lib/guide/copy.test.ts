import { describe, it, expect } from 'vitest'
import { guideMaterials } from './reactions'
import { COPY } from './copy'

const words = (s: string) => s.trim().split(/\s+/).length

describe('재료 설명문', () => {
  it('가이드 대상 재료 전부에 설명문이 있고, 남는 키가 없다', () => {
    const slugs = guideMaterials().map((m) => m.slug).sort()
    expect(Object.keys(COPY).sort()).toEqual(slugs)
  })
  it('각 설명문은 summary 1문장 + 본문 2문단 이상 + tip, 합계 90단어 이상', () => {
    for (const [slug, c] of Object.entries(COPY)) {
      expect(c.summary.length, slug).toBeGreaterThan(20)
      expect(c.body.length, slug).toBeGreaterThanOrEqual(2)
      expect(c.tip.length, slug).toBeGreaterThan(20)
      const total = words(c.summary) + c.body.reduce((n, p) => n + words(p), 0) + words(c.tip)
      expect(total, slug).toBeGreaterThanOrEqual(90)
    }
  })
  it('설명문끼리 문단이 겹치지 않는다(템플릿 복붙 방지)', () => {
    const seen = new Set<string>()
    for (const c of Object.values(COPY)) {
      for (const p of c.body) {
        expect(seen.has(p)).toBe(false)
        seen.add(p)
      }
    }
  })
})
