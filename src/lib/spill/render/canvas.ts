/**
 * 본 레이어 렌더 (§7.4): ImageData(160×240) → putImageData → CSS 정수 배율 + pixelated.
 *
 * - 색 노이즈는 셀 좌표 해시로 고정(같은 격자 → 같은 픽셀, 반짝임 없음).
 * - 액체 윗면 1셀은 하이라이트.
 * - 불은 남은 수명에 따라 노랑→주황→빨강, 타는 나무는 불빛으로 깜빡인다.
 * - 기체(증기·연기)는 배경과 섞어 반투명하게.
 * 발광은 glow.ts가 따로 저해상으로 얹는다.
 */
import type { Grid } from '../sim/grid'
import { H, W } from '../sim/grid'
import { BURN, LIFETIME, M, MATS, MOVE, MV_GAS, MV_LIQUID } from '../sim/materials'
import { hash32 } from '../sim/rng'
import { GlowLayer } from './glow'

export const GRID_W = W
export const GRID_H = H

type RGB = [number, number, number]

export function hexRgb(hex: string): RGB {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))
/** ImageData 바이트 순서(RGBA)를 리틀엔디언 Uint32로 */
export const pack = ([r, g, b]: RGB) => ((255 << 24) | (clamp(b) << 16) | (clamp(g) << 8) | clamp(r)) >>> 0
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const scale = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k]

const VARIANTS = 8
const BG = hexRgb(MATS[M.empty].color)

/** PALETTE[mat][variant] — 노이즈 단계 8개 */
export const PALETTE: Uint32Array[] = MATS.map((m) => {
  const base = hexRgb(m.color)
  const out = new Uint32Array(VARIANTS)
  for (let v = 0; v < VARIANTS; v++) {
    if (m.id === M.empty) { out[v] = pack(BG); continue }
    const k = 1 + (v - 3.5) * 0.018 // ±6%
    let c = scale(base, k)
    if (MOVE[m.id] === MV_GAS) c = mix(BG, c, 0.55 + v * 0.03)
    out[v] = pack(c)
  }
  return out
})

/** 액체 윗면 하이라이트 */
const SURFACE = MATS.map((m) => pack(mix(hexRgb(m.color), [255, 255, 255], 0.28)))

/** 불: 수명 비율 → 색 (새 불 = 밝은 노랑, 꺼져 가는 불 = 어두운 빨강) */
const FIRE_RAMP = (() => {
  const n = LIFETIME[M.fire] + 1
  const hot: RGB = [255, 226, 120]
  const mid = hexRgb(MATS[M.fire].color)
  const cold: RGB = [150, 34, 10]
  const out = new Uint32Array(n)
  for (let l = 0; l < n; l++) {
    const t = l / (n - 1)
    out[l] = pack(t > 0.5 ? mix(mid, hot, (t - 0.5) * 2) : mix(cold, mid, t * 2))
  }
  return out
})()

/** 타는 나무: 재료색 ↔ 불색 사이 8단계 */
const BURNING = MATS.map((m) => {
  const out = new Uint32Array(VARIANTS)
  if (BURN[m.id] === 0) return out
  const base = hexRgb(m.color)
  const fire = hexRgb(MATS[M.fire].color)
  for (let v = 0; v < VARIANTS; v++) out[v] = pack(mix(base, fire, 0.35 + v * 0.08))
  return out
})

/** 셀 좌표 고정 노이즈 단계 */
const NOISE = (() => {
  const n = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) n[y * W + x] = hash32(x, y, 0, 0x51ab) & 7
  return n
})()

/** 격자 → 픽셀(Uint32 RGBA). tick은 깜빡임 위상용. */
export function paintCells(g: Grid, out: Uint32Array, tick: number): void {
  const { mat, life } = g
  const n = W * H
  const noise = NOISE
  const fireMax = FIRE_RAMP.length - 1
  for (let i = 0; i < n; i++) {
    const m = mat[i]
    if (m === 0) { out[i] = PALETTE[0][0]; continue }
    if (m === M.fire) { const l = life[i]; out[i] = FIRE_RAMP[l > fireMax ? fireMax : l]; continue }
    if (BURN[m] !== 0 && life[i] !== 0) { out[i] = BURNING[m][(noise[i] + (tick >> 2)) & 7]; continue }
    if (MOVE[m] === MV_LIQUID && i >= W) {
      const up = mat[i - W]
      if (up !== m && MOVE[up] !== MV_LIQUID && up !== M.sand) { out[i] = SURFACE[m]; continue }
    }
    out[i] = PALETTE[m][noise[i]]
  }
}

export interface Scale {
  /** 셀 하나의 기기 픽셀 수(정수) */
  devicePerCell: number
  /** 셀 하나의 CSS px */
  cssPerCell: number
  cssW: number
  cssH: number
}

/**
 * §3 공통 규칙: s = floor(min(availW, availH*2/3) * dpr / 160) / dpr.
 * 기기 픽셀 기준 정수 배율이 되게 해서 pixelated 확대가 고르게 보인다. 최소 1 기기 픽셀.
 */
export function computeScale(availW: number, availH: number, dpr: number): Scale {
  const devicePerCell = Math.max(1, Math.floor((Math.min(availW, (availH * 2) / 3) * dpr) / W))
  const cssPerCell = devicePerCell / dpr
  return { devicePerCell, cssPerCell, cssW: W * cssPerCell, cssH: H * cssPerCell }
}

/** 브라우저 전용: 160×240 캔버스에 본 레이어 + 발광 레이어를 그린다. */
export class SpillRenderer {
  private ctx: CanvasRenderingContext2D
  private img: ImageData
  private px: Uint32Array
  private glow: GlowLayer
  glowOn = true

  constructor(readonly canvas: HTMLCanvasElement) {
    canvas.width = W
    canvas.height = H
    canvas.style.imageRendering = 'pixelated'
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('2d context unavailable')
    this.ctx = ctx
    this.img = ctx.createImageData(W, H)
    this.px = new Uint32Array(this.img.data.buffer)
    this.glow = new GlowLayer()
  }

  draw(g: Grid, tick: number): void {
    paintCells(g, this.px, tick)
    this.ctx.putImageData(this.img, 0, 0)
    if (this.glowOn) this.glow.compose(this.ctx, g, tick)
  }
}
