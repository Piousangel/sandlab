/**
 * 발광 레이어 (§7.4): 40×60 저해상 캔버스에 4×4 블록별 발광 합계를 쓰고,
 * imageSmoothingEnabled=true로 160×240에 확대해 globalCompositeOperation='lighter'로 얹는다.
 * ctx.filter는 쓰지 않는다(모바일에서 비싸고 사파리 지원이 들쭉날쭉). 대신 40×60에서
 * 3×3 박스 블러를 두 번 돌려 후광이 블록 밖으로 번지게 한다(2400칸이라 공짜에 가깝다).
 */
import type { Grid } from '../sim/grid'
import { H, TILE, W } from '../sim/grid'
import { BURN, LIFETIME, M, MATS } from '../sim/materials'

export const GLOW_W = W / TILE
export const GLOW_H = H / TILE

/** 재료별 발광 RGB(0..1 스케일, glow/300 × 색) */
const EMIT = MATS.map((m) => {
  const k = m.glow / 300
  return [(parseInt(m.color.slice(1, 3), 16) / 255) * k, (parseInt(m.color.slice(3, 5), 16) / 255) * k, (parseInt(m.color.slice(5, 7), 16) / 255) * k]
})
const FIRE_EMIT = EMIT[M.fire]

/** 격자 → 블록별 발광 합(블록 평균). rgb 길이 = GLOW_W*GLOW_H*3 */
export function accumulateGlow(g: Grid, rgb: Float32Array): void {
  rgb.fill(0)
  const { mat, life } = g
  const fireLife = LIFETIME[M.fire]
  const inv = 1 / (TILE * TILE)
  for (let y = 0; y < H; y++) {
    const gy = (y / TILE) | 0
    for (let x = 0; x < W; x++) {
      const m = mat[y * W + x]
      if (m === 0) continue
      let e = EMIT[m]
      let k = inv
      if (m === M.fire) k *= 0.35 + (0.65 * life[y * W + x]) / fireLife
      else if (BURN[m] !== 0 && life[y * W + x] !== 0) { e = FIRE_EMIT; k *= 0.6 }
      if (e[0] + e[1] + e[2] === 0) continue
      const o = (gy * GLOW_W + ((x / TILE) | 0)) * 3
      rgb[o] += e[0] * k
      rgb[o + 1] += e[1] * k
      rgb[o + 2] += e[2] * k
    }
  }
}

function blur(src: Float32Array, tmp: Float32Array): void {
  // 가로
  for (let y = 0; y < GLOW_H; y++)
    for (let x = 0; x < GLOW_W; x++)
      for (let c = 0; c < 3; c++) {
        const o = (y * GLOW_W + x) * 3 + c
        const l = x > 0 ? src[o - 3] : 0
        const r = x + 1 < GLOW_W ? src[o + 3] : 0
        tmp[o] = (l + src[o] * 2 + r) / 4
      }
  // 세로
  for (let y = 0; y < GLOW_H; y++)
    for (let x = 0; x < GLOW_W; x++)
      for (let c = 0; c < 3; c++) {
        const o = (y * GLOW_W + x) * 3 + c
        const u = y > 0 ? tmp[o - GLOW_W * 3] : 0
        const d = y + 1 < GLOW_H ? tmp[o + GLOW_W * 3] : 0
        src[o] = (u + tmp[o] * 2 + d) / 4
      }
}

export class GlowLayer {
  private rgb = new Float32Array(GLOW_W * GLOW_H * 3)
  private tmp = new Float32Array(GLOW_W * GLOW_H * 3)
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private img: ImageData
  /** 밝기 배율 — 블록 평균이라 키워야 후광이 보인다 */
  gain = 2.2

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = GLOW_W
    this.canvas.height = GLOW_H
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('2d context unavailable')
    this.ctx = ctx
    this.img = ctx.createImageData(GLOW_W, GLOW_H)
  }

  compose(dst: CanvasRenderingContext2D, g: Grid, tick: number): void {
    accumulateGlow(g, this.rgb)
    blur(this.rgb, this.tmp)
    blur(this.rgb, this.tmp)
    // 미세한 숨쉬기(샌드박스 flicker와 같은 결) — 렌더 전용이라 결정성과 무관
    const gain = this.gain * (0.94 + 0.06 * Math.sin(tick * 0.35))
    const d = this.img.data
    for (let i = 0, j = 0; i < GLOW_W * GLOW_H; i++, j += 3) {
      d[i * 4] = Math.min(255, this.rgb[j] * gain * 255)
      d[i * 4 + 1] = Math.min(255, this.rgb[j + 1] * gain * 255)
      d[i * 4 + 2] = Math.min(255, this.rgb[j + 2] * gain * 255)
      d[i * 4 + 3] = 255
    }
    this.ctx.putImageData(this.img, 0, 0)
    dst.save()
    dst.imageSmoothingEnabled = true
    dst.globalCompositeOperation = 'lighter'
    dst.drawImage(this.canvas, 0, 0, W, H)
    dst.restore()
  }
}
