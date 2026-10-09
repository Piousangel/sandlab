import { describe, it, expect } from 'vitest'
import { guideMaterials } from './reactions'
import { COPY } from './copy'

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean)
const text = (slug: string) => {
  const c = COPY[slug]
  return [c.body.join(' '), c.tip, ...(c.experiments ?? []).flatMap((e) => [e.title, e.steps])].join(' ')
}
const grams = (s: string, n = 6) => {
  const w = words(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' '))
  const out = new Set<string>()
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '))
  return out
}

// AdSense "저가치/템플릿" 판정 방어선(2026-10-09 적대 감사): 개별 페이지는 충분히 길고, 재료끼리
// 문장·구절을 공유하지 않으며, 아직 없는 기능(챌린지)을 언급하지 않는다.
describe('재료 설명문', () => {
  it('가이드 대상 재료 전부에 설명문이 있고, 남는 키가 없다', () => {
    const slugs = guideMaterials().map((m) => m.slug).sort()
    expect(Object.keys(COPY).sort()).toEqual(slugs)
  })
  it('개별 페이지 재료는 본문 3문단+·실험 2개+·260단어+', () => {
    for (const [slug, c] of Object.entries(COPY).filter(([, c]) => c.page)) {
      expect(c.body.length, slug).toBeGreaterThanOrEqual(3)
      expect(c.experiments?.length ?? 0, slug).toBeGreaterThanOrEqual(2)
      expect(words(text(slug)).length, slug).toBeGreaterThanOrEqual(260)
    }
  })
  it('허브 전용 재료(page:false)도 70단어+', () => {
    for (const [slug, c] of Object.entries(COPY).filter(([, c]) => !c.page)) {
      expect(words(text(slug)).length, slug).toBeGreaterThanOrEqual(70)
      expect(c.summary.length, slug).toBeGreaterThan(20)
    }
  })
  it('재료끼리 6단어 구절을 공유하지 않는다(템플릿 문장 방지)', () => {
    const slugs = Object.keys(COPY)
    for (let i = 0; i < slugs.length; i++) {
      const a = grams(text(slugs[i]))
      for (let j = i + 1; j < slugs.length; j++) {
        const shared = [...grams(text(slugs[j]))].filter((g) => a.has(g))
        expect(shared, `${slugs[i]} ↔ ${slugs[j]}`).toEqual([])
      }
    }
  })
  it('없는 기능(challenge/puzzle)을 언급하지 않는다 — level은 수위 의미로 쓰여 제외', () => {
    for (const slug of Object.keys(COPY)) {
      expect(`${COPY[slug].summary} ${text(slug)}`, slug).not.toMatch(/\b(challenges?|puzzles?)\b/i)
    }
  })
})
