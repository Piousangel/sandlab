import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { beforeEach, describe, expect, it } from 'vitest'
import worker from './index'
import { resetVisitCache } from '../src/lib/visitors'

// 워커 전체(default export)를 진짜 SQLite(node:sqlite) 위에서 돌린다 — POST /api/visit → GET /api/visitors.
type Row = Record<string, unknown>
interface SqliteDb {
  exec(sql: string): void
  prepare(sql: string): { all(...v: unknown[]): Row[]; run(...v: unknown[]): { changes: number | bigint } }
}
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as { DatabaseSync: new (p: string) => SqliteDb }

function sqliteEnv(vars: Record<string, string> = {}) {
  const raw = new DatabaseSync(':memory:')
  raw.exec(readFileSync(new URL('../migrations/0002_visitors.sql', import.meta.url), 'utf8'))
  const stmt = (q: string, vals: unknown[] = []) => ({
    bind: (...v: unknown[]) => stmt(q, v),
    all: async () => ({ results: raw.prepare(q).all(...vals) }),
    first: async () => raw.prepare(q).all(...vals)[0] ?? null,
    run: async () => ({ meta: { changes: Number(raw.prepare(q).run(...vals).changes) } }),
  })
  return { raw, env: { ASSETS: { fetch: async () => new Response('asset') }, DB: { prepare: (q: string) => stmt(q), batch: async () => [] }, ...vars } }
}

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const visit = (env: unknown, ip: string, ua = CHROME, extra: Record<string, string> = { 'sec-fetch-site': 'same-origin' }) =>
  worker.fetch(new Request('https://sandlab.app/api/visit', { method: 'POST', headers: { 'cf-connecting-ip': ip, 'user-agent': ua, ...extra } }), env as never)
// 주의: GET은 isolate 15초 캐시가 있어 이 파일에서는 한 번만 읽어 단언한다(표 없음의 null 응답은 src/lib/visitors.test.ts readVisitors가 검사).
const read = async (env: unknown) => (await worker.fetch(new Request('https://sandlab.app/api/visitors'), env as never)).json()

beforeEach(() => resetVisitCache())

describe('POST /api/visit → GET /api/visitors', () => {
  it('같은 IP 3회 = 1, 봇 UA 제외, 다른 IP +1, IP 원문 미저장', async () => {
    const { env, raw } = sqliteEnv()
    for (let i = 0; i < 3; i++) expect((await visit(env, '203.0.113.5')).status).toBe(204)
    expect((await visit(env, '203.0.113.6', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).status).toBe(204)
    await visit(env, '198.51.100.20')
    const body = (await read(env)) as { tz: string; today: number; yesterday: number }
    expect(body).toMatchObject({ tz: 'UTC', today: 2, yesterday: 0 })
    expect(JSON.stringify(raw.prepare('SELECT * FROM visit_seen').all())).not.toContain('203.0.113')
  })

  it('다른 사이트·헤더 없는 요청(curl)은 세지 않는다', async () => {
    const { env, raw } = sqliteEnv()
    await visit(env, '203.0.113.9', CHROME, { 'sec-fetch-site': 'cross-site' })
    await visit(env, '203.0.113.10', CHROME, {})
    await visit(env, '203.0.113.11', CHROME, { origin: 'https://evil.example' })
    expect(raw.prepare('SELECT COALESCE(SUM(visitors), 0) n FROM visit_days').all()[0].n).toBe(0)
    await visit(env, '203.0.113.12', CHROME, { origin: 'https://sandlab.app' })
    expect(raw.prepare('SELECT COALESCE(SUM(visitors), 0) n FROM visit_days').all()[0].n).toBe(1)
  })

  it('표가 없으면(마이그레이션 전) 방문은 조용히 204 — 페이지를 깨지 않는다', async () => {
    const raw = new DatabaseSync(':memory:')
    const stmt = (q: string, vals: unknown[] = []) => ({
      bind: (...v: unknown[]) => stmt(q, v),
      all: async () => ({ results: raw.prepare(q).all(...vals) }),
      first: async () => null,
      run: async () => ({ meta: { changes: Number(raw.prepare(q).run(...vals).changes) } }),
    })
    const env = { ASSETS: { fetch: async () => new Response('') }, DB: { prepare: (q: string) => stmt(q), batch: async () => [] } }
    expect((await visit(env, '203.0.113.5')).status).toBe(204)
  })
})
