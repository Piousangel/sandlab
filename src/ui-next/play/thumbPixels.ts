/**
 * /play 전시실 레벨 썸네일의 픽셀(리디자인 P8). 순수 함수 — 페이지는 이 모듈을 import하지 않고,
 * scripts/gen-level-thumbs.mts가 빌드 전에 PNG로 굽는다(라이브 캔버스 금지, 개당 ≤ 15KB).
 *
 * - 시작 보드 그대로: parseLevel(정의 → 160×240 셀) + 엔진 팔레트·셀 노이즈(render/canvas.ts와 같은 식)로 칠한다.
 *   액체 윗면 하이라이트·발광은 뺀다(썸네일 크기 ≈110px에서 안 보인다).
 * - 목표(fill·ignite·reach·protect)는 1셀 윤곽(재료색을 어둠과 섞은 색), 'bad'는 붉은 윤곽, 보석은 금색 2×2 점.
 *   플레이 화면 오버레이(링·스프라이트)의 축약 — 어디를 채우는지만 보인다. 정답 경로(dev 해)는 그리지 않는다(스포일러 0).
 */
import type { LevelDef } from '@/lib/spill/level/define'
import { parseLevel } from '@/lib/spill/level/parse'
import { H, W } from '@/lib/spill/sim/grid'
import { MATS } from '@/lib/spill/sim/materials'
import { hash32 } from '@/lib/spill/sim/rng'

export const THUMB_W = W
export const THUMB_H = H

type RGB = [number, number, number]

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]

const EMPTY = hex(MATS[0].color)
const GEM: RGB = [0xe8, 0xb3, 0x3a]
const BAD: RGB = [0xd0, 0x4a, 0x3a]

/** 셀 하나의 색(시작 보드). 엔진과 같은 식의 좌표 고정 노이즈(±6%, 8단계 — render/canvas.ts NOISE·PALETTE)를 맵 문자 단위(2×2셀)로 쓴다 — 셀 단위면 흙 많은 레벨이 12KB(15KB 상한 근처), 2×2면 4.6KB. 기체는 바탕과 섞는다. */
function cellColor(m: number, x: number, y: number): RGB {
  if (m === 0) return EMPTY
  const def = MATS[m]
  const k = 1 + ((hash32(x >> 1, y >> 1, 0, 0x51ab) & 7) - 3.5) * 0.018
  const b = hex(def.color)
  const c: RGB = [Math.min(255, Math.round(b[0] * k)), Math.min(255, Math.round(b[1] * k)), Math.min(255, Math.round(b[2] * k))]
  return def.movement === 'gas' ? mix(EMPTY, c, 0.62) : c
}

/** 레벨 → RGB 바이트(행 우선, 160×240×3). */
export function thumbPixels(def: LevelDef): Uint8Array {
  const p = parseLevel(def)
  const out = new Uint8Array(W * H * 3)
  const put = (x: number, y: number, c: RGB) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const i = (y * W + x) * 3
    out[i] = c[0]
    out[i + 1] = c[1]
    out[i + 2] = c[2]
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, cellColor(p.mat[y * W + x], x, y))

  const outline = (r: { x: number; y: number; w: number; h: number }, c: RGB) => {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (p.mat[r.y * W + x] === 0) put(x, r.y, c)
      if (p.mat[(r.y + r.h - 1) * W + x] === 0) put(x, r.y + r.h - 1, c)
    }
    for (let y = r.y; y < r.y + r.h; y++) {
      if (p.mat[y * W + r.x] === 0) put(r.x, y, c)
      if (p.mat[y * W + r.x + r.w - 1] === 0) put(r.x + r.w - 1, y, c)
    }
  }
  for (const t of p.targets) {
    const base = t.kind === 'bad' ? BAD : t.mat > 0 ? hex(MATS[t.mat].color) : GEM
    outline(t, mix(EMPTY, base, t.kind === 'bad' ? 0.8 : 0.55))
  }
  for (const g of p.gems) {
    const cx = g.x + (g.w >> 1) - 2
    const cy = g.y + (g.h >> 1) - 2
    for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) if (p.mat[(cy + dy) * W + cx + dx] === 0) put(cx + dx, cy + dy, GEM)
  }
  return out
}
