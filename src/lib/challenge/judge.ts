/**
 * 목표 판정 — readback한 격자로 계산하는 순수 함수. 목표 타입은 레지스트리(GOALS)라
 * 새 타입 = 항목 하나 + 테스트(스펙 "계속 발전하는 구조").
 */
import { PRESETS, buildIndex } from '@/lib/sand/materials'
import { GRID_W, GRID_H } from './grid'
import type { Goal, GoalStatus, Level, Zone } from './types'

const IDX = buildIndex(PRESETS)
const nameOf = (slug: string) => PRESETS.find((m) => m.slug === slug)?.name ?? slug
const idOf = (slug: string) => {
  const id = IDX.get(slug)
  if (id === undefined) throw new Error(`unknown material: ${slug}`)
  return id
}

export function countZone(cells: Uint32Array, zone: Zone, matId: number): { n: number; area: number } {
  const z = zone === 'all' ? { x: 0, y: 0, w: GRID_W, h: GRID_H } : zone
  const x0 = Math.max(0, z.x), x1 = Math.min(GRID_W, z.x + z.w)
  const y0 = Math.max(0, z.y), y1 = Math.min(GRID_H, z.y + z.h)
  let n = 0
  for (let y = y0; y < y1; y++) {
    const row = y * GRID_W
    for (let x = x0; x < x1; x++) if ((cells[row + x] & 0xffff) === matId) n++
  }
  return { n, area: Math.max(0, x1 - x0) * Math.max(0, y1 - y0) }
}

type Spec<G extends Goal> = {
  judge: (cells: Uint32Array, g: G, init: number, tick: number) => GoalStatus
  describe: (g: G) => string
}

export const GOALS: { [K in Goal['type']]: Spec<Extract<Goal, { type: K }>> } = {
  fill: {
    judge: (c, g) => {
      const { n, area } = countZone(c, g.zone, idOf(g.mat))
      const ratio = area ? n / area : 0
      return { met: ratio >= g.min, progress: Math.min(1, g.min ? ratio / g.min : 1) }
    },
    describe: (g) => `Fill the marked area with ${nameOf(g.mat)} (${Math.round(g.min * 100)}%)`,
  },
  clear: {
    judge: (c, g) => {
      const n = countZone(c, g.zone, idOf(g.mat)).n
      const ok = n <= (g.max ?? 0)
      return { met: ok, progress: ok ? 1 : 0 }
    },
    describe: (g) =>
      g.zone === 'all' ? `Put out every bit of ${nameOf(g.mat)}` : `Remove all ${nameOf(g.mat)} from the marked area`,
  },
  reach: {
    judge: (c, g) => {
      const n = countZone(c, g.zone, idOf(g.mat)).n
      return { met: n >= 1, progress: n >= 1 ? 1 : 0 }
    },
    describe: (g) => `Get ${nameOf(g.mat)} into the marked area`,
  },
  protect: {
    judge: (c, g, init) => {
      if (init <= 0) return { met: false, progress: 0 } // 지킬 게 없으면 시작부터 '충족'이 되면 안 된다
      const ratio = countZone(c, g.zone, idOf(g.mat)).n / init
      return { met: ratio >= g.min, progress: Math.min(1, ratio / g.min) }
    },
    describe: (g) => `Keep at least ${Math.round(g.min * 100)}% of the ${nameOf(g.mat)} in the marked area`,
  },
  survive: {
    judge: (_c, g, _init, tick) => ({ met: tick >= g.ticks, progress: Math.min(1, tick / g.ticks) }),
    describe: () => 'Hold out until the bar fills',
  },
}

function spec(g: Goal) {
  return GOALS[g.type] as Spec<Goal>
}

/** protect 목표의 기준 개수(초기 격자에서). 나머지 목표는 0. */
export function initialCounts(cells: Uint32Array, level: Level): number[] {
  return level.goals.map((g) => (g.type === 'protect' ? countZone(cells, g.zone, idOf(g.mat)).n : 0))
}

/** tick = 레벨 시작 기준 시뮬 틱(survive용). 생략하면 0 — 시작부터 충족이 되지 않게. */
export function judge(cells: Uint32Array, level: Level, init: number[], tick = 0): GoalStatus[] {
  return level.goals.map((g, i) => spec(g).judge(cells, g, init[i] ?? 0, tick))
}

export function describeGoal(g: Goal): string {
  return spec(g).describe(g)
}
