/**
 * 레벨 정의 → 초기 격자 (§7.5). 맵 문자 1개 = 2×2셀, 80열 × 120행.
 * gate·spout 셀은 life 칸에 그룹 번호(1부터)를 담는다 — 정적 셀이라 수명이 필요 없다.
 */
import type { LevelDef, TargetKind } from './define'
import { INIT_LIFE, M, matId } from '../sim/materials'
import { H, N, TILE, W } from '../sim/grid'

export const MAP_COLS = W / 2
export const MAP_ROWS = H / 2

export interface ParsedSpout {
  key: string
  mat: number
  rate: number
  total: number
}

export interface CellRect {
  x: number
  y: number
  w: number
  h: number
}

export interface ParsedTarget extends CellRect {
  id: string
  kind: TargetKind
  mat: number
  need: number
  holdTicks: number
}

export interface ParsedLevel {
  def: LevelDef
  mat: Uint8Array
  life: Uint8Array
  /** gate 그룹 이름. 셀 life = 인덱스+1 */
  gates: string[]
  /** spout 그룹. 셀 life = 인덱스+1 */
  spouts: ParsedSpout[]
  targets: ParsedTarget[]
  gems: (CellRect & { mat: number })[]
}

const tileRect = (r: [number, number, number, number]): CellRect => ({
  x: r[0] * TILE, y: r[1] * TILE, w: r[2] * TILE, h: r[3] * TILE,
})

export function parseLevel(def: LevelDef): ParsedLevel {
  const rows = def.map.replace(/\r/g, '').trim().split('\n')
  if (rows.length !== MAP_ROWS) throw new Error(`${def.id}: map must have ${MAP_ROWS} rows, got ${rows.length}`)

  const gates: string[] = []
  const spouts: ParsedSpout[] = []
  type Entry = { mat: number; tag: number }
  const legend = new Map<string, Entry>()
  for (const ch of Object.keys(def.legend))
    if (ch.length !== 1) throw new Error(`${def.id}: legend key must be one character: "${ch}"`)
  // 맵에 실제로 나온 문자만 해석한다 — 공용 범례에 안 쓰는 spout가 있어도 된다.
  const resolve = (ch: string): Entry | undefined => {
    const hit = legend.get(ch)
    if (hit) return hit
    const spec = def.legend[ch]
    if (spec === undefined) return undefined
    const [slug, group] = spec.split(':')
    const mat = matId(slug)
    let tag = INIT_LIFE[mat]
    if (mat === M.gate) {
      if (!group) throw new Error(`${def.id}: gate legend needs a name (gate:g1)`)
      if (!gates.includes(group)) gates.push(group)
      tag = gates.indexOf(group) + 1
    } else if (mat === M.spout) {
      if (!group) throw new Error(`${def.id}: spout legend needs a name (spout:s1)`)
      const sd = def.spouts?.[group]
      if (!sd) throw new Error(`${def.id}: spout "${group}" is not defined in spouts`)
      if (!spouts.some((s) => s.key === group)) spouts.push({ key: group, mat: matId(sd.mat), rate: sd.rate, total: sd.total })
      tag = spouts.findIndex((s) => s.key === group) + 1
    }
    const e = { mat, tag }
    legend.set(ch, e)
    return e
  }
  // 범례의 재료 이름 오타는 맵에 안 나와도 잡는다
  for (const spec of Object.values(def.legend)) matId(spec.split(':')[0])

  const mat = new Uint8Array(N)
  const life = new Uint8Array(N)
  rows.forEach((row, ry) => {
    if (row.length !== MAP_COLS) throw new Error(`${def.id}: map row ${ry} has ${row.length} cols, expected ${MAP_COLS}`)
    for (let rx = 0; rx < MAP_COLS; rx++) {
      const e = resolve(row[rx])
      if (!e) throw new Error(`${def.id}: map char "${row[rx]}" at row ${ry} col ${rx} is not in legend`)
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 2; dx++) {
          const i = (ry * 2 + dy) * W + rx * 2 + dx
          mat[i] = e.mat
          life[i] = e.tag
        }
    }
  })

  const targets = def.targets.map((t) => ({
    id: t.id, kind: t.kind, ...tileRect(t.rect),
    mat: t.mat ? matId(t.mat) : M.empty, need: t.need ?? 1, holdTicks: t.holdTicks ?? 0,
  }))
  const gems = (def.gems ?? []).map((g) => ({ ...tileRect(g.rect), mat: matId(g.mat) }))
  return { def, mat, life, gates, spouts, targets, gems }
}
