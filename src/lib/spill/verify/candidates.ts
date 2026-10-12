import type { ParsedLevel } from '../level/parse'
import type { PlayAction } from '../play/attempt'
import { stampSize } from '../play/input'
import { tilePath } from '../sim/actions'
import { TH, TILE, TW, W } from '../sim/grid'
import { M } from '../sim/materials'

export interface Candidate {
  key: string
  group: string
  action: PlayAction
}

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]

function tileMask(level: ParsedLevel, test: (m: number) => boolean, all: boolean): Uint8Array {
  const out = new Uint8Array(TW * TH)
  for (let ty = 0; ty < TH; ty++)
    for (let tx = 0; tx < TW; tx++) {
      let hit = all
      for (let y = ty * TILE; y < ty * TILE + TILE; y++)
        for (let x = tx * TILE; x < tx * TILE + TILE; x++) {
          const t = test(level.mat[y * W + x])
          if (all && !t) hit = false
          if (!all && t) hit = true
        }
      out[ty * TW + tx] = hit ? 1 : 0
    }
  return out
}

const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < TW && y < TH

function lines(mask: Uint8Array, maxLen: number, needAll: boolean, verb: 'dig' | 'line', arg?: string): Candidate[] {
  const seen = new Set<string>()
  const out: Candidate[] = []
  for (let len = 0; len < maxLen; len++)
    for (let ty = 0; ty < TH; ty++)
      for (let tx = 0; tx < TW; tx++) {
        if (!mask[ty * TW + tx]) continue
        for (const [dx, dy] of len === 0 ? [[0, 0] as [number, number]] : DIRS) {
          const tx2 = tx + dx * len
          const ty2 = ty + dy * len
          if (!inGrid(tx2, ty2) || !mask[ty2 * TW + tx2]) continue
          const tiles: number[] = []
          let ok = true
          for (const [x, y] of tilePath(tx, ty, tx2, ty2)) {
            if (mask[y * TW + x]) tiles.push(y * TW + x)
            else if (needAll) { ok = false; break }
          }
          if (!ok) continue
          const key = `${verb}:${tiles.sort((a, b) => a - b).join('.')}`
          if (seen.has(key)) continue
          seen.add(key)
          const action: PlayAction = arg === undefined ? { tick: 0, verb, tx, ty, tx2, ty2 } : { tick: 0, verb, tx, ty, tx2, ty2, arg }
          out.push({ key, group: key, action })
        }
      }
  return out
}

export function digCandidates(level: ParsedLevel): Candidate[] {
  const v = level.def.verbs?.dig
  if (!v) return []
  return lines(tileMask(level, (m) => m === M.dirt, false), v.maxLen, false, 'dig')
}

export function lineCandidates(level: ParsedLevel): Candidate[] {
  const v = level.def.verbs?.line
  if (!v) return []
  return lines(tileMask(level, (m) => m === M.empty, true), v.maxLen, true, 'line', v.mat)
}

export function dropCandidates(level: ParsedLevel): Candidate[] {
  const v = level.def.verbs?.drop
  if (!v) return []
  const empty = tileMask(level, (m) => m === M.empty, true)
  const size = stampSize(v.kind)
  const out: Candidate[] = []
  for (let ty = 0; ty + size <= TH; ty++)
    for (let tx = 0; tx + size <= TW; tx++) {
      let ok = true
      for (let y = 0; y < size && ok; y++) for (let x = 0; x < size && ok; x++) if (!empty[(ty + y) * TW + tx + x]) ok = false
      if (!ok) continue
      const key = `drop:${tx}.${ty}`
      out.push({ key, group: key, action: { tick: 0, verb: 'drop', tx, ty, tx2: tx, ty2: ty, arg: v.kind } })
    }
  return out
}

export function triggerCandidates(level: ParsedLevel, step = 6, maxTick = 720): Candidate[] {
  const allowed = level.def.verbs?.trigger ?? []
  const out: Candidate[] = []
  for (const name of level.gates) {
    if (!allowed.includes(name)) continue
    for (let t = 0; t <= maxTick; t += step)
      out.push({ key: `trigger:${name}@${t}`, group: `trigger:${name}`, action: { tick: t, verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: name } })
  }
  return out
}

export function setupCandidates(level: ParsedLevel): Candidate[] {
  return [...digCandidates(level), ...lineCandidates(level), ...dropCandidates(level)]
}

export function allCandidates(level: ParsedLevel, step = 6, maxTick = 720): Candidate[] {
  return [...setupCandidates(level), ...triggerCandidates(level, step, maxTick)]
}

export function shiftAction(a: PlayAction, dx: number, dy: number): PlayAction {
  return { ...a, tx: a.tx + dx, ty: a.ty + dy, tx2: a.tx2 + dx, ty2: a.ty2 + dy }
}
