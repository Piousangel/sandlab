import type { Verb } from '../level/define'
import type { ParsedLevel } from '../level/parse'
import { tilePath } from '../sim/actions'
import { H, TH, TILE, TW, W, type Grid } from '../sim/grid'
import { M } from '../sim/materials'
import type { CellRect } from '../sim/sensors'

export const DROP_GHOST_PX = 24
export const HIT_PX = 44

export interface TileLine {
  tx: number
  ty: number
  tx2: number
  ty2: number
}

export interface ActionInput extends TileLine {
  verb: Verb
  arg?: string
}

export interface CssRect {
  left: number
  top: number
  width: number
  height: number
}

export interface Usage {
  drops: number
  lines: number
  triggered: readonly string[]
}

export type RejectReason = 'verb' | 'phase' | 'shape' | 'bounds' | 'maxLen' | 'illegal' | 'charges' | 'gate' | 'limit'

export type Check =
  | { ok: true; action: ActionInput; dug: number }
  | { ok: false; reason: RejectReason }

const TAN_22_5_Q = 414

export function snapLine(fx: number, fy: number, ex: number, ey: number, maxLen: number): TileLine {
  const tx = clampTile(Math.floor(fx), TW)
  const ty = clampTile(Math.floor(fy), TH)
  const dx = ex - (tx + 0.5)
  const dy = ey - (ty + 0.5)
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  let sx = Math.sign(dx)
  let sy = Math.sign(dy)
  let len: number
  if (ay * 1000 <= ax * TAN_22_5_Q) { sy = 0; len = Math.round(ax) }
  else if (ax * 1000 <= ay * TAN_22_5_Q) { sx = 0; len = Math.round(ay) }
  else len = Math.round((ax + ay) / 2)
  len = Math.min(len, Math.max(0, maxLen - 1))
  if (sx > 0) len = Math.min(len, TW - 1 - tx)
  if (sx < 0) len = Math.min(len, tx)
  if (sy > 0) len = Math.min(len, TH - 1 - ty)
  if (sy < 0) len = Math.min(len, ty)
  return { tx, ty, tx2: tx + sx * len, ty2: ty + sy * len }
}

const clampTile = (n: number, max: number) => (n < 0 ? 0 : n >= max ? max - 1 : n)

export function pointerToTile(px: number, py: number, rect: CssRect): { fx: number; fy: number } {
  return { fx: ((px - rect.left) / rect.width) * TW, fy: ((py - rect.top) / rect.height) * TH }
}

export function stampSize(kind: string): number {
  return kind === 'ice' ? 2 : 1
}

export function dropAnchor(px: number, py: number, rect: CssRect, size: number): { tx: number; ty: number } {
  const { fx, fy } = pointerToTile(px, py - DROP_GHOST_PX, rect)
  const half = (size - 1) / 2
  const c = (f: number, max: number) => Math.min(Math.max(Math.floor(f - half), 0), max - size)
  return { tx: c(fx, TW), ty: c(fy, TH) }
}

export interface GateBox extends CellRect {
  name: string
}

