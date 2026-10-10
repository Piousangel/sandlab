/**
 * S0 벤치 — §7.2 물리 목표치 7개를 각각 레벨 하나로 인코딩하고, 틱마다 관찰해 PASS/FAIL을 낸다.
 * Node(scripts/spill-bench.ts)와 브라우저(/spill/bench)가 같은 코드를 쓴다.
 *
 * 각 케이스: level(맵) + 정해진 틱에 넣는 액션 + 관찰자(onTick → 끝났으면 true) + result().
 * 기준값은 스펙 §7.2 "물리 목표치"를 그대로 옮겼다.
 */
import { defineLevel, type LevelDef } from '../level/define'
import { MapCanvas } from '../level/mapcanvas'
import { countRect } from '../sim/sensors'
import { M } from '../sim/materials'
import { W } from '../sim/grid'
import type { Action, Sim } from '../sim/sim'

export const TICKS_PER_SEC = 60

export interface BenchResult {
  pass: boolean
  /** 한 줄 요약: "52 cells/s (≥40)" */
  summary: string
  /** 보조 수치 */
  detail?: string
}

export interface Observer {
  onTick(sim: Sim): boolean
  result(sim: Sim): BenchResult
}

export interface BenchCase {
  id: string
  title: string
  /** 스펙 목표 문장 */
  goal: string
  level: LevelDef
  actions: { tick: number; action: Action }[]
  maxTicks: number
  observe(): Observer
}

const LEGEND = {
  '.': 'empty', '#': 'wall', d: 'dirt', s: 'sand', w: 'water', l: 'lava', W: 'wood', p: 'plank', u: 'fuse',
  v: 'vent', G: 'gate:g1', S: 'spout:s1',
}

function lvl(id: string, name: string, draw: (c: MapCanvas) => void, extra: Partial<LevelDef> = {}): LevelDef {
  const c = new MapCanvas()
  c.box(0, 0, 80, 120, '#')
  draw(c)
  return defineLevel({ id, v: 1, world: 0, name, salt: 0x5a17, legend: LEGEND, map: c.toString(), targets: [], ...extra })
}

const secs = (ticks: number) => (ticks / TICKS_PER_SEC).toFixed(2) + 's'

/** 맵 문자 좌표(2셀 단위) → 셀 */
const C = (n: number) => n * 2

