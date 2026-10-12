import { describe, it, expect } from 'vitest'
import { gateWindowState } from './gatewin'
import { defineLevel } from '../level/define'
import { GATE_LEVEL } from './fixtures'

const def = defineLevel({
  ...GATE_LEVEL,
  gateWindows: { g1: { from: 90, to: 200 }, g2: { after: 'g1', from: 20 } },
})

describe('gateWindowState (§3.3 창이 열리면 깜빡임)', () => {
  it('창 없는 게이트는 항상 열림', () => {
    expect(gateWindowState(GATE_LEVEL, 'g1', 0, [])).toBe('always')
  })
  it('Run 기준 창: 이전·안·이후', () => {
    expect(gateWindowState(def, 'g1', 89, [])).toBe('before')
    expect(gateWindowState(def, 'g1', 90, [])).toBe('open')
    expect(gateWindowState(def, 'g1', 200, [])).toBe('open')
    expect(gateWindowState(def, 'g1', 201, [])).toBe('after')
  })
  it('다른 게이트 기준 창: 기준 게이트를 열기 전엔 before, 연 뒤 from틱부터 open(to 없으면 끝없음)', () => {
    expect(gateWindowState(def, 'g2', 500, [])).toBe('before')
    expect(gateWindowState(def, 'g2', 119, [{ arg: 'g1', tick: 100 }])).toBe('before')
    expect(gateWindowState(def, 'g2', 120, [{ arg: 'g1', tick: 100 }])).toBe('open')
    expect(gateWindowState(def, 'g2', 5000, [{ arg: 'g1', tick: 100 }])).toBe('open')
  })
  it('defineLevel은 탭할 수 없는 게이트의 창이나 잘못된 기준을 거부', () => {
    expect(() => defineLevel({ ...GATE_LEVEL, gateWindows: { g9: { from: 0 } } })).toThrow(/g9/)
    expect(() => defineLevel({ ...GATE_LEVEL, gateWindows: { g2: { after: 'g2', from: 0 } } })).toThrow(/after/)
    expect(() => defineLevel({ ...GATE_LEVEL, gateWindows: { g1: { from: 50, to: 10 } } })).toThrow(/to/)
  })
})
