/**
 * 잉크 계량 — 플레이어 붓질 캡슐이 덮은 '고유' 격자 픽셀 수(재료별). 칠이 실제로 됐는지
 * (paintEmptyOnly로 막혔는지)와 무관하게 센다: 구조물 위를 문질러 예산을 아끼는 우회를 막는다.
 * 셰이더의 가장자리 확률 침식은 무시 — 약간 과대계상(플레이어에게 불리한 쪽).
 */
import { GRID_W, GRID_H } from './grid'
import { forEachCapsulePixel } from './geom'

export class InkMeter {
  private readonly budget: Record<string, number>
  private bits = new Map<string, Uint8Array>()
  private count = new Map<string, number>()

  constructor(palette: Record<string, number>) {
    this.budget = { ...palette }
  }

  stamp(mat: string, x0: number, y0: number, x1: number, y1: number, r: number): number {
    if (!(mat in this.budget)) return 0
    let b = this.bits.get(mat)
    if (!b) {
      b = new Uint8Array((GRID_W * GRID_H) >> 3)
      this.bits.set(mat, b)
    }
    let added = 0
    const bits = b
    forEachCapsulePixel(GRID_W, GRID_H, x0, y0, x1, y1, r, (i) => {
      const byte = i >> 3
      const mask = 1 << (i & 7)
      if (!(bits[byte] & mask)) {
        bits[byte] |= mask
        added++
      }
    })
    this.count.set(mat, (this.count.get(mat) ?? 0) + added)
    return added
  }

  used(mat: string): number {
    return this.count.get(mat) ?? 0
  }

  left(mat: string): number {
    return Math.max(0, (this.budget[mat] ?? 0) - this.used(mat))
  }

  total(): number {
    let t = 0
    for (const v of this.count.values()) t += v
    return t
  }

  reset(): void {
    this.bits.clear()
    this.count.clear()
  }
}