export function gateBoxes(level: ParsedLevel): GateBox[] {
  return level.gates.map((name, k) => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1
    for (let i = 0; i < level.mat.length; i++) {
      if (level.mat[i] !== M.gate || level.life[i] !== k + 1) continue
      const x = i % W
      const y = (i - x) / W
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    return x1 < 0 ? { name, x: 0, y: 0, w: 0, h: 0 } : { name, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
  })
}

export function hitGate(px: number, py: number, rect: CssRect, boxes: readonly GateBox[], exclude: readonly string[] = []): string | null {
  const css = rect.width / W
  let best: string | null = null
  let bestD = Infinity
  for (const b of boxes) {
    if (b.w === 0 || exclude.includes(b.name)) continue
    const cx = rect.left + (b.x + b.w / 2) * css
    const cy = rect.top + (b.y + b.h / 2) * css
    const hw = Math.max((b.w * css) / 2, HIT_PX / 2)
    const hh = Math.max((b.h * css) / 2, HIT_PX / 2)
    const dx = Math.abs(px - cx)
    const dy = Math.abs(py - cy)
    if (dx > hw || dy > hh) continue
    const d = dx * dx + dy * dy
    if (d < bestD) { bestD = d; best = b.name }
  }
  return best
}

function tileHas(g: Grid, tx: number, ty: number, m: number): boolean {
  for (let y = ty * TILE; y < ty * TILE + TILE; y++)
    for (let x = tx * TILE; x < tx * TILE + TILE; x++) if (g.mat[y * W + x] === m) return true
  return false
}

function tileEmpty(g: Grid, tx: number, ty: number): boolean {
  for (let y = ty * TILE; y < ty * TILE + TILE; y++)
    for (let x = tx * TILE; x < tx * TILE + TILE; x++) if (g.mat[y * W + x] !== M.empty) return false
  return true
}

export function legalMask(g: Grid, verb: 'dig' | 'drop' | 'line'): Uint8Array {
  const out = new Uint8Array(TW * TH)
  for (let ty = 0; ty < TH; ty++)
    for (let tx = 0; tx < TW; tx++)
      out[ty * TW + tx] = (verb === 'dig' ? tileHas(g, tx, ty, M.dirt) : tileEmpty(g, tx, ty)) ? 1 : 0
  return out
}

const inGrid = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < TW && ty < TH
const isInt = (...n: number[]) => n.every((v) => Number.isInteger(v))

function checkLine(a: ActionInput, maxLen: number): RejectReason | null {
  if (!isInt(a.tx, a.ty, a.tx2, a.ty2)) return 'shape'
  const dx = a.tx2 - a.tx
  const dy = a.ty2 - a.ty
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return 'shape'
  if (!inGrid(a.tx, a.ty) || !inGrid(a.tx2, a.ty2)) return 'bounds'
  if (Math.max(Math.abs(dx), Math.abs(dy)) + 1 > maxLen) return 'maxLen'
  return null
}

export function checkAction(level: ParsedLevel, g: Grid, a: ActionInput, used: Usage): Check {
  const verbs = level.def.verbs ?? {}
  switch (a.verb) {
    case 'dig': {
      const v = verbs.dig
      if (!v) return { ok: false, reason: 'verb' }
      const bad = checkLine(a, v.maxLen)
      if (bad) return { ok: false, reason: bad }
      let dug = 0
      for (const [x, y] of tilePath(a.tx, a.ty, a.tx2, a.ty2)) if (tileHas(g, x, y, M.dirt)) dug++
      if (dug === 0) return { ok: false, reason: 'illegal' }
      return { ok: true, action: { verb: 'dig', tx: a.tx, ty: a.ty, tx2: a.tx2, ty2: a.ty2 }, dug }
    }
    case 'line': {
      const v = verbs.line
      if (!v || (a.arg !== undefined && a.arg !== v.mat)) return { ok: false, reason: 'verb' }
      const bad = checkLine(a, v.maxLen)
      if (bad) return { ok: false, reason: bad }
      if (v.charges !== undefined && used.lines >= v.charges) return { ok: false, reason: 'charges' }
      for (const [x, y] of tilePath(a.tx, a.ty, a.tx2, a.ty2)) if (!tileEmpty(g, x, y)) return { ok: false, reason: 'illegal' }
      return { ok: true, action: { verb: 'line', tx: a.tx, ty: a.ty, tx2: a.tx2, ty2: a.ty2, arg: v.mat }, dug: 0 }
    }
    case 'drop': {
      const v = verbs.drop
      if (!v || (a.arg !== undefined && a.arg !== v.kind)) return { ok: false, reason: 'verb' }
      if (!isInt(a.tx, a.ty)) return { ok: false, reason: 'shape' }
      const size = stampSize(v.kind)
      if (!inGrid(a.tx, a.ty) || !inGrid(a.tx + size - 1, a.ty + size - 1)) return { ok: false, reason: 'bounds' }
      if (used.drops >= v.charges) return { ok: false, reason: 'charges' }
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) if (!tileEmpty(g, a.tx + x, a.ty + y)) return { ok: false, reason: 'illegal' }
      return { ok: true, action: { verb: 'drop', tx: a.tx, ty: a.ty, tx2: a.tx, ty2: a.ty, arg: v.kind }, dug: 0 }
    }
    case 'trigger': {
      const v = verbs.trigger
      if (!v || v.length === 0) return { ok: false, reason: 'verb' }
      const name = a.arg ?? ''
      if (!v.includes(name) || !level.gates.includes(name) || used.triggered.includes(name)) return { ok: false, reason: 'gate' }
      return { ok: true, action: { verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: name }, dug: 0 }
    }
  }
  return { ok: false, reason: 'verb' }
}
