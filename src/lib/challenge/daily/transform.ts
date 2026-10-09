/**
 * 레벨 변형 — 좌우 반전 + 가로 이동. 데일리 풀을 검증된 레벨에서 기계적으로 만든다
 * (변형마다 /play/verify?set=daily로 실크롬 재검증). 셀 단위로 정확히 대칭이다:
 * 사각형 [x, x+w) → [W-x-w, W-x), 점 x → W-1-x. canPaintAt 경계도 그대로 보존된다.
 */
import { GRID_W } from '../grid'
import type { Goal, Level, Shape, Zone } from '../types'

type Rect = { x: number; y: number; w: number; h: number }
export interface Variant {
  dx: number
  mirror: boolean
}

export function transformLevel(level: Level, v: Variant, id: string): Level {
  const px = (x: number) => (v.mirror ? GRID_W - 1 - x : x) + v.dx
  const rect = <R extends Rect>(r: R): R => ({ ...r, x: (v.mirror ? GRID_W - r.x - r.w : r.x) + v.dx })
  const zone = (z: Zone): Zone => (z === 'all' ? z : rect(z))
  const shape = (s: Shape): Shape =>
    s.kind === 'rect' ? rect(s) : s.kind === 'circle' ? { ...s, x: px(s.x) } : { ...s, x0: px(s.x0), x1: px(s.x1) }
  const goal = (g: Goal): Goal => ('zone' in g ? { ...g, zone: zone(g.zone) } : g)
  return {
    ...level,
    id,
    shapes: level.shapes.map(shape),
    paintArea: rect(level.paintArea),
    areaFor: level.areaFor && Object.fromEntries(Object.entries(level.areaFor).map(([m, a]) => [m, rect(a)])),
    goals: level.goals.map(goal),
    solution: level.solution.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [px(x), y] as [number, number]) })),
  }
}

/** 격자를 벗어나지 않는 dx 범위 [lo, hi] — 도형·구역·칠 영역·모범답안(반지름 포함) 전부 기준. */
export function xRange(level: Level): [number, number] {
  let min = Infinity
  let max = -Infinity
  const span = (a: number, b: number) => {
    min = Math.min(min, a)
    max = Math.max(max, b)
  }
  for (const s of level.shapes) {
    if (s.kind === 'rect') span(s.x, s.x + s.w)
    else if (s.kind === 'circle') span(s.x - s.r, s.x + s.r + 1)
    else span(Math.min(s.x0, s.x1) - s.t, Math.max(s.x0, s.x1) + s.t + 1)
  }
  for (const g of level.goals) if ('zone' in g && g.zone !== 'all') span(g.zone.x, g.zone.x + g.zone.w)
  for (const a of [level.paintArea, ...Object.values(level.areaFor ?? {})]) span(a.x, a.x + a.w)
  for (const s of level.solution) for (const [x] of s.pts) span(x - s.r, x + s.r + 1)
  return [Math.min(0, -min), Math.max(0, GRID_W - max)]
}
