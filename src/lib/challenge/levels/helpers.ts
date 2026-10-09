/** 모범답안 획 작성 헬퍼 — 레벨 파일이 틱별 점 배열을 손으로 쓰지 않게. */
import type { Stroke } from '../types'

/** (x,y)에 n틱 동안 붓을 대고 있기(제자리 붓기). */
export function hold(tick: number, mat: string, r: number, x: number, y: number, n: number): Stroke {
  return { tick, mat, r, pts: Array.from({ length: n }, () => [x, y] as [number, number]) }
}

/** (x0,y0)→(x1,y1)을 n틱 동안 직선으로 긋기(양끝 포함). */
export function drag(tick: number, mat: string, r: number, x0: number, y0: number, x1: number, y1: number, n: number): Stroke {
  const pts: [number, number][] = []
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0 : k / (n - 1)
    pts.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t)])
  }
  return { tick, mat, r, pts }
}

/** 획 끝 틱(다음 획 시작 계산용). */
export const endOf = (s: Stroke) => s.tick + s.pts.length
