/**
 * 레벨 정의 포맷 (§7.5). 좌표·rect는 전부 타일 단위(40×60), 셀 좌표는 ×4.
 * defineLevel은 형태 검사만 하고 정의를 그대로 돌려준다 — 파싱은 parse.ts.
 */
import type { MatSlug } from '../sim/materials'

/** [tx, ty, tw, th] 타일 단위 */
export type TileRect = [number, number, number, number]

export interface SpoutDef {
  mat: MatSlug
  /** 틱당 방출 셀 수(그룹 전체 합) */
  rate: number
  /** 총 방출량 */
  total: number
}

export type TargetKind = 'fill' | 'ignite' | 'reach' | 'protect' | 'bad'

export interface TargetDef {
  id: string
  kind: TargetKind
  rect: TileRect
  mat?: MatSlug
  need?: number
  holdTicks?: number
}

export interface GemDef {
  rect: TileRect
  mat: MatSlug
}

export type Verb = 'dig' | 'drop' | 'line' | 'trigger'

/**
 * 리플레이·개발자 해 액션 튜플: [tick, verb, tx, ty, tx2, ty2, arg?]
 * drop의 arg = 'spark'|'ice'|'acid', line의 arg = 'fuse'|'plank', trigger의 arg = gate 이름.
 */
export type ActionTuple = [number, Verb, number, number, number, number, string?]

export interface LevelDef {
  id: string
  v: number
  world: number
  name: string
  salt: number
  legend: Record<string, string>
  map: string
  spouts?: Record<string, SpoutDef>
  targets: TargetDef[]
  gems?: GemDef[]
  verbs?: {
    dig?: { maxLen: number } | null
    drop?: { kind: 'spark' | 'ice' | 'acid'; charges: number } | null
    line?: { mat: 'fuse' | 'plank'; maxLen: number; charges?: number } | null
    trigger?: string[] | null
  }
  legalTiles?: 'auto'
  par?: { moves: number; secs: number }
  dev?: ActionTuple[]
  hint?: string
}

function checkRect(r: TileRect, what: string): void {
  if (r.length !== 4 || r.some((n) => !Number.isInteger(n))) throw new Error(`${what}: rect must be 4 integers (tiles)`)
  if (r[2] < 2 || r[3] < 2) throw new Error(`${what}: sensor rect must be at least 2×2 tiles (§4.2)`)
}

export function defineLevel(def: LevelDef): LevelDef {
  if (!def.id) throw new Error('level id required')
  if (!Number.isInteger(def.salt) || def.salt < 0) throw new Error(`${def.id}: salt must be a non-negative integer`)
  for (const t of def.targets) checkRect(t.rect, `${def.id} target ${t.id}`)
  for (const [i, g] of (def.gems ?? []).entries()) checkRect(g.rect, `${def.id} gem ${i}`)
  return def
}