// ── 1. 수평 확산 ────────────────────────────────────────────────
// 왼쪽 탱크(게이트로 막힘) → 틱 0에 Trigger → 평평한 바닥 위 물 앞머리가 1초에 몇 셀 가는가.
const spread: BenchCase = {
  id: 'spread',
  title: '1. Water spread',
  goal: 'water travels ≥ 40 cells/s horizontally on a flat floor',
  level: lvl('bench-spread', 'Spread', (c) => {
    c.rect(1, 70, 14, 49, 'w')
    c.rect(15, 70, 2, 49, 'G')
  }),
  actions: [{ tick: 0, action: { verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' } }],
  maxTicks: 60,
  observe() {
    const floorY0 = C(110)
    const floorY1 = C(119)
    const front = (sim: Sim) => {
      let fx = 0
      for (let y = floorY0; y < floorY1; y++)
        for (let x = W - 1; x > fx; x--) if (sim.grid.mat[y * W + x] === M.water) { fx = x; break }
      return fx
    }
    let x0 = -1
    return {
      onTick(sim) {
        if (x0 < 0) x0 = C(15) - 1
        return sim.tick >= 60
      },
      result(sim) {
        const d = front(sim) - x0
        return { pass: d >= 40, summary: `${d} cells/s (≥40)`, detail: `front x ${x0} → ${front(sim)} in 60 ticks` }
      },
    }
  },
}

// ── 2. 냄비 채우기 ──────────────────────────────────────────────
// 탱크 아래 dirt 바닥을 1타일 폭으로 수직 Dig → 아래 냄비(24×24셀 안쪽)에 물 400셀이 차는 시간.
const POT = { x: C(30), y: C(95), w: 24, h: 48 }
const pot: BenchCase = {
  id: 'pot',
  title: '2. Pot fill',
  goal: 'a 400-cell pot fills in ≤ 3 s at normal flow (1-tile dig under a tank)',
  level: lvl('bench-pot', 'Pot', (c) => {
    c.rect(20, 1, 32, 30, 'w') // 탱크
    c.rect(1, 31, 78, 4, 'd') // dirt 바닥(2타일)
    c.rect(29, 95, 1, 24, '#') // 냄비 왼벽
    c.rect(42, 95, 1, 24, '#') // 냄비 오른벽
  }),
  // 타일 좌표: 냄비 가운데 x = 36문자 = 72셀 = 18타일, dirt는 문자 31..34 = 셀 62..69 = 타일 15..17
  actions: [{ tick: 0, action: { verb: 'dig', tx: 18, ty: 15, tx2: 18, ty2: 17 } }],
  maxTicks: 900,
  observe() {
    let first = -1
    let full = -1
    return {
      onTick(sim) {
        const n = countRect(sim.grid, POT, M.water)
        if (first < 0 && n > 0) first = sim.tick
        if (full < 0 && n >= 400) full = sim.tick
        return full >= 0
      },
      result() {
        if (full < 0) return { pass: false, summary: 'never reached 400 cells', detail: first < 0 ? 'no water arrived' : `first water at ${secs(first)}` }
        const fill = full - first
        return { pass: fill <= 180, summary: `${secs(fill)} fill (≤3s)`, detail: `first drop ${secs(first)}, 400 cells at ${secs(full)} after dig` }
      },
    }
  },
}

// ── 3. plank 관통 ───────────────────────────────────────────────
// 1타일 두께 plank 위에 물웅덩이, 아래에 Drop spark → 물이 아래로 떨어질 구멍이 날 때까지.
const PLANK_Y = 30 // 타일 행
const plank: BenchCase = {
  id: 'plank',
  title: '3. Plank burn-through',
  goal: 'a 1-tile plank burns through in 1.5–3 s',
  level: lvl('bench-plank', 'Plank', (c) => {
    c.rect(10, PLANK_Y * 2, 60, 2, 'p') // 1타일 = 문자 2줄
    c.rect(10, PLANK_Y * 2 - 10, 60, 10, 'w')
    c.rect(9, PLANK_Y * 2 - 12, 1, 14, '#')
    c.rect(70, PLANK_Y * 2 - 12, 1, 14, '#')
  }),
  actions: [{ tick: 0, action: { verb: 'drop', tx: 20, ty: PLANK_Y + 1, tx2: 20, ty2: PLANK_Y + 1, arg: 'spark' } }],
  maxTicks: 600,
  observe() {
    let through = -1
    const y0 = PLANK_Y * 4
    return {
      onTick(sim) {
        for (let x = C(10); x < C(70); x++) {
          let solid = false
          for (let y = y0; y < y0 + 4; y++) if (sim.grid.mat[y * W + x] === M.plank) { solid = true; break }
          if (!solid) { through = sim.tick; return true }
        }
        return false
      },
      result() {
        if (through < 0) return { pass: false, summary: 'never burned through in 10s' }
        return { pass: through >= 90 && through <= 180, summary: `${secs(through)} (1.5–3s)` }
      },
    }
  },
}

// ── 4. 크러스트 + 증기 ──────────────────────────────────────────
// 바닥 1타일 용암 시트 위로 물 spout → 시트 윗면이 돌이 되고 증기가 올라간다.
const SHEET = { x: C(15), y: C(117), w: C(50), h: 4 }
const crust: BenchCase = {
  id: 'crust',
  title: '4. Crust + steam',
  goal: 'water poured on a 1-tile lava sheet forms a stone crust and steam rises',
  level: lvl('bench-crust', 'Crust', (c) => {
    c.rect(15, 117, 50, 2, 'l')
    c.rect(14, 110, 1, 9, '#')
    c.rect(65, 110, 1, 9, '#')
    c.rect(38, 60, 4, 1, 'S')
  }, { spouts: { s1: { mat: 'water', rate: 3, total: 900 } } }),
  actions: [],
  maxTicks: 600,
  observe() {
    let steamPeak = 0
    let steamTop = 999
    return {
      onTick(sim) {
        const g = sim.grid.mat
        let n = 0
        for (let i = 0; i < W * SHEET.y; i++) if (g[i] === M.steam) { n++; const y = (i / W) | 0; if (y < steamTop) steamTop = y }
        if (n > steamPeak) steamPeak = n
        return false
      },
      result(sim) {
        // 크러스트: 시트 열마다 맨 위 셀이 돌인가
        let crusted = 0
        for (let x = SHEET.x; x < SHEET.x + SHEET.w; x++) {
          for (let y = SHEET.y - 2; y < SHEET.y + SHEET.h; y++) {
            const m = sim.grid.mat[y * W + x]
            if (m === M.stone) { crusted++; break }
            if (m === M.lava) break
          }
        }
        const lavaLeft = countRect(sim.grid, SHEET, M.lava)
        const cov = (crusted * 100) / SHEET.w
        const rise = SHEET.y - steamTop
        const pass = cov >= 80 && steamPeak > 0 && rise >= 40
        return {
          pass,
          summary: `crust ${cov.toFixed(0)}% of sheet (≥80), steam rose ${rise} cells (≥40)`,
          detail: `steam peak ${steamPeak} cells, lava left ${lavaLeft}/${SHEET.w * SHEET.h}, stone ${sim.count(M.stone)}`,
        }
      },
    }
  },
}

// ── 5. 아래에서 점화 ────────────────────────────────────────────
// 같은 나무 덩어리 두 개: 왼쪽은 아래에 spark, 오른쪽은 위에 spark. 아래 점화만 타야 한다.
const WOOD_L = { x: C(10), y: C(80), w: C(20), h: C(8) }
const WOOD_R = { x: C(50), y: C(80), w: C(20), h: C(8) }
const ignite: BenchCase = {
  id: 'ignite',
  title: '5. Fire from below',
  goal: 'igniting wood from below burns it; a spark on top floats away',
  level: lvl('bench-ignite', 'Ignite', (c) => {
    c.rect(10, 80, 20, 8, 'W')
    c.rect(50, 80, 20, 8, 'W')
  }),
  actions: [
    { tick: 0, action: { verb: 'drop', tx: 9, ty: 44, tx2: 9, ty2: 44, arg: 'spark' } },
    { tick: 0, action: { verb: 'drop', tx: 29, ty: 39, tx2: 29, ty2: 39, arg: 'spark' } },
  ],
  maxTicks: 600,
  observe() {
    const total = WOOD_L.w * WOOD_L.h
    let half = -1
    return {
      onTick(sim) {
        if (half < 0 && countRect(sim.grid, WOOD_L, M.wood) <= total / 2) half = sim.tick
        return false
      },
      result(sim) {
        const below = 100 - (countRect(sim.grid, WOOD_L, M.wood) * 100) / total
        const above = 100 - (countRect(sim.grid, WOOD_R, M.wood) * 100) / total
        return {
          pass: below >= 50 && above <= 10,
          summary: `below ${below.toFixed(0)}% burned (≥50), above ${above.toFixed(0)}% (≤10) in 10s`,
          detail: half >= 0 ? `half of the lit block gone at ${secs(half)}` : 'lit block never reached 50%',
        }
      },
    }
  },
}

// ── 6. fuse 전파 ────────────────────────────────────────────────
/** 사각형 안의 아직 안 붙은 fuse 셀 수 */
function unlit(sim: Sim, r: { x: number; y: number; w: number; h: number }): number {
  let n = 0
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) {
      const i = y * W + x
      if (sim.grid.mat[i] === M.fuse && sim.grid.life[i] === 0) n++
    }
  return n
}
// 1타일 두께 fuse 줄 왼쪽 끝 아래에 spark → 40셀 떨어진 곳까지 불이 닿는 시간.
const FUSE_Y = 50 * 4 // 셀
const FUSE_X0 = 10 * 4
const fuse: BenchCase = {
  id: 'fuse',
  title: '6. Fuse propagation',
  goal: 'fire travels 40 cells along a fuse in ≤ 1 s',
  level: lvl('bench-fuse', 'Fuse', () => {}),
  actions: [
    { tick: 0, action: { verb: 'line', tx: 10, ty: 50, tx2: 30, ty2: 50, arg: 'fuse' } },
    { tick: 0, action: { verb: 'drop', tx: 10, ty: 51, tx2: 10, ty2: 51, arg: 'spark' } },
  ],
  maxTicks: 300,
  observe() {
    // 불이 닿았다 = 그 열에 아직 안 붙은(life 0) fuse가 없다. 타는 fuse(life>0)는 8틱 뒤 불이 된다.
    const colGone = (sim: Sim, x: number) => {
      for (let y = FUSE_Y; y < FUSE_Y + 4; y++) {
        const i = y * W + x
        if (sim.grid.mat[i] === M.fuse && sim.grid.life[i] === 0) return false
      }
      return true
    }
    let lit = -1
    let reached = -1
    return {
      onTick(sim) {
        if (lit < 0 && unlit(sim, { x: FUSE_X0, y: FUSE_Y, w: 4, h: 4 }) < 16) lit = sim.tick
        if (lit >= 0 && reached < 0 && colGone(sim, FUSE_X0 + 3 + 40)) reached = sim.tick
        return reached >= 0
      },
      result() {
        if (reached < 0) return { pass: false, summary: lit < 0 ? 'fuse never lit' : 'fire never travelled 40 cells' }
        const dt = reached - lit
        return { pass: dt <= 60, summary: `40 cells in ${secs(dt)} (≤1s) = ${((40 * 60) / dt).toFixed(0)} cells/s`, detail: `lit at ${secs(lit)}` }
      },
    }
  },
}

// ── 7. 증기 vs vent ─────────────────────────────────────────────
// 닫힌 방, 천장 가운데 1/3만 vent. 왼쪽 아래 증기 spout가 하드캡(45s) 내내 뿜는다.
// 천장 아래 2타일 띠의 증기 점유율이 계속 낮아야 한다(고이지 않음).
const BAND = { x: C(1), y: C(1), w: C(78), h: 8 }
const vent: BenchCase = {
  id: 'vent',
  title: '7. Steam vs vent',
  goal: 'steam does not pile up under a ceiling vent over the 45 s hard cap',
  level: lvl('bench-vent', 'Vent', (c) => {
    c.rect(28, 1, 24, 1, 'v')
    c.rect(14, 30, 4, 1, 'S')
  }, { spouts: { s1: { mat: 'steam', rate: 3, total: 3 * 2700 } } }),
  actions: [],
  maxTicks: 2700,
  observe() {
    let peak = 0
    let sum = 0
    let n = 0
    const area = BAND.w * BAND.h
    return {
      onTick(sim) {
        const s = countRect(sim.grid, BAND, M.steam)
        if (s > peak) peak = s
        if (sim.tick > 600) { sum += s; n++ }
        return false
      },
      result() {
        const peakPct = (peak * 100) / area
        const avgPct = n ? (sum * 100) / n / area : 0
        return {
          pass: peakPct <= 25,
          summary: `ceiling band peak ${peakPct.toFixed(1)}% steam (≤25%)`,
          detail: `steady-state avg ${avgPct.toFixed(1)}% after 10s`,
        }
      },
    }
  },
}

export const BENCH_CASES: BenchCase[] = [spread, pot, plank, crust, ignite, fuse, vent]

/**
 * 목표치는 salt 하나에 맞춘 튜닝이면 안 된다(§7.8 "salt 16개에서 클리어"와 같은 기준).
 * 첫 값은 벤치 레벨 기본 salt.
 */
export const SWEEP_SALTS = [0x5a17, 1, 2, 3, 7, 42, 0x3a1f, 1234, 9999, 0xbeef, 0xffff, 55, 77, 101, 2026, 31337]

/** 같은 케이스를 다른 salt로 */
export function withSalt(c: BenchCase, salt: number): BenchCase {
  return { ...c, level: { ...c.level, salt } }
}

/**
 * 성능 측정용 부하 레벨: 격자 절반이 모래·물·기름이고 계속 움직인다(최악에 가까운 1x 틱).
 */
export const STRESS_LEVEL: LevelDef = lvl('bench-stress', 'Stress', (c) => {
  c.rect(1, 1, 26, 50, 's')
  c.rect(27, 1, 26, 50, 'w')
  c.rect(53, 1, 26, 50, 'l')
  for (let k = 0; k < 6; k++) c.rect(6 + k * 12, 70 + (k % 2) * 12, 8, 1, '#')
})

export interface CaseRun {
  id: string
  title: string
  result: BenchResult
  ticks: number
  msPerTick: number
  /** 끝난 시점의 격자 해시 — Node와 브라우저가 같아야 한다(결정성 교차 확인) */
  hash: string
}

/** 정해진 틱의 액션을 넣는다(라이브 뷰·runCase 공용). */
export function applyDue(c: BenchCase, sim: Sim): void {
  for (const a of c.actions) if (a.tick === sim.tick) sim.apply(a.action)
}

export interface CaseRunner {
  /** 최대 n틱 진행. 끝났으면 true */
  advance(n: number): boolean
  finish(): CaseRun
}

/** 조금씩 나눠 돌릴 수 있는 실행기 — 브라우저 "run all"이 UI를 막지 않게 쓴다. */
export function createRunner(c: BenchCase, sim: Sim, now: () => number): CaseRunner {
  sim.load(c.level)
  const obs = c.observe()
  let simMs = 0
  let done = false
  return {
    advance(n) {
      for (let k = 0; k < n && !done; k++) {
        if (sim.tick >= c.maxTicks) { done = true; break }
        applyDue(c, sim)
        const t0 = now()
        sim.step()
        simMs += now() - t0
        if (obs.onTick(sim)) done = true
      }
      if (sim.tick >= c.maxTicks) done = true
      return done
    },
    finish() {
      return { id: c.id, title: c.title, result: obs.result(sim), ticks: sim.tick, msPerTick: simMs / Math.max(1, sim.tick), hash: sim.hash() }
    },
  }
}

/** 케이스 하나를 끝까지 돌린다. now = 시간 함수(Node·브라우저 공통으로 performance.now). */
export function runCase(c: BenchCase, sim: Sim, now: () => number): CaseRun {
  const r = createRunner(c, sim, now)
  while (!r.advance(1 << 20));
  return r.finish()
}

/** §7.3 FF 자동 상한: 평균 틱 2ms 이하 4x, 4ms 이하 2x, 그 외 1x */
export function ffCap(msPerTick: number): 1 | 2 | 4 {
  return msPerTick <= 2 ? 4 : msPerTick <= 4 ? 2 : 1
}

export function runStress(sim: Sim, now: () => number, ticks = 600): number {
  sim.load(STRESS_LEVEL)
  const t0 = now()
  for (let i = 0; i < ticks; i++) sim.step()
  return (now() - t0) / ticks
}
