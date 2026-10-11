/**
 * 센서 (§7.2 틱 순서 7). S0은 rect 전수 카운트 — 증분 갱신은 S2에서(스펙 허용).
 * rect는 셀 단위. ignite 센서는 rect를 1셀 넓혀 이웃의 불까지 센다.
 */
import type { Grid } from './grid'
import { H, W } from './grid'

export interface CellRect {
  x: number
  y: number
  w: number
  h: number
}

export function countRect(g: Grid, r: CellRect, mat: number): number {
  const x0 = r.x < 0 ? 0 : r.x
  const y0 = r.y < 0 ? 0 : r.y
  const x1 = r.x + r.w > W ? W : r.x + r.w
  const y1 = r.y + r.h > H ? H : r.y + r.h
  let n = 0
  for (let y = y0; y < y1; y++) {
    const row = y * W
    for (let x = x0; x < x1; x++) if (g.mat[row + x] === mat) n++
  }
  return n
}

export interface Probe extends CellRect {
  mat: number
  /** ignite처럼 이웃까지 볼 때 1 */
  pad?: number
}

export class Sensors {
  readonly values: Int32Array
  constructor(readonly probes: Probe[]) {
    this.values = new Int32Array(probes.length)
  }
  update(g: Grid): void {
    for (let k = 0; k < this.probes.length; k++) {
      const p = this.probes[k]
      const pad = p.pad ?? 0
      this.values[k] = countRect(g, { x: p.x - pad, y: p.y - pad, w: p.w + pad * 2, h: p.h + pad * 2 }, p.mat)
    }
  }
}
