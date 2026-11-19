import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import worker from './index'
import { READ_ONLY_ERROR, readOnlyBlock } from './preview'

// 프리뷰 쓰기 차단(오너 11-20) — 워커 전체(default export)를 가짜 DB·ASSETS로 돌려 본다.
// DB 호출은 전부 기록해서 '차단된 요청은 D1에 한 번도 닿지 않는다'를 확인한다.
function fakeEnv(vars: Record<string, string> = {}) {
  const prepare = vi.fn(() => {
    const stmt = {
      bind: () => stmt,
      all: async () => ({ results: [] }),
      first: async () => null,
      run: async () => ({ meta: { changes: 1 } }),
    }
    return stmt
  })
  const assets = vi.fn(async () => new Response('asset', { status: 200 }))
  const env = { ASSETS: { fetch: assets }, DB: { prepare, batch: vi.fn(async () => []) }, ...vars }
  return { env, prepare, assets }
}

const call = (env: unknown, path: string, method = 'GET', body?: string) =>
  worker.fetch(new Request(`https://preview.example${path}`, { method, body }), env as never)

// 지금 워커에 있는 쓰기 라우트 전부(worker/index.ts·spill.ts) + 앞으로 생길 수 있는 메서드
const WRITES: [string, string][] = [
  ['POST', '/api/scenes'], // 씬 업로드
  ['POST', '/api/scenes/abcdefghijk/vote'], // 투표
  ['POST', '/api/daily'], // 데일리 챌린지 제출
  ['POST', '/api/spill/level/1-1/clear'], // Spill 레벨·데일리 클리어 기록
  ['POST', '/api/track'], // 클라이언트 계측
  ['PUT', '/api/scenes/abcdefghijk'],
  ['PATCH', '/api/scenes/abcdefghijk'],
  ['DELETE', '/api/scenes/abcdefghijk'],
  ['OPTIONS', '/api/scenes'],
]

describe('readOnlyBlock', () => {
  it('GET·HEAD와 /api 밖 요청은 통과(null)', () => {
    expect(readOnlyBlock(new Request('https://x/api/scenes'))).toBeNull()
    expect(readOnlyBlock(new Request('https://x/api/scenes', { method: 'HEAD' }))).toBeNull()
    expect(readOnlyBlock(new Request('https://x/s/abc', { method: 'POST' }))).toBeNull()
    expect(readOnlyBlock(new Request('https://x/apiary', { method: 'POST' }))).toBeNull()
  })
})

describe('워커 READ_ONLY=1(프리뷰)', () => {
  it.each(WRITES)('%s %s → 403 {error:"preview is read-only"}, D1 호출 0', async (method, path) => {
    const { env, prepare } = fakeEnv({ READ_ONLY: '1', NOINDEX: '1' })
    const res = await call(env, path, method, method === 'POST' || method === 'PUT' ? '{}' : undefined)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: READ_ONLY_ERROR })
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow') // 차단 응답에도 noindex
    expect(prepare).not.toHaveBeenCalled()
  })

  it('GET 읽기 API는 그대로 200', async () => {
    const { env } = fakeEnv({ READ_ONLY: '1', NOINDEX: '1' })
    for (const p of ['/api/scenes', '/api/scenes?sort=new', '/api/daily/42/stats', '/api/creators/top']) {
      const res = await call(env, p)
      expect(res.status, p).toBe(200)
    }
  })

  it('/api 밖 POST는 차단하지 않는다(정적 에셋으로)', async () => {
    const { env, assets } = fakeEnv({ READ_ONLY: '1' })
    const res = await call(env, '/gallery', 'POST', 'x')
    expect(res.status).toBe(200)
    expect(assets).toHaveBeenCalledOnce()
  })
})

describe('워커 READ_ONLY 없음(prod) — 기존 동작 그대로', () => {
  it('POST /api/scenes 잘못된 JSON → 기존 400 bad json', async () => {
    const { env } = fakeEnv()
    const res = await call(env, '/api/scenes', 'POST', 'not json')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'bad json' })
  })

  it('POST /api/daily 형식 불량 → 기존 400, POST /api/track → 기존 204', async () => {
    const { env } = fakeEnv()
    expect((await call(env, '/api/daily', 'POST', '{}')).status).toBe(400)
    expect((await call(env, '/api/track', 'POST', '{}')).status).toBe(204)
  })

  it('POST 투표: 없는 씬이면 D1을 조회하고 기존 404', async () => {
    const { env, prepare } = fakeEnv()
    const res = await call(env, '/api/scenes/abcdefghijk/vote', 'POST')
    expect(res.status).toBe(404)
    expect(prepare).toHaveBeenCalled()
  })

  it('READ_ONLY가 "1"이 아니면(빈 값·0) 차단하지 않는다', async () => {
    for (const v of ['', '0', 'true']) {
      const { env } = fakeEnv({ READ_ONLY: v })
      expect((await call(env, '/api/scenes', 'POST', 'not json')).status, v).toBe(400)
    }
  })

  it('GET 응답에 noindex를 달지 않는다', async () => {
    const { env } = fakeEnv()
    const res = await call(env, '/api/scenes')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-robots-tag')).toBeNull()
  })
})

// 실제 설정이 이 보장을 지키는지(독립 리뷰): env를 직접 주입하는 위 테스트만으로는 wrangler.jsonc에서
// READ_ONLY가 빠지거나('1'이 아니면 조용히 차단 꺼짐) 최상위(prod)로 새는 걸 못 잡는다.
describe('wrangler.jsonc', () => {
  // 줄 전체 주석만 있는 JSONC(줄 끝 주석·끝 쉼표 없음) — 깨지면 JSON.parse가 던져서 이 테스트가 실패한다
  const cfg = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, ''))

  it('prod(최상위)에는 READ_ONLY가 없다 → 쓰기 동작 불변', () => {
    expect(cfg.vars?.READ_ONLY).toBeUndefined()
  })

  it('env.preview는 READ_ONLY="1"(정확히) + NOINDEX="1", prod와 같은 D1', () => {
    const p = cfg.env.preview
    expect(p.vars.READ_ONLY).toBe('1')
    expect(p.vars.NOINDEX).toBe('1')
    expect(p.d1_databases[0].database_id).toBe(cfg.d1_databases[0].database_id)
  })
})
