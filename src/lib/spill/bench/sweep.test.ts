import { describe, it, expect } from 'vitest'
import { BENCH_CASES, SWEEP_SALTS, runCase, withSalt } from './cases'
import { Sim } from '../sim/sim'

// 리뷰 #4: 7/7이 기본 salt 하나에서만 맞으면 안 된다. 16개 salt 전부에서 PASS.
// 케이스 × salt마다 테스트 하나(11-20): 예전엔 케이스당 16 salt를 한 테스트로 돌려 부하에서 한 테스트가 수 분(Steam vs vent 로컬 469초)
// 걸렸다. 검사하는 조합(7 케이스 × 16 salt)은 그대로이고, 실패하면 어느 salt인지 테스트 이름에 바로 나온다.
// 시간 한도는 vitest.config.ts의 sim 프로젝트(SIM_TIMEOUT).
describe('S0 물리 목표치 — salt 16개 스윕', () => {
  const now = () => 0
  const sim = new Sim()
  for (const c of BENCH_CASES) {
    describe(c.title, () => {
      it.each(SWEEP_SALTS.map((salt) => [salt]))('salt %i', (salt) => {
        const r = runCase(withSalt(c, salt), sim, now)
        expect(r.result.pass, `salt ${salt}: ${r.result.summary}`).toBe(true)
      })
    })
  }
})
