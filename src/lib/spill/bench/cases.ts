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
import { Sim, type Action } from '../sim/sim'

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
/**
 * 물 몸통의 앞머리 x: y0..y1 행에서 물이 minDepth셀 이상 있는 가장 오른쪽 열.
 * minDepth 2 = 앞서 달리는 낱개 물방울은 치지 않는다(리뷰 S0 #4).
 */
export function bodyFront(sim: Sim, y0: number, y1: number, minDepth: number): number {
  const g = sim.grid.mat
  for (let x = W - 1; x >= 0; x--) {
    let n = 0
    for (let y = y0; y < y1 && n < minDepth; y++) if (g[y * W + x] === M.water) n++
    if (n >= minDepth) return x
  }
  return 0
}

// 왼쪽 탱크(게이트로 막힘) → 틱 0에 Trigger → 평평한 바닥 위 물 "몸통"(2셀 이상 깊이) 앞머리가
// 1초에 몇 셀 가는가. 낱개 물방울까지 친 앞머리는 참고값으로만 보여 준다.
const spread: BenchCase = {
  id: 'spread',
  title: '1. Water spread',
  goal: 'the water body (≥2 cells deep) travels ≥ 40 cells/s horizontally on a flat floor',
  level: lvl('bench-spread', 'Spread', (c) => {
    c.rect(1, 70, 14, 49, 'w')
    c.rect(15, 70, 2, 49, 'G')
  }),
  actions: [{ tick: 0, action: { verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' } }],
  maxTicks: 60,
  observe() {
    const floorY0 = C(110)
    const floorY1 = C(119)
    const x0 = C(15) - 1
    return {
      onTick(sim) {
        return sim.tick >= 60
      },
      result(sim) {
        const body = bodyFront(sim, floorY0, floorY1, 2) - x0
        const any = bodyFront(sim, floorY0, floorY1, 1) - x0
        return { pass: body >= 40, summary: `${body} cells/s body front (≥40)`, detail: `body x ${x0} → ${x0 + body}; leading droplet ${any} cells` }
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
// 닫힌 방(문자 20..60 × 40..70), 천장 오른쪽 일부만 vent. 증기 spout는 vent 바로 밑이 아니라
// 8셀 왼쪽의 막힌 천장 밑에 있어서, 증기가 천장 밑을 옆으로 흘러가야 vent에 닿는다.
// 같은 레벨에서 vent를 벽으로 바꾼 대조군을 나란히 돌려(리뷰 S0 #2) 다음을 모두 요구한다.
//  - 대조군에서는 vent 자리 밑에 증기가 쌓인다(peak ≥ 25%) — 증기가 실제로 그 자리에 닿는다는 증거
//  - vent가 있으면 그 자리 밑 증기 peak ≤ 15% — 쌓이지 않음(§7.2 목표 7)
//  - 방 천장 띠 전체의 정상 상태 평균이 대조군의 75% 이하 — vent가 방을 실제로 비운다
const VENT_X = 44 // 문자
const VENT_W = 8
const ROOM_CEIL = C(40) + 2 // 천장 아래 첫 셀 행
const VENT_BAND = { x: C(VENT_X), y: ROOM_CEIL, w: C(VENT_W), h: 8 }
const ROOM_BAND = { x: C(21), y: ROOM_CEIL, w: C(39), h: 8 }
export function ventLevel(withVent: boolean): LevelDef {
  return lvl('bench-vent', 'Vent', (c) => {
    c.box(20, 40, 41, 31, '#')
    if (withVent) c.rect(VENT_X, 40, VENT_W, 1, 'v')
    c.rect(36, 46, 4, 1, 'S')
  }, { spouts: { s1: { mat: 'steam', rate: 3, total: 3 * 2700 } } })
}
const vent: BenchCase = {
  id: 'vent',
  title: '7. Steam vs vent',
  goal: 'steam does not pile up under a ceiling vent over the 45 s hard cap (vs a no-vent control)',
  level: ventLevel(true),
  actions: [],
  maxTicks: 2700,
  observe() {
    // 대조군은 관찰자 안에서 같은 틱만큼 나란히 돈다(시간 측정·해시에는 포함되지 않는다)
    const ctl = new Sim()
    ctl.load(ventLevel(false))
    const ventArea = VENT_BAND.w * VENT_BAND.h
    const roomArea = ROOM_BAND.w * ROOM_BAND.h
    let peak = 0, ctlPeak = 0, roomSum = 0, ctlRoomSum = 0, n = 0
    return {
      onTick(sim) {
        while (ctl.tick < sim.tick) ctl.step()
        const a = countRect(sim.grid, VENT_BAND, M.steam)
        const b = countRect(ctl.grid, VENT_BAND, M.steam)
        if (a > peak) peak = a
        if (b > ctlPeak) ctlPeak = b
        if (sim.tick > 600) {
          roomSum += countRect(sim.grid, ROOM_BAND, M.steam)
          ctlRoomSum += countRect(ctl.grid, ROOM_BAND, M.steam)
          n++
        }
        return false
      },
      result() {
        const pk = (peak * 100) / ventArea
        const cpk = (ctlPeak * 100) / ventArea
        const room = n ? (roomSum * 100) / n / roomArea : 0
        const ctlRoom = n ? (ctlRoomSum * 100) / n / roomArea : 0
        const ratio = ctlRoomSum ? roomSum / ctlRoomSum : 1
        return {
          pass: cpk >= 25 && pk <= 15 && ratio <= 0.75,
          summary: `under vent peak ${pk.toFixed(1)}% (≤15) vs no-vent ${cpk.toFixed(1)}% (≥25)`,
          detail: `room ceiling band avg ${room.toFixed(1)}% vs no-vent ${ctlRoom.toFixed(1)}% (ratio ${ratio.toFixed(2)} ≤ 0.75)`,
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
