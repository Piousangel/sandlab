import type { Stroke } from './types'

/** 모범답안에서 tick의 브러시 상태. 어떤 획에도 속하지 않으면 null(브러시 뗌). */
export function brushAt(
  solution: Stroke[],
  tick: number,
  idx: Map<string, number>,
): { x: number; y: number; r: number; mat: number } | null {
  for (const s of solution) {
    const k = tick - s.tick
    if (k >= 0 && k < s.pts.length) {
      const [x, y] = s.pts[k]
      return { x, y, r: s.r, mat: idx.get(s.mat) ?? 0 }
    }
  }
  return null
}
