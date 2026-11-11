import { describe, it, expect } from 'vitest'
import { GUIDES, guideFor, guideText, guideWords } from './guides'
import { LEVELS } from '../levels'
import { describeLevel } from '../client/describe'

const grams = (s: string, n = 6) => {
  const w = s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '))
  return out
}
const body = guideText

// AdSense '가치 없는 콘텐츠' 반려(2026-09-21) 방어선 — 공략은 레벨마다 고유하고 충분히 길어야 한다.
describe('레벨 공략', () => {
  it('모든 레벨에 공략이 있고, 없는 레벨을 가리키는 공략도 없다', () => {
    expect(GUIDES.map((g) => g.id).sort()).toEqual(LEVELS.map((l) => l.id).sort())
  })
  it('각 공략은 350단어+, 섹션 3개+, 설명 155자 이하, 날짜 형식', () => {
    for (const g of GUIDES) {
      expect(guideWords(g), g.id).toBeGreaterThanOrEqual(350)
      expect(g.sections.length, g.id).toBeGreaterThanOrEqual(3)
      expect(g.description.length, g.id).toBeLessThanOrEqual(155)
      expect(g.published, g.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(g.updated >= g.published, g.id).toBe(true)
    }
  })
  it('공략끼리 6단어 구절을 공유하지 않는다(템플릿 문장 방지)', () => {
    for (let i = 0; i < GUIDES.length; i++) {
      const a = grams(body(GUIDES[i]))
      for (let j = i + 1; j < GUIDES.length; j++) {
        const shared = [...grams(body(GUIDES[j]))].filter((x) => a.has(x))
        expect(shared, `${GUIDES[i].id} ↔ ${GUIDES[j].id}`).toEqual([])
      }
    }
  })
  it('힌트는 약한 것→강한 것 2단계이고 타일 좌표를 노출하지 않는다', () => {
    for (const g of GUIDES) {
      expect(g.hints[0].length, g.id).toBeLessThan(g.hints[1].length) // 약한 힌트가 더 짧다(순서 바뀜 방지의 최소선)
      expect(body(g), g.id).not.toMatch(/\(\s*\d+\s*,\s*\d+\s*\)|\btile \d+/i)
    }
  })
  it('같은 화면의 자동 문구(레벨 요약·인게임 힌트)를 옮겨 적지 않는다', () => {
    for (const g of GUIDES) {
      const l = LEVELS.find((x) => x.id === g.id)!
      const auto = grams(`${describeLevel(l).summary} ${l.hint ?? ''}`)
      expect([...grams(body(g))].filter((x) => auto.has(x)), g.id).toEqual([])
    }
  })
  it('자리표시자·미완성 흔적이 없다', () => {
    for (const g of GUIDES) expect(`${g.title} ${g.description} ${body(g)}`, g.id).not.toMatch(/TODO|TBD|lorem|\[[^\]]*\]/i)
  })
  it('guideFor는 없는 id에 undefined', () => {
    expect(guideFor('9-9')).toBeUndefined()
    expect(guideFor('1-1')?.id).toBe('1-1')
  })
})
