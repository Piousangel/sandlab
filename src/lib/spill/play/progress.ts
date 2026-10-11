import type { RunResult } from './attempt'
import { compareResults, starCount, type Rank } from './score'

export const KEY_PREFIX = 'spill.v1.lvl.'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export interface LevelRecord {
  v: 1
  stars: number
  best: Rank | null
  clears: number
}

export interface RecordOutcome {
  record: LevelRecord
  newBest: boolean
  firstClear: boolean
  saved: boolean
}

export function defaultStorage(): StorageLike | null {
  try {
    const s = (globalThis as { localStorage?: StorageLike }).localStorage
    return s ?? null
  } catch {
    return null
  }
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

function validRank(b: unknown): b is Rank {
  if (!b || typeof b !== 'object') return false
  const o = b as Record<string, unknown>
  return isCount(o.moves) && isCount(o.ticks) && isCount(o.dug)
}

function validRecord(x: unknown): x is LevelRecord {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false
  const o = x as Record<string, unknown>
  return o.v === 1 && isCount(o.stars) && o.stars <= 7 && isCount(o.clears) && (o.best === null || validRank(o.best))
}

export function loadRecord(id: string, storage: StorageLike | null = defaultStorage()): LevelRecord | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(KEY_PREFIX + id)
    if (raw === null) return null
    const x: unknown = JSON.parse(raw)
    if (!validRecord(x)) return null
    return { v: 1, stars: x.stars, best: x.best ? { moves: x.best.moves, ticks: x.best.ticks, dug: x.best.dug } : null, clears: x.clears }
  } catch {
    return null
  }
}

export function isNewBest(prev: LevelRecord | null, r: Rank): boolean {
  if (!prev || !prev.best) return true
  return compareResults(r, prev.best) < 0
}

export function recordResult(id: string, r: RunResult, stars: number, storage: StorageLike | null = defaultStorage()): RecordOutcome {
  const prev = loadRecord(id, storage)
  const empty: LevelRecord = { v: 1, stars: 0, best: null, clears: 0 }
  if (r.outcome !== 'cleared') return { record: prev ?? empty, newBest: false, firstClear: false, saved: false }
  const rank = { moves: r.moves, ticks: r.ticks, dug: r.dug }
  const newBest = isNewBest(prev, rank)
  const base = prev ?? empty
  const record: LevelRecord = {
    v: 1,
    stars: (base.stars | stars) & 7,
    best: newBest ? rank : base.best,
    clears: base.clears + 1,
  }
  let saved = false
  if (storage) {
    try {
      storage.setItem(KEY_PREFIX + id, JSON.stringify(record))
      saved = true
    } catch {
      saved = false
    }
  }
  return { record, newBest, firstClear: !prev || prev.clears === 0, saved }
}

export function totalStars(ids: readonly string[], storage: StorageLike | null = defaultStorage()): number {
  let n = 0
  for (const id of ids) {
    const rec = loadRecord(id, storage)
    if (rec) n += starCount(rec.stars)
  }
  return n
}
