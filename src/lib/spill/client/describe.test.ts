import { describe, it, expect } from 'vitest'
import { describeLevel, goalText, verbText } from './describe'
import { POT_LEVEL, GATE_LEVEL, BAD_LEVEL, PROTECT_LEVEL } from '../play/fixtures'

describe('describeLevel (정적 SEO 텍스트·목표 목록)', () => {
  it('목표 문장', () => {
    expect(goalText({ id: 'a', kind: 'fill', rect: [0, 0, 2, 2], mat: 'water', need: 400 })).toBe('Fill the pot with 400 cells of water')
    expect(goalText({ id: 'a', kind: 'ignite', rect: [0, 0, 2, 2] })).toBe('Light the torch')
    expect(goalText({ id: 'a', kind: 'reach', rect: [0, 0, 2, 2], mat: 'sand' })).toBe('Ring the bell with sand')
    expect(goalText({ id: 'a', kind: 'reach', rect: [0, 0, 2, 2] })).toBe('Ring the bell with steam')
    expect(goalText({ id: 'a', kind: 'protect', rect: [0, 0, 2, 2], holdTicks: 300 })).toBe('Keep the crate intact for 5.0s')
    expect(goalText({ id: 'a', kind: 'bad', rect: [0, 0, 2, 2], mat: 'water', need: 20 })).toBe('Keep water out of the skull pot')
  })
  it('동사 설명', () => {
    expect(verbText(POT_LEVEL)).toEqual([expect.stringContaining('Dig')])
    expect(verbText(GATE_LEVEL).some((s) => s.startsWith('Trigger'))).toBe(true)
  })
  it('레벨 요약: 이름·목표·par·재료가 들어간다', () => {
    const d = describeLevel(POT_LEVEL)
    expect(d.goals).toEqual(['Fill the pot with 400 cells of water'])
    expect(d.materials).toContain('water')
    expect(d.materials).toContain('dirt')
    expect(d.materials).not.toContain('empty')
    expect(d.summary).toContain('Test Pot')
    expect(d.par).toBe('Par: 1 move in 6.0s')
    expect(d.summary.length).toBeGreaterThan(120)
  })
  it('bad 타깃은 목표 목록에서 경고로 따로', () => {
    const d = describeLevel(BAD_LEVEL)
    expect(d.goals).toEqual(['Fill the pot with 400 cells of water'])
    expect(d.warnings).toEqual(['Keep water out of the skull pot'])
  })
  it('protect', () => {
    expect(describeLevel(PROTECT_LEVEL).goals[0]).toContain('crate')
  })
})
