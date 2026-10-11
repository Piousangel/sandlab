/**
 * Sandlab Spill S0 벤치 — §7.2 물리 목표치 7개 + 1x 틱 비용.
 * 실행: npx tsx scripts/spill-bench.ts   (전부 PASS면 exit 0)
 */
import { performance } from 'node:perf_hooks'
import { Sim } from '../src/lib/spill/sim/sim'
import { BENCH_CASES, runCase, runStress } from '../src/lib/spill/bench/cases'

const now = () => performance.now()
const sim = new Sim()
let fails = 0
let totalMs = 0
let totalTicks = 0
console.log('Sandlab Spill S0 bench — 160×240 grid, 60 ticks/s\n')
for (const c of BENCH_CASES) {
  const r = runCase(c, sim, now)
  totalMs += r.msPerTick * r.ticks
  totalTicks += r.ticks
  if (!r.result.pass) fails++
  console.log(`${r.result.pass ? 'PASS' : 'FAIL'}  ${r.title.padEnd(24)} ${r.result.summary}`)
  if (r.result.detail) console.log(`      ${''.padEnd(24)} ${r.result.detail}`)
  console.log(`      ${''.padEnd(24)} ${r.ticks} ticks, ${r.msPerTick.toFixed(3)} ms/tick, hash ${r.hash}`)
}
// 워밍업 후 부하 측정
runStress(sim, now, 120)
const stress = runStress(sim, now, 600)
console.log(`\nAverage over bench levels: ${(totalMs / totalTicks).toFixed(3)} ms/tick (${totalTicks} ticks)`)
console.log(`Stress level (half-full grid collapsing, 10s): avg ${stress.avgMs.toFixed(3)} ms/tick, worst second ${stress.worstSecMs.toFixed(3)} ms/tick`)
console.log(`\n${BENCH_CASES.length - fails}/${BENCH_CASES.length} physics targets PASS`)
process.exit(fails ? 1 : 0)
