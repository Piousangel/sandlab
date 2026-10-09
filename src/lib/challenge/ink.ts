/**
 * 잉크 장부 — 잉크 = GPU paint 패스가 실제로 채운 셀 수(엔진의 재료별 atomic 카운터, engine.readInk).
 * 처음엔 '붓질이 덮은 고유 픽셀'로 셌는데, 제자리에 붓을 대고 있으면 물이 계속 쏟아져도 같은 원이라
 * 공짜가 됐다(2026-10-09). 실제 부은 양을 세야 예산이 의미가 있다.
 */
import { PRESETS, buildIndex } from '@/lib/sand/materials'

const IDX = buildIndex(PRESETS)

export class InkLedger {
  private readonly budget: Record<string, number>
  private usedBy = new Map<string, number>()

  constructor(palette: Record<string, number>) {
    this.budget = { ...palette }
  }

  /** 엔진 카운터(재료 id 인덱스) 반영. 감소한 값은 늦게 도착한 이전 readback이라 무시한다. */
  update(counts: Uint32Array): void {
    for (const slug of Object.keys(this.budget)) {
      const id = IDX.get(slug)
      if (id === undefined) continue
      const n = counts[id] ?? 0
      if (n > (this.usedBy.get(slug) ?? 0)) this.usedBy.set(slug, n)
    }
  }

  used(mat: string): number {
    return this.usedBy.get(mat) ?? 0
  }

  left(mat: string): number {
    return Math.max(0, (this.budget[mat] ?? 0) - this.used(mat))
  }

  spent(mat: string): boolean {
    return this.left(mat) <= 0
  }

  total(): number {
    let t = 0
    for (const v of this.usedBy.values()) t += v
    return t
  }

  reset(): void {
    this.usedBy.clear()
  }
}
