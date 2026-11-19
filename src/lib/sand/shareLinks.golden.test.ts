/**
 * 공유 링크 골든셋(리디자인 v2 부록 A·B5) — `#s=<id>`, `#g=<blob>`, `/s/:id`, 리믹스 parent 연결이
 * **지금 동작 그대로**인지 잠근다. 코드를 바꾸지 않고 현재 동작을 고정하는 게 목적이라,
 * 새 셸(P6)이 이 파싱을 옮기거나 다시 짤 때 이 표가 깨지면 기존 링크가 깨진다는 뜻이다.
 *
 * - `#s=` 파싱·parent 결정은 P6에서 순수 함수(urlState.ts의 sceneIdFromHash·publishParent·publishedLinks)로 뺐다 — 옛 홈(SandCanvas)과 새 홈(ui-next/home)이 같은 함수를 부른다.
 * - `#g=`는 urlState.readShareUrl/buildShareUrl을 그대로 부른다.
 * - `/s/:id`와 업로드 parent는 worker/index.ts의 fetch를 가짜 D1로 직접 부른다.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildShareUrl, decodeScene, readShareUrl } from './urlState'
import { SCENE_HASH_RE, hasEmbeddedScene, publishParent, publishedLinks, sceneIdFromHash } from './urlState'
import worker from '../../../worker/index'

const src = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
const SAND_CANVAS = src('../../components/SandCanvas.tsx')
const GALLERY_BROWSER = src('../../components/GalleryBrowser.tsx')
const HOME_POUR = src('../../ui-next/home/HomePour.tsx')

/** 1200×600, 바닥 10줄 sand(7) + 가운데 200×20 water(12). 11-19 현재 인코더로 만든 고정 블롭. */
const GOLDEN_G = 'Y9zAeYOFYUuDGM8JRoYX7PQmpzwXZn8QCwA'
const W = 1200
const H = 600

function stubLocation(hash: string, origin = 'https://sandlab.app', pathname = '/') {
  vi.stubGlobal('location', { hash, origin, pathname })
}
afterEach(() => vi.unstubAllGlobals())

describe('골든셋: 홈 해시 링크(#s= · #g=)', () => {
  it('#s= 정규식이 11-19 그대로다(urlState.SCENE_HASH_RE)', () => {
    expect(`/${SCENE_HASH_RE.source}/`).toBe('/[#&]s=([A-Za-z0-9_-]{6,16})/')
    expect(SCENE_HASH_RE.flags).toBe('')
  })
  it('SandCanvas 격자는 1200×600 — 다른 크기로 복원된 씬은 버린다', () => {
    expect(SAND_CANVAS).toMatch(/^const W = 1200$/m)
    expect(SAND_CANVAS).toMatch(/^const H = 600$/m)
    expect(SAND_CANVAS).toContain('restored.w === W && restored.h === H')
  })

  // 입력 해시 → 기대: s(갤러리 id) 또는 g(URL 내장) 경로. s가 잡히면 g는 보지 않는다(SandCanvas의 if/else).
  const golden: { hash: string; s: string | null; g: 'scene' | null }[] = [
    { hash: '#s=AbC123', s: 'AbC123', g: null },
    { hash: '#s=abcdefghijklmnop', s: 'abcdefghijklmnop', g: null }, // 16자 상한
    { hash: '#s=abcdefghijklmnopq', s: 'abcdefghijklmnop', g: null }, // 끝 앵커 없음: 앞 16자만
    { hash: '#s=a-b_c1', s: 'a-b_c1', g: null }, // - _ 허용
    { hash: '#s=abc12', s: null, g: null }, // 5자 → 갤러리 경로 아님, #g도 없으니 빈 화면
    { hash: '#ref=x&s=xyz789', s: 'xyz789', g: null }, // & 뒤 s=
    { hash: `#s=AbC123&g=${GOLDEN_G}`, s: 'AbC123', g: null }, // 둘 다면 s 우선
    { hash: `#g=${GOLDEN_G}`, s: null, g: 'scene' },
    { hash: `#x=1&g=${GOLDEN_G}`, s: null, g: 'scene' },
    { hash: '#g=!!!!', s: null, g: null }, // 문자 집합 밖 → 매치 없음
    { hash: '#g=AAAA', s: null, g: null }, // 디코드 실패 → null(던지지 않음)
    { hash: '', s: null, g: null },
  ]
  for (const c of golden) {
    it(`${c.hash || '(빈 해시)'} → s=${c.s} g=${c.g}`, async () => {
      const s = sceneIdFromHash(c.hash)
      expect(s).toBe(c.s)
      if (s) return // SandCanvas: s가 있으면 readShareUrl을 부르지 않는다
      stubLocation(c.hash)
      const r = await readShareUrl()
      if (c.g === null) {
        expect(r).toBeNull()
        return
      }
      expect(r).not.toBeNull()
      expect([r!.w, r!.h]).toEqual([W, H])
      expect(r!.cells[599 * W + 0]).toBe(7)
      expect(r!.cells[310 * W + 600]).toBe(12)
      expect(r!.cells[0]).toBe(0)
      expect(r!.cells.reduce((n, v) => n + (v ? 1 : 0), 0)).toBe(10 * W + 200 * 20)
    })
  }

  it('buildShareUrl 형식: origin + pathname + #g=<base64url>', async () => {
    stubLocation('', 'https://sandlab.app', '/')
    const dec = await decodeScene(GOLDEN_G)
    const r = await buildShareUrl(dec!.cells, W, H)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.url).toMatch(/^https:\/\/sandlab\.app\/#g=[A-Za-z0-9_-]+$/)
    stubLocation(r.url.slice(r.url.indexOf('#')))
    const back = await readShareUrl()
    expect([...back!.cells]).toEqual([...dec!.cells])
  })
})

