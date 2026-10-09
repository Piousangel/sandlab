/** 레벨 도형 → 초기 격자. 셀 인코딩은 셰이더 mk(mat, life)와 같다: mat | life << 16. */
import { PRESETS, buildIndex } from '@/lib/sand/materials'
import { forEachCapsulePixel } from './geom'
import type { Level } from './types'

export const GRID_W = 1200
export const GRID_H = 600

const IDX = buildIndex(PRESETS)

export function cellOf(slug: string): number {
  const id = IDX.get(slug)
  if (id === undefined) throw new Error(`unknown material: ${slug}`)
  return (id | ((PRESETS[id].lifetime ?? 0) << 16)) >>> 0
}

export function buildGrid(level: Level): Uint32Array<ArrayBuffer> {
  const g = new Uint32Array(GRID_W * GRID_H)
  for (const s of level.shapes) {
    const v = cellOf(s.mat)
    if (s.kind === 'rect') {
      const x0 = Math.max(0, s.x), x1 = Math.min(GRID_W, s.x + s.w)
      const y0 = Math.max(0, s.y), y1 = Math.min(GRID_H, s.y + s.h)
      for (let y = y0; y < y1; y++) g.fill(v, y * GRID_W + x0, y * GRID_W + Math.max(x0, x1))
    } else if (s.kind === 'circle') {
      forEachCapsulePixel(GRID_W, GRID_H, s.x, s.y, s.x, s.y, s.r, (i) => (g[i] = v))
    } else {
      forEachCapsulePixel(GRID_W, GRID_H, s.x0, s.y0, s.x1, s.y1, s.t / 2, (i) => (g[i] = v))
    }
  }
  return g
}
