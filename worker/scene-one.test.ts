import { describe, expect, it, vi } from 'vitest'
import worker from './index'

// 단건 조회 GET /api/scenes/:id 에 creatorName(P9) — 필드 추가만(하위 호환). 가짜 D1이 SQL을 기록하고 행을 돌려준다.
function fakeEnv(row: Record<string, unknown> | null) {
  const sql: string[] = []
  const prepare = vi.fn((q: string) => {
    sql.push(q)
    const stmt = { bind: () => stmt, first: async () => row, all: async () => ({ results: [] }), run: async () => ({ meta: { changes: 1 } }) }
    return stmt
  })
  const env = { ASSETS: { fetch: vi.fn(async () => new Response('asset')) }, DB: { prepare, batch: vi.fn(async () => []) } }
  return { env, sql }
}

const get = (env: unknown, path: string) => worker.fetch(new Request(`https://sandlab.test${path}`), env as never)

const ROW = { id: 'abcdefghijk', title: 'Shelf', votes: 3, createdAt: 1, w: 1200, h: 600, parent: null, remixCount: 2 }

describe('GET /api/scenes/:id — creatorName', () => {
  it('SELECT가 creator_name을 creatorName으로 싣는다(목록과 같은 이름), creator_id는 싣지 않는다', async () => {
    const { env, sql } = fakeEnv({ ...ROW, creatorName: 'Mina', data: 'xx' })
    const res = await get(env, '/api/scenes/abcdefghijk')
    expect(res.status).toBe(200)
    const q = sql.find((s) => s.includes('FROM scenes WHERE id=?'))!
    expect(q).toContain('creator_name AS creatorName')
    expect(q).not.toContain('creator_id')
    expect(q).toContain(',data') // 풀 조회는 data 포함(기존 그대로)
    expect(await res.json()).toMatchObject({ ...ROW, creatorName: 'Mina', data: 'xx' })
  })

  it('?meta=1도 같은 필드(data 제외), 익명은 null', async () => {
    const { env, sql } = fakeEnv({ ...ROW, creatorName: null })
    const res = await get(env, '/api/scenes/abcdefghijk?meta=1')
    const q = sql.find((s) => s.includes('FROM scenes WHERE id=?'))!
    expect(q).toContain('creator_name AS creatorName')
    expect(q).not.toContain(',data')
    const body = await res.json()
    expect(body.creatorName).toBeNull()
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('기존 필드는 그대로(하위 호환): id·title·votes·createdAt·w·h·parent·remixCount', async () => {
    const { env, sql } = fakeEnv({ ...ROW, creatorName: null, data: 'xx' })
    await get(env, '/api/scenes/abcdefghijk')
    const q = sql.find((s) => s.includes('FROM scenes WHERE id=?'))!
    for (const c of ['id', 'title', 'votes', 'created_at AS createdAt', 'w', 'h', 'parent', 'AS remixCount']) expect(q).toContain(c)
  })

  it('없는 id는 404 그대로', async () => {
    const { env } = fakeEnv(null)
    expect((await get(env, '/api/scenes/abcdefghijk')).status).toBe(404)
  })
})
