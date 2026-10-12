import { describe, it, expect } from 'vitest'
import { validateLevelClear, histPayload, handleSpill, levelHashes, type SpillDb } from './spill'
import { POT_LEVEL, GATE_LEVEL } from '../src/lib/spill/play/fixtures'
import { levelHash } from '../src/lib/spill/level/hash'

const known = levelHashes([POT_LEVEL, GATE_LEVEL])
const lh = levelHash(POT_LEVEL)
const pid = '0123456789abcdef0123456789abcdef'
const ok = { pid, moves: 1, ticks: 345, lh }

describe('validateLevelClear (§7.6 POST /api/spill/level/:id/clear)', () => {
  it('정상', () => {
    expect(validateLevelClear('t-pot', ok, known)).toEqual({ id: 't-pot', pid, moves: 1, ticks: 345, lh, tbucket: 11 })
  })
  it('모르는 레벨·다른 lh는 거부', () => {
    expect(validateLevelClear('nope', ok, known)).toBeNull()
    expect(validateLevelClear('t-pot', { ...ok, lh: '00000000' }, known)).toBeNull()
    expect(validateLevelClear('t-gate', ok, known)).toBeNull()
  })
  it('pid는 32자리 소문자 hex', () => {
    expect(validateLevelClear('t-pot', { ...ok, pid: 'x' }, known)).toBeNull()
    expect(validateLevelClear('t-pot', { ...ok, pid: pid.toUpperCase() }, known)).toBeNull()
  })
  it('moves 1..32 정수, ticks 1..2700 정수', () => {
    for (const moves of [0, 33, 1.5, '1', -1]) expect(validateLevelClear('t-pot', { ...ok, moves }, known)).toBeNull()
    for (const ticks of [0, 2701, 3.2, null]) expect(validateLevelClear('t-pot', { ...ok, ticks }, known)).toBeNull()
    expect(validateLevelClear('t-pot', { ...ok, moves: 32, ticks: 2700 }, known)).not.toBeNull()
  })
  it('형식이 틀린 본문', () => {
    expect(validateLevelClear('t-pot', null, known)).toBeNull()
    expect(validateLevelClear('t-pot', [], known)).toBeNull()
    expect(validateLevelClear('t-pot', 'x', known)).toBeNull()
  })
})

describe('histPayload', () => {
  it('{cells:[[moves,bucket,cnt]], total}', () => {
    expect(histPayload([{ moves: 1, tbucket: 10, cnt: 3 }, { moves: 2, tbucket: 12, cnt: 4 }])).toEqual({ cells: [[1, 10, 3], [2, 12, 4]], total: 7 })
    expect(histPayload([])).toEqual({ cells: [], total: 0 })
  })
})

class FakeDb implements SpillDb {
  seen = new Set<string>()
  hist = new Map<string, number>()
  prepare(sql: string) {
    const db = this
    let args: unknown[] = []
    const stmt = {
      bind(...a: unknown[]) { args = a; return stmt },
      async run() {
        if (sql.includes('spill_seen')) {
          const k = `${args[0]}|${args[1]}`
          if (db.seen.has(k)) return { meta: { changes: 0 } }
          db.seen.add(k)
          return { meta: { changes: 1 } }
        }
        if (sql.includes('INSERT INTO spill_hist')) {
          const k = args.slice(0, 4).join('|')
          db.hist.set(k, (db.hist.get(k) ?? 0) + 1)
          return { meta: { changes: 1 } }
        }
        throw new Error('unexpected sql ' + sql)
      },
      async all<T>() {
        const [id, h] = args
        const results = [...db.hist.entries()]
          .map(([k, cnt]) => { const [lid, lh2, moves, tb] = k.split('|'); return { lid, lh2, moves: Number(moves), tbucket: Number(tb), cnt } })
          .filter((r) => r.lid === id && r.lh2 === h)
          .map(({ moves, tbucket, cnt }) => ({ moves, tbucket, cnt }))
        return { results: results as T[] }
      },
    }
    return stmt
  }
}

const req = (path: string, method = 'GET', body?: unknown) =>
  new Request(`https://sandlab.app${path}`, { method, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })

describe('handleSpill', () => {
  it('(id, pid) 최초 1회만 분포에 반영', async () => {
    const db = new FakeDb()
    const r1 = await handleSpill(req('/api/spill/level/t-pot/clear', 'POST', ok), db, known)
    expect(r1?.status).toBe(201)
    expect(await r1!.json()).toEqual({ ok: true, counted: true })
    const r2 = await handleSpill(req('/api/spill/level/t-pot/clear', 'POST', { ...ok, ticks: 400 }), db, known)
    expect(await r2!.json()).toEqual({ ok: true, counted: false })
    const h = await handleSpill(req('/api/spill/level/t-pot/hist'), db, known)
    expect(h?.status).toBe(200)
    expect(h!.headers.get('cache-control')).toContain('max-age=300')
    expect(await h!.json()).toEqual({ cells: [[1, 11, 1]], total: 1 })
  })
  it('잘못된 요청은 400, 모르는 레벨은 404', async () => {
    const db = new FakeDb()
    expect((await handleSpill(req('/api/spill/level/t-pot/clear', 'POST', '{bad'), db, known))!.status).toBe(400)
    expect((await handleSpill(req('/api/spill/level/t-pot/clear', 'POST', { ...ok, moves: 0 }), db, known))!.status).toBe(400)
    expect((await handleSpill(req('/api/spill/level/zzz/clear', 'POST', ok), db, known))!.status).toBe(404)
    expect((await handleSpill(req('/api/spill/level/zzz/hist'), db, known))!.status).toBe(404)
  })
  it('다른 경로·메서드는 null(다음 핸들러로)', async () => {
    const db = new FakeDb()
    expect(await handleSpill(req('/api/scenes'), db, known)).toBeNull()
    expect(await handleSpill(req('/api/spill/level/t-pot/clear'), db, known)).toBeNull()
    expect(await handleSpill(req('/api/spill/level/t-pot/hist', 'POST', {}), db, known)).toBeNull()
  })
})