// P6: 예전 '소스 트립와이어'(SandCanvas 소스 문자열 잠금)를 순수 함수 호출 테스트로 바꿨다(P2 인계 착수 조건).
describe('골든셋: 리믹스 parent 연결(클라이언트, urlState 순수 함수)', () => {
  it('#s=로 연 씬 id가 계보 원본이 되고, Publish 때 parent로 간다', () => {
    const loaded = sceneIdFromHash('#s=AbC123')
    expect(publishParent(loaded)).toBe('AbC123')
    expect(publishParent(sceneIdFromHash('#g=' + GOLDEN_G))).toBeNull() // #g= 장면은 계보 없음(원작)
    expect(publishParent(null)).toBeNull()
  })
  it('발행 후: 현재 탭은 해시형 /#s=id, 공유는 OG가 붙는 경로형 /s/id, 다음 parent는 방금 올린 id', () => {
    const l = publishedLinks('https://sandlab.app', 'NewId_01')
    expect(l).toEqual({ tabUrl: 'https://sandlab.app/#s=NewId_01', shareUrl: 'https://sandlab.app/s/NewId_01', nextLoadedId: 'NewId_01' })
    // 탭 URL을 다시 열면 같은 id로 읽힌다(왕복)
    expect(sceneIdFromHash(l.tabUrl.slice(l.tabUrl.indexOf('#')))).toBe('NewId_01')
    expect(publishParent(l.nextLoadedId)).toBe('NewId_01')
  })
  it('#g= 표시 판단은 s 우선 규칙을 따른다', () => {
    expect(hasEmbeddedScene(`#g=${GOLDEN_G}`)).toBe(true)
    expect(hasEmbeddedScene(`#x=1&g=${GOLDEN_G}`)).toBe(true)
    expect(hasEmbeddedScene(`#s=AbC123&g=${GOLDEN_G}`)).toBe(false)
    expect(hasEmbeddedScene('')).toBe(false)
  })
  it('옛 홈·새 홈 모두 같은 함수를 쓴다(인라인 재구현 금지)', () => {
    for (const [name, code] of [['SandCanvas', SAND_CANVAS], ['HomePour', HOME_POUR]] as const) {
      expect(code, name).toContain("from '@/lib/sand/urlState'")
      expect(code, name).toContain('sceneIdFromHash(location.hash)')
      expect(code, name).toContain('publishParent(loadedSceneId.current)')
      expect(code, name).toContain('publishedLinks(location.origin, id)')
      // 계보 연결 지점(예전 트립와이어가 잠그던 것): #s=로 연 id → 계보 원본, 발행 뒤 → 방금 올린 id
      expect(code, name).toContain('loadedSceneId.current = sid')
      expect(code, name).toContain('loadedSceneId.current = links.nextLoadedId')
      expect(code, name).toContain('history.replaceState(null, \'\', links.tabUrl)')
      expect(code, name).not.toMatch(/location\.hash\.match\(/)
    }
  })
  it('갤러리 카드는 /#s=<id>, 원본 링크는 /#s=<parent>', () => {
    expect(GALLERY_BROWSER).toContain('href={`/#s=${s.id}`}')
    expect(GALLERY_BROWSER).toContain('href={`/#s=${s.parent}`}')
  })
})

// ── worker: /s/:id 와 POST /api/scenes parent ──
type Row = Record<string, unknown>
function fakeEnv(scenes: Record<string, { title: string }>) {
  const inserts: { sql: string; binds: unknown[] }[] = []
  const stmt = (sql: string) => {
    let binds: unknown[] = []
    const s = {
      bind: (...v: unknown[]) => ((binds = v), s),
      first: async <T,>(): Promise<T | null> => {
        if (sql.startsWith('SELECT title FROM scenes WHERE id=?')) return (scenes[binds[0] as string] as T) ?? null
        if (sql.startsWith('SELECT 1 FROM scenes WHERE id=?')) return (scenes[binds[0] as string] ? ({ 1: 1 } as T) : null)
        if (sql.startsWith('SELECT COUNT(*) AS n FROM scenes WHERE ip=?')) return { n: 0 } as T
        throw new Error(`unexpected first(): ${sql}`)
      },
      all: async <T,>() => ({ results: [] as T[] }),
      run: async () => {
        if (sql.startsWith('INSERT INTO scenes')) inserts.push({ sql, binds })
        return {}
      },
    }
    return s
  }
  const env = {
    ASSETS: { fetch: async () => new Response('asset', { status: 200 }) },
    DB: { prepare: stmt, batch: async () => [] },
  }
  return { env, inserts }
}
const call = (env: unknown, path: string, init?: RequestInit) =>
  worker.fetch(new Request(`https://sandlab.app${path}`, init), env as Parameters<typeof worker.fetch>[1])

describe('골든셋: /s/:id (worker)', () => {
  it('있는 씬: 200 OG 페이지, canonical·og:url = /s/:id, 브라우저는 /#s=:id로 이동', async () => {
    const { env } = fakeEnv({ AbC123: { title: 'Lava <lamp>' } })
    const r = await call(env, '/s/AbC123')
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('text/html; charset=utf-8')
    const html = await r.text()
    expect(html).toContain('<meta property="og:url" content="https://sandlab.app/s/AbC123">')
    expect(html).toContain('<link rel="canonical" href="https://sandlab.app/s/AbC123">')
    expect(html).toContain('<meta property="og:image" content="https://sandlab.app/api/scenes/AbC123/thumb">')
    expect(html).toContain('<script>location.replace("https://sandlab.app/#s=AbC123")</script>')
    expect(html).toContain('<title>Lava &lt;lamp&gt; · Sandlab</title>')
    // 리다이렉트 목적지가 위 #s= 정규식으로 같은 id로 읽힌다(왕복)
    expect(sceneIdFromHash('#s=AbC123')).toBe('AbC123')
  })
  it('없는 씬·형식이 틀린 id → 302 홈', async () => {
    const { env } = fakeEnv({})
    for (const path of ['/s/AbC123', '/s/abc', '/s/abcdefghijklmnopq', '/s/bad%20id']) {
      const r = await call(env, path)
      expect(r.status, path).toBe(302)
      expect(r.headers.get('location'), path).toBe('https://sandlab.app/')
    }
  })
  it('/s/a/b 처럼 세그먼트가 더 있으면 /s/:id로 처리하지 않는다', async () => {
    const { env } = fakeEnv({ a: { title: 'x' } })
    const r = await call(env, '/s/abcdef/extra')
    expect(r.status).toBe(200) // 정적 자산 경로로 넘어간다(가짜 ASSETS가 200 'asset')
    expect(await r.text()).toBe('asset')
  })
})

describe('골든셋: 업로드 parent 연결(worker)', () => {
  const png = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0))
  const post = async (env: unknown, parent: unknown) => {
    const body: Row = { title: 't', data: GOLDEN_G, thumb: png, w: W, h: H }
    if (parent !== undefined) body.parent = parent
    return call(env, '/api/scenes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  // INSERT의 parent 바인드 위치는 SQL 컬럼 목록에서 찾는다(컬럼 순서가 바뀌어도 엉뚱한 값과 비교하지 않게).
  // 리터럴 0(votes)은 바인드가 아니라 건너뛴다.
  const parentBind = (sql: string) => {
    const cols = sql.match(/\(([^)]+)\) VALUES \(([^)]+)\)/)!
    const names = cols[1].split(',')
    const vals = cols[2].split(',')
    let b = -1
    for (let i = 0; i < names.length; i++) {
      if (vals[i].trim() === '?') b++
      if (names[i].trim() === 'parent') return b
    }
    throw new Error('parent 컬럼 없음')
  }
  const cases: { name: string; parent: unknown; exists: boolean; want: string | null }[] = [
    { name: '실재하는 원본 → 계보 연결', parent: 'Parent01', exists: true, want: 'Parent01' },
    { name: '없는 원본(유령 id) → null', parent: 'Ghost001', exists: false, want: null },
    { name: '형식이 틀린 parent → null', parent: 'x', exists: true, want: null },
    { name: '문자열이 아님 → null', parent: 12345678, exists: true, want: null },
    { name: '원작(parent 없음) → null', parent: undefined, exists: false, want: null },
  ]
  for (const c of cases) {
    it(c.name, async () => {
      const scenes: Record<string, { title: string }> = c.exists && typeof c.parent === 'string' ? { [c.parent]: { title: 'p' } } : {}
      if (c.exists && c.parent === 12345678) scenes['12345678'] = { title: 'p' }
      const { env, inserts } = fakeEnv(scenes)
      const r = await post(env, c.parent)
      expect(r.status).toBe(200)
      const { id } = (await r.json()) as { id: string }
      expect(id).toMatch(/^[A-Za-z0-9_-]{6,16}$/) // 새 id도 #s=·/s/: 형식에 맞는다
      expect(sceneIdFromHash(`#s=${id}`)).toBe(id)
      expect(inserts).toHaveLength(1)
      const idx = parentBind(inserts[0].sql)
      expect(idx).toBe(8) // 11-19 현재 위치(참고용)
      expect(inserts[0].binds[idx]).toBe(c.want)
    })
  }
})
