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
    }, 60_000) // 목표 7은 대조군까지 2×2700틱
  }

  it('벤치 실행은 결정적이다(두 번 돌려도 같은 해시)', () => {
    const a = runCase(BENCH_CASES[3], new Sim(), now)
    const b = runCase(BENCH_CASES[3], new Sim(), now)
    expect(a.hash).toBe(b.hash)
    expect(a.ticks).toBe(b.ticks)
  })
})

describe('목표 1 측정 (리뷰 S0 #4)', () => {
  it('앞머리는 2셀 이상 깊이인 열만 센다 — 앞서 달리는 낱개 물방울은 무시', async () => {
    const { bodyFront } = await import('./cases')
    const { M } = await import('../sim/materials')
    const { W } = await import('../sim/grid')
    const sim = new Sim()
    sim.grid.mat.fill(0)
    for (let x = 10; x <= 30; x++) { sim.grid.mat[230 * W + x] = M.water; sim.grid.mat[231 * W + x] = M.water }
    sim.grid.mat[231 * W + 90] = M.water // 낱개 물방울
    expect(bodyFront(sim, 200, 238, 2)).toBe(30)
    expect(bodyFront(sim, 200, 238, 1)).toBe(90)
  })
})

describe('목표 7 대조군 (리뷰 S0 #2)', () => {
  it('vent를 벽으로 바꾸면 목표 7이 FAIL한다 — vent 없이는 통과할 수 없는 측정', async () => {
    const { ventLevel } = await import('./cases')
    const c = BENCH_CASES.find((x) => x.id === 'vent')!
    const r = runCase({ ...c, level: ventLevel(false) }, new Sim(), () => 0)
    expect(r.result.pass, r.result.summary).toBe(false)
  }, 60_000)
})
