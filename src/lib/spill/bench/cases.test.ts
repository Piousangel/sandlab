import { describe, it, expect } from 'vitest'
import { BENCH_CASES, runCase } from './cases'
import { Sim } from '../sim/sim'

// §7.8: sim 단위 테스트에 물리 목표치 포함. 7개 벤치 레벨이 전부 PASS해야 한다.
describe('S0 물리 목표치 7개 (§7.2)', () => {
  const sim = new Sim()
  const now = () => 0
  for (const c of BENCH_CASES) {
    it(`${c.title}: ${c.goal}`, () => {
      const r = runCase(c, sim, now)
      expect(r.result.pass, r.result.summary).toBe(true)
    })
  }

  it('벤치 실행은 결정적이다(두 번 돌려도 같은 해시)', () => {
    const a = runCase(BENCH_CASES[3], new Sim(), now)
    const b = runCase(BENCH_CASES[3], new Sim(), now)
    expect(a.hash).toBe(b.hash)
    expect(a.ticks).toBe(b.ticks)
  })
})
