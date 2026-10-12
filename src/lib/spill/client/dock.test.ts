import { describe, it, expect } from 'vitest'
import { dockRows, dockMode, dockSummary } from './dock'
import { SpillController } from '../play/controller'
import { POT_LEVEL } from '../play/fixtures'

describe('트레이 아래 목표 독', () => {
  it('compact 요약은 남은 타깃 수·젬·par를 한 줄로', () => {
    const c = new SpillController(POT_LEVEL)
    const rows = dockRows(c.getState(), c.level.def)
    expect(dockSummary(rows)).toMatch(/^0\/\d+ (pot|pots|goal|goals)/)
  })
  it('타깃마다 진행/필요량과 래치 여부를 보여준다', () => {
    const c = new SpillController(POT_LEVEL)
    const rows = dockRows(c.getState(), c.level.def)
    const goals = rows.filter((r) => r.kind === 'goal')
    expect(goals.length).toBe(c.level.def.targets.filter((t) => t.kind !== 'bad').length)
    expect(goals[0].frac).toBe(0)
    expect(goals[0].done).toBe(false)
    expect(goals[0].label).toMatch(/pot/i)
  })
  it('진행 비율은 0..1로 자른다', () => {
    const c = new SpillController(POT_LEVEL)
    const s = c.getState()
    const t = s.targets[0]
    const over = { ...s, targets: [{ ...t, progress: t.need * 3 }, ...s.targets.slice(1)] }
    expect(dockRows(over, c.level.def)[0].frac).toBe(1)
  })
  it('행이 다 들어가면 full, 한 줄만 들어가면 compact, 그보다 작으면 숨긴다', () => {
    expect(dockMode(200, 4)).toBe('full')
    expect(dockMode(4 * 21 + 21 + 20 - 1, 4)).toBe('compact')
    expect(dockMode(30, 4)).toBe('compact')
    expect(dockMode(29, 4)).toBe(null)
  })
})
