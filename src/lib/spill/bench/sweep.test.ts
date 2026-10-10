import { describe, it, expect } from 'vitest'
import { BENCH_CASES, SWEEP_SALTS, runCase, withSalt } from './cases'
import { Sim } from '../sim/sim'

// 리뷰 #4: 7/7이 기본 salt 하나에서만 맞으면 안 된다. 16개 salt 전부에서 PASS.
describe('S0 물리 목표치 — salt 16개 스윕', () => {
  const now = () => 0
  for (const c of BENCH_CASES) {
    it(`${c.title}: 16 salts`, () => {
      const sim = new Sim()
      const fails: string[] = []
      for (const salt of SWEEP_SALTS) {
        const r = runCase(withSalt(c, salt), sim, now)
        if (!r.result.pass) fails.push(`salt ${salt}: ${r.result.summary}`)
      }
      expect(fails).toEqual([])
    }, 120_000)
  }
})
