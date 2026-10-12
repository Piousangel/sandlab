import type { LevelDef } from '../src/lib/spill/level/define'
import { levelHash } from '../src/lib/spill/level/hash'
import { tbucket } from '../src/lib/spill/client/hist'
import { isPid } from '../src/lib/spill/client/pid'
import { parTicks } from '../src/lib/spill/play/score'

export const MAX_MOVES = 32
export const MAX_TICKS = 2700
export const CLEARS_PER_HOUR = 40
export const FLOOR_RATIO = 0.4

interface Stmt {
  bind(...vals: unknown[]): Stmt
  all<T = unknown>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}

export interface SpillDb {
  prepare(query: string): Stmt
}

export interface LevelClear {
  id: string
  pid: string
  moves: number
  ticks: number
  lh: string
  tbucket: number
}

export function levelHashes(levels: readonly LevelDef[]): Map<string, string> {
  return new Map(levels.map((l) => [l.id, levelHash(l)]))
}

export function levelFloors(levels: readonly LevelDef[]): Map<string, number> {
  return new Map(levels.map((l) => [l.id, l.par ? Math.floor(parTicks(l.par.secs) * FLOOR_RATIO) : 1]))
}

export interface SpillCtx {
  ip?: string
  now?: number
  floors?: ReadonlyMap<string, number>
}

const intIn = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi

export function validateLevelClear(id: string, body: unknown, known: ReadonlyMap<string, string>, floors?: ReadonlyMap<string, number>): LevelClear | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  const lh = known.get(id)
  if (!lh || b.lh !== lh) return null
  if (!isPid(b.pid)) return null
  if (!intIn(b.moves, 1, MAX_MOVES) || !intIn(b.ticks, floors?.get(id) ?? 1, MAX_TICKS)) return null
  return { id, pid: b.pid, moves: b.moves, ticks: b.ticks, lh, tbucket: tbucket(b.ticks) }
}

export function histPayload(rows: readonly { moves: number; tbucket: number; cnt: number }[]) {
  return { cells: rows.map((r) => [r.moves, r.tbucket, r.cnt] as [number, number, number]), total: rows.reduce((n, r) => n + r.cnt, 0) }
}

function json(data: unknown, status = 200, cache = 'no-store'): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache } })
}

const ROUTE = /^\/api\/spill\/level\/([a-z0-9-]{1,40})\/(clear|hist)$/

export async function handleSpill(request: Request, db: SpillDb, known: ReadonlyMap<string, string>, ctx: SpillCtx = {}): Promise<Response | null> {
  const m = new URL(request.url).pathname.match(ROUTE)
  if (!m) return null
  const [, id, op] = m
  if (op === 'clear' && request.method === 'POST') {
    if (!known.has(id)) return json({ error: 'unknown level' }, 404)
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: 'bad json' }, 400)
    }
    const c = validateLevelClear(id, body, known, ctx.floors)
    if (!c) return json({ error: 'invalid clear' }, 400)
    const ip = ctx.ip ?? ''
    const now = ctx.now ?? Date.now()
    const { results } = await db.prepare('SELECT COUNT(*) AS n FROM spill_seen WHERE ip = ? AND created_at > ?').bind(ip, now - 3600_000).all<{ n: number }>()
    if ((results?.[0]?.n ?? 0) >= CLEARS_PER_HOUR) return json({ error: 'too many clears, try later' }, 429)
    const r = (await db.prepare('INSERT OR IGNORE INTO spill_seen (level_id, pid, ip, created_at) VALUES (?, ?, ?, ?)').bind(c.id, c.pid, ip, now).run()) as { meta?: { changes?: number } }
    const counted = !!r.meta?.changes
    if (counted) {
      await db
        .prepare('INSERT INTO spill_hist (level_id, lh, moves, tbucket, cnt) VALUES (?, ?, ?, ?, 1) ON CONFLICT(level_id, lh, moves, tbucket) DO UPDATE SET cnt = cnt + 1')
        .bind(c.id, c.lh, c.moves, c.tbucket)
        .run()
    }
    return json({ ok: true, counted }, 201)
  }
  if (op === 'hist' && request.method === 'GET') {
    const lh = known.get(id)
    if (!lh) return json({ error: 'unknown level' }, 404)
    const { results } = await db
      .prepare('SELECT moves, tbucket, cnt FROM spill_hist WHERE level_id = ? AND lh = ? ORDER BY moves, tbucket')
      .bind(id, lh)
      .all<{ moves: number; tbucket: number; cnt: number }>()
    return json(histPayload(results ?? []), 200, 'public, max-age=300')
  }
  return null
}
