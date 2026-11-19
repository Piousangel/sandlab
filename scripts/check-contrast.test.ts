import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkPairs, composite, contrast, FORBIDDEN, parseColor, parseTokens, PAIRS, TOKENS_CSS } from './check-contrast.mjs'

describe('check-contrast', () => {
  it('WCAG 기준값을 재현한다(흑/백 21:1, 같은 색 1:1, #767676/백 ≈4.54)', () => {
    const w = parseColor('#fff')!
    const k = parseColor('#000000')!
    expect(contrast(k, w)).toBeCloseTo(21, 5)
    expect(contrast(w, w)).toBeCloseTo(1, 5)
    expect(contrast(parseColor('#767676')!, w)).toBeCloseTo(4.54, 2)
  })

  it('rgba를 배경에 합성한다', () => {
    const c = composite(parseColor('rgba(0, 0, 0, .5)')!, parseColor('#ffffff')!)
    expect(c.r).toBeCloseTo(127.5)
    expect(parseColor('var(--x)')).toBeNull()
  })

  it('주석을 무시하고 첫 선언을 쓴다', () => {
    const t = parseTokens(':root{ /* --sl-a: #000; */ --sl-a: #111; --sl-b: rgba(1,2,3,.5); }\n:root{--sl-a:#222;}')
    expect(t).toEqual({ a: '#111', b: 'rgba(1,2,3,.5)' })
  })

  it('기준 미달 쌍을 잡아낸다', () => {
    const rows = checkPairs({ fg: '#777777', bg: '#ffffff' }, [['fg', 'bg', 4.5, 't']])
    expect(rows[0].ok).toBe(false)
    expect(() => checkPairs({}, [['nope', 'bg', 3, 't']])).toThrow(/없음/)
  })

  it('실제 tokens.css의 필수 쌍이 전부 통과한다(S1·S2)', () => {
    const tokens = parseTokens(readFileSync(TOKENS_CSS, 'utf8'))
    expect(tokens.ember).toBe('#C4520F')
    expect(tokens['tube-line']).toBe('rgba(42, 33, 24, 0.58)')
    const rows = checkPairs(tokens)
    const need = ['ink/bone', 'ink-2/bone', 'ink-2/bone-2', 'on-ember/ember', 'ember-text/bone', 'tube-line/bone']
    for (const n of need) expect(rows.map((r) => `${r.fg}/${r.bg}`)).toContain(n)
    expect(rows.filter((r) => !r.ok)).toEqual([])
    expect(rows.length).toBe(PAIRS.length)
  })

  it('금지 조합(ember-text / bone-2)은 실제로 미달이다 — 문서 규칙의 근거', () => {
    const tokens = parseTokens(readFileSync(TOKENS_CSS, 'utf8'))
    const [r] = checkPairs(tokens, FORBIDDEN)
    expect(r.ok).toBe(false)
    expect(r.ratio).toBeCloseTo(4.43, 2)
  })
})
