import type { TargetKind } from '../level/define'
import type { ActionInput } from '../play/input'
import { stampSize, type GateBox } from '../play/input'
import { tilePath } from '../sim/actions'
import { TILE, TW } from '../sim/grid'
import { MATS } from '../sim/materials'
import type { CellRect } from '../sim/sensors'
import type { Fx } from './fx'
import type { GateWindowState } from '../play/gatewin'

export const SPRITE_MIN = 24
export const BADGE_GAP = 2

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export type Glyph = 'pot' | 'torch' | 'bell' | 'crate' | 'skull'

export function glyphFor(kind: TargetKind): Glyph {
  switch (kind) {
    case 'fill': return 'pot'
    case 'ignite': return 'torch'
    case 'reach': return 'bell'
    case 'protect': return 'crate'
    default: return 'skull'
  }
}

export function spriteBox(r: CellRect, cssPerCell: number, min = SPRITE_MIN): Box {
  const w = Math.max(r.w * cssPerCell, min)
  const h = Math.max(r.h * cssPerCell, min)
  const cx = (r.x + r.w / 2) * cssPerCell
  const cy = (r.y + r.h / 2) * cssPerCell
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

export function badgeBox(r: CellRect, cssPerCell: number, cssW: number, cssH: number, size = SPRITE_MIN + 4): Box {
  const cx = (r.x + r.w / 2) * cssPerCell
  let x = cx - size / 2
  let y = r.y * cssPerCell - size - BADGE_GAP
  if (y < 0) y = (r.y + r.h) * cssPerCell + BADGE_GAP
  x = Math.min(Math.max(0, x), Math.max(0, cssW - size))
  y = Math.min(Math.max(0, y), Math.max(0, cssH - size))
  return { x, y, w: size, h: size }
}

export function tileRectCss(tx: number, ty: number, cssPerCell: number): Box {
  const s = TILE * cssPerCell
  return { x: tx * s, y: ty * s, w: s, h: s }
}

export function actionTiles(a: ActionInput): [number, number][] {
  if (a.verb === 'dig' || a.verb === 'line') return tilePath(a.tx, a.ty, a.tx2, a.ty2)
  if (a.verb === 'drop') {
    const n = stampSize(a.arg ?? 'spark')
    const out: [number, number][] = []
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out.push([a.tx + x, a.ty + y])
    return out
  }
  return []
}

export function ringProgress(t: { progress: number; need: number; latched: boolean }): number {
  if (t.latched) return 1
  if (!(t.need > 0)) return 0
  return Math.min(1, Math.max(0, t.progress / t.need))
}

export function pulse(ms: number): number {
  return 0.5 + 0.5 * Math.sin((ms / 900) * Math.PI * 2)
}

export interface GateLook {
  fill: number
  dim: boolean
}

export function gateLook(win: GateWindowState, running: boolean, ms: number): GateLook {
  if (!running) return { fill: 0.25 + 0.45 * 0.3, dim: false }
  if (win === 'before') return { fill: 0.1, dim: true }
  if (win === 'after') return { fill: 0.25 + 0.45 * 0.3, dim: false }
  return { fill: 0.25 + 0.45 * pulse(ms * 2.2), dim: false }
}

export interface OverlayTarget {
  id: string
  kind: TargetKind
  rect: CellRect
  mat: number
  progress: number
  need: number
  latched: boolean
}

export interface OverlayGem {
  rect: CellRect
  mat: number
  got: boolean
}

export interface OverlayGate {
  box: GateBox
  open: boolean
  tappable: boolean
  win?: GateWindowState
}

export interface OverlayGhost {
  action: ActionInput
  ok: boolean
}

export interface OverlayView {
  timeMs: number
  cssW: number
  cssH: number
  cssPerCell: number
  phase: string
  targets: readonly OverlayTarget[]
  gems: readonly OverlayGem[]
  gates: readonly OverlayGate[]
  ghost: OverlayGhost | null
  oldGhosts: readonly ActionInput[]
  legal: Uint8Array | null
}

const OK = 'rgba(238,241,246,0.55)'
const BAD = 'rgba(255,72,64,0.62)'
const LATCH = '#5be38a'
const SKULL = '#ff4a3d'

function matColor(m: number): string {
  return MATS[m]?.color ?? '#eef1f6'
}

export class OverlayRenderer {
  private ctx: CanvasRenderingContext2D
  private dpr = 1

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d context unavailable')
    this.ctx = ctx
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.dpr = dpr > 0 ? dpr : 1
    const w = Math.max(1, Math.round(cssW * this.dpr))
    const h = Math.max(1, Math.round(cssH * this.dpr))
    if (this.canvas.width !== w) this.canvas.width = w
    if (this.canvas.height !== h) this.canvas.height = h
    this.canvas.style.width = `${cssW}px`
    this.canvas.style.height = `${cssH}px`
  }

  draw(v: OverlayView, fx: Fx | null): void {
    const c = this.ctx
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    c.clearRect(0, 0, v.cssW, v.cssH)
    if (v.legal) this.drawLegal(v)
    for (const a of v.oldGhosts) this.drawTiles(actionTiles(a), v.cssPerCell, 'rgba(160,190,255,0.22)', true)
    for (const g of v.gems) this.drawGem(g, v)
    for (const t of v.targets) this.drawTarget(t, v)
    for (const g of v.gates) this.drawGate(g, v)
    if (v.ghost) this.drawTiles(actionTiles(v.ghost.action), v.cssPerCell, v.ghost.ok ? OK : BAD, false)
    if (fx) this.drawFx(fx, v)
  }

  private drawLegal(v: OverlayView): void {
    const c = this.ctx
    const m = v.legal!
    const s = TILE * v.cssPerCell
    c.fillStyle = 'rgba(245,166,35,0.09)'
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue
      const tx = i % TW
      const ty = (i - tx) / TW
      c.fillRect(tx * s + 0.5, ty * s + 0.5, s - 1, s - 1)
    }
  }

  private drawTiles(tiles: [number, number][], cpc: number, color: string, dashed: boolean): void {
    const c = this.ctx
    const s = TILE * cpc
    c.save()
    if (dashed) {
      c.strokeStyle = color
      c.setLineDash([3, 3])
      c.lineWidth = 1
      for (const [tx, ty] of tiles) c.strokeRect(tx * s + 0.5, ty * s + 0.5, s - 1, s - 1)
    } else {
      c.fillStyle = color
      for (const [tx, ty] of tiles) c.fillRect(tx * s, ty * s, s, s)
    }
    c.restore()
  }

  private drawGem(g: OverlayGem, v: OverlayView): void {
    if (g.got) return
    const c = this.ctx
    const b = spriteBox(g.rect, v.cssPerCell)
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const r = Math.min(b.w, b.h) / 2 - 2
    const p = pulse(v.timeMs + 300)
    c.save()
    c.globalAlpha = 0.75 + 0.25 * p
    c.beginPath()
    c.moveTo(cx, cy - r)
    c.lineTo(cx + r * 0.8, cy - r * 0.2)
    c.lineTo(cx, cy + r)
    c.lineTo(cx - r * 0.8, cy - r * 0.2)
    c.closePath()
    c.fillStyle = 'rgba(127,240,255,0.28)'
    c.fill()
    c.lineWidth = 2
    c.strokeStyle = '#7ff0ff'
    c.stroke()
    c.beginPath()
    c.moveTo(cx - r * 0.8, cy - r * 0.2)
    c.lineTo(cx + r * 0.8, cy - r * 0.2)
    c.lineWidth = 1
    c.stroke()
    c.restore()
  }

  private drawTarget(t: OverlayTarget, v: OverlayView): void {
    const c = this.ctx
    const cpc = v.cssPerCell
    const bad = t.kind === 'bad'
    const color = bad ? SKULL : t.latched ? LATCH : matColor(t.mat === 0 ? 14 : t.mat)
    const p = t.latched ? 1 : pulse(v.timeMs)
    c.save()
    c.lineWidth = t.latched ? 2 : 1.5
    c.strokeStyle = color
    c.globalAlpha = t.latched ? 0.9 : 0.45 + 0.45 * p
    if (!t.latched) c.setLineDash([4, 3])
    c.strokeRect(t.rect.x * cpc + 0.75, t.rect.y * cpc + 0.75, t.rect.w * cpc - 1.5, t.rect.h * cpc - 1.5)
    c.restore()
    const b = badgeBox(t.rect, cpc, v.cssW, v.cssH)
    this.drawBadge(b, glyphFor(t.kind), color, bad ? 0 : ringProgress(t), t.latched)
  }

  private drawBadge(b: Box, glyph: Glyph, color: string, frac: number, done: boolean): void {
    const c = this.ctx
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const r = b.w / 2
    c.save()
    c.beginPath()
    c.arc(cx, cy, r - 1, 0, Math.PI * 2)
    c.fillStyle = 'rgba(7,9,13,0.72)'
    c.fill()
    c.lineWidth = 2
    c.strokeStyle = 'rgba(255,255,255,0.14)'
    c.stroke()
    if (frac > 0) {
      c.beginPath()
      c.arc(cx, cy, r - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac)
      c.strokeStyle = done ? LATCH : color
      c.lineWidth = 3
      c.stroke()
    }
    c.fillStyle = done ? LATCH : color
    c.strokeStyle = done ? LATCH : color
    c.lineWidth = 1.6
    const k = r * 0.5
    switch (glyph) {
      case 'pot':
        c.beginPath()
        c.moveTo(cx - k, cy - k * 0.6)
        c.lineTo(cx - k * 0.8, cy + k * 0.8)
        c.lineTo(cx + k * 0.8, cy + k * 0.8)
        c.lineTo(cx + k, cy - k * 0.6)
        c.stroke()
        break
      case 'torch':
        c.beginPath()
        c.moveTo(cx, cy - k)
        c.quadraticCurveTo(cx + k * 0.8, cy, cx, cy + k * 0.4)
        c.quadraticCurveTo(cx - k * 0.8, cy, cx, cy - k)
        c.fill()
        c.fillRect(cx - 1, cy + k * 0.4, 2, k * 0.6)
        break
      case 'bell':
        c.beginPath()
        c.moveTo(cx - k * 0.8, cy + k * 0.5)
        c.quadraticCurveTo(cx - k * 0.7, cy - k, cx, cy - k)
        c.quadraticCurveTo(cx + k * 0.7, cy - k, cx + k * 0.8, cy + k * 0.5)
        c.closePath()
        c.fill()
        c.beginPath()
        c.arc(cx, cy + k * 0.75, k * 0.18, 0, Math.PI * 2)
        c.fill()
        break
      case 'crate':
        c.strokeRect(cx - k * 0.75, cy - k * 0.75, k * 1.5, k * 1.5)
        c.beginPath()
        c.moveTo(cx - k * 0.75, cy - k * 0.75)
        c.lineTo(cx + k * 0.75, cy + k * 0.75)
        c.stroke()
        break
      case 'skull':
        c.beginPath()
        c.arc(cx, cy - k * 0.15, k * 0.75, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = 'rgba(7,9,13,0.9)'
        c.beginPath()
        c.arc(cx - k * 0.3, cy - k * 0.2, k * 0.18, 0, Math.PI * 2)
        c.arc(cx + k * 0.3, cy - k * 0.2, k * 0.18, 0, Math.PI * 2)
        c.fill()
        break
    }
    if (done) {
      c.strokeStyle = '#07090D'
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(cx + r * 0.25, cy + r * 0.45)
      c.lineTo(cx + r * 0.42, cy + r * 0.62)
      c.lineTo(cx + r * 0.75, cy + r * 0.25)
      c.stroke()
    }
    c.restore()
  }

  private drawGate(g: OverlayGate, v: OverlayView): void {
    if (g.open || !g.tappable || g.box.w === 0) return
    const c = this.ctx
    const cpc = v.cssPerCell
    const cx = (g.box.x + g.box.w / 2) * cpc
    const cy = (g.box.y + g.box.h / 2) * cpc
    const look = gateLook(g.win ?? 'always', v.phase === 'run' || v.phase === 'paused', v.timeMs)
    c.save()
    c.beginPath()
    c.arc(cx, cy, 13, 0, Math.PI * 2)
    c.fillStyle = `rgba(201,162,39,${look.fill})`
    c.fill()
    c.lineWidth = 2
    c.strokeStyle = look.dim ? 'rgba(255,213,74,0.4)' : '#ffd54a'
    c.stroke()
    c.fillStyle = '#07090D'
    c.beginPath()
    c.moveTo(cx + 2, cy - 8)
    c.lineTo(cx - 4, cy + 1)
    c.lineTo(cx, cy + 1)
    c.lineTo(cx - 2, cy + 8)
    c.lineTo(cx + 4, cy - 1)
    c.lineTo(cx, cy - 1)
    c.closePath()
    c.fill()
    c.restore()
  }

  private drawFx(fx: Fx, v: OverlayView): void {
    const c = this.ctx
    const cpc = v.cssPerCell
    c.save()
    for (const q of fx.particles) {
      c.globalAlpha = Math.max(0, 1 - q.age / q.life)
      c.fillStyle = q.color
      const s = q.size * cpc
      c.fillRect(q.x * cpc - s / 2, q.y * cpc - s / 2, s, s)
    }
    const a = fx.flashAlpha()
    if (a > 0) {
      c.globalAlpha = Math.min(1, a)
      c.fillStyle = fx.flashColor()
      c.fillRect(0, 0, v.cssW, v.cssH)
    }
    c.restore()
  }
}
