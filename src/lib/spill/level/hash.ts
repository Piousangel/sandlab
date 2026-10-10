/** 레벨 해시 lh = FNV-1a32(정규화된 JSON) (§7.5). 키 정렬, 공백 없음. */
import type { LevelDef } from './define'

export function normalizeJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return '[' + v.map((x) => (x === undefined ? 'null' : normalizeJson(x))).join(',') + ']'
  const o = v as Record<string, unknown>
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + normalizeJson(o[k])).join(',') + '}'
}

export function fnv1a32(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let h = 0x811c9dc5
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function levelHash(def: LevelDef): string {
  return fnv1a32(normalizeJson({ ...def, map: def.map.trim() }))
}
