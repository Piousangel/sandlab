# 익명 크리에이터 정체성 + 리더보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인·댓글 없이 갤러리에 "누가 만들었는지" 정체성을 붙여, 이름이 노출되는 크리에이터 프로필과
Top Creators 리더보드로 사이트 내부 커뮤니티 층을 만든다.

**Architecture:** 클라이언트가 localStorage에 익명 지속 토큰(creator_id)+선택적 닉네임을 생성/보관하고
업로드 시 함께 보낸다. 서버(D1)는 `scenes` 테이블에 두 컬럼만 추가해 저장하고, 집계 쿼리(리더보드·
프로필 통계)로 노출한다. 별도 계정 테이블·인증 없음 — "크리에이터"는 `creator_id`로 묶이는 집계 뷰다.

**Tech Stack:** Cloudflare Workers + D1(SQLite), Next.js 15(정적 export) + React, vitest, Python
e2e(`scripts/verify-gallery.py`).

## Global Constraints

- 댓글 기능 금지 (CLAUDE.md).
- 계정/로그인 금지 — "무설치·무가입" 카피 쐐기 유지. `creator_id`는 인증 토큰이 아니라 표시용 익명 라벨.
- 격자 1200×600 고정, Cloudflare Workers 전용 배포 — 이번 작업과 무관하지만 건드리지 않는다.
- 프로덕션 D1 스키마 변경은 에이전트가 실행 불가(안전분류기 차단) — 사용자가 `!` 프리픽스로 직접 실행.
- 새 React 컴포넌트 테스트 인프라(testing-library 등)를 도입하지 않는다 — 이 레포는 UI를 typecheck+build+
  (필요시) 사용자 육안 확인으로 검증하는 기존 패턴을 그대로 따른다. 순수 함수(`gallery.ts`, `creator.ts`)만
  vitest로 검증한다.
- `creator_id`는 이름을 처음 지정하는 순간에만 생성된다 — 닉네임을 스킵한 사용자는 `creator_id`가 아예
  없어(완전 익명) 리더보드/프로필 시스템에 전혀 안 걸린다.

---

### Task 1: 스키마 — creator_id/creator_name 컬럼

**Files:**
- Modify: `schema.sql`

**Interfaces:**
- Produces: `scenes.creator_id TEXT NULL`, `scenes.creator_name TEXT NULL`, `idx_scenes_creator` 인덱스.
  이후 모든 태스크가 이 컬럼명을 그대로 쓴다.

- [ ] **Step 1: schema.sql에 컬럼·인덱스 추가**

`schema.sql`의 `CREATE INDEX IF NOT EXISTS idx_scenes_parent ...` 줄 바로 뒤에 추가:

```sql
-- 익명 지속 크리에이터 정체성. 계정/로그인 없음 — creator_id는 클라이언트가 생성해 보내는
-- 표시용 라벨일 뿐(권한 없음). 닉네임을 한 번도 지정 안 한 사용자는 둘 다 NULL(=Anonymous),
-- 리더보드 집계에서 자연 제외된다.
ALTER TABLE scenes ADD COLUMN creator_id TEXT;
ALTER TABLE scenes ADD COLUMN creator_name TEXT;
CREATE INDEX IF NOT EXISTS idx_scenes_creator ON scenes(creator_id);
```

- [ ] **Step 2: 로컬 D1에 적용**

Run:
```bash
npx wrangler d1 execute sandlab-gallery --local --command "ALTER TABLE scenes ADD COLUMN creator_id TEXT; ALTER TABLE scenes ADD COLUMN creator_name TEXT; CREATE INDEX IF NOT EXISTS idx_scenes_creator ON scenes(creator_id);"
```
Expected: 에러 없이 완료. (이미 적용된 로컬 DB에 재실행하면 "duplicate column name"으로 실패하는 게
정상 — 그럴 땐 `.wrangler/state/v3/d1`를 지우고 `npx wrangler d1 execute sandlab-gallery --local --file=schema.sql`로 처음부터 다시 만든다.)

- [ ] **Step 3: 컬럼 확인**

Run:
```bash
npx wrangler d1 execute sandlab-gallery --local --command "PRAGMA table_info(scenes);"
```
Expected: 출력에 `creator_id`, `creator_name` 행이 보인다.

- [ ] **Step 4: Commit**

```bash
git add schema.sql
git commit -m "feat(schema): add creator_id/creator_name columns for anonymous creator identity"
```

---

### Task 2: `gallery.ts` — 공용 타입·검증·클라이언트 API 확장

**Files:**
- Modify: `src/lib/sand/gallery.ts`
- Test: `src/lib/sand/gallery.test.ts`

**Interfaces:**
- Consumes: 없음(순수 확장).
- Produces:
  - `MAX_CREATOR_NAME: number`
  - `cleanCreatorName(raw: unknown): string` — 빈 값이면 `''`(cleanTitle과 달리 'Untitled' 아님).
  - `isValidCreatorId(s: unknown): s is string` — `/^[A-Za-z0-9_-]{6,24}$/`.
  - `SceneMeta.creatorId?: string | null`, `SceneMeta.creatorName?: string | null`
  - `uploadScene(body)`에 `creator?: string`, `creatorName?: string` 필드.
  - `listScenes(sort, offset, creatorId?)` — 3번째 인자 추가.
  - `interface CreatorTop { id: string; name: string | null; votes: number; scenes: number }`
  - `interface CreatorProfile { id: string; name: string | null; sceneCount: number; totalVotes: number; remixCount: number }`
  - `getCreatorTop(): Promise<{ creators: CreatorTop[] }>`
  - `getCreatorProfile(id: string): Promise<CreatorProfile>`
  - Worker(Task 3)가 `cleanCreatorName`·`isValidCreatorId`를 그대로 import해서 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/sand/gallery.test.ts` 맨 위 import에 `cleanCreatorName, isValidCreatorId` 추가하고,
`isValidId` describe 블록 뒤에 새 블록 추가:

```ts
describe('cleanCreatorName', () => {
  it('제어문자를 제거하고 내부 공백을 압축한다', () => {
    expect(cleanCreatorName('a  b')).toBe('a b')
  })

  it('빈/공백만 있으면 빈 문자열(Untitled 아님)', () => {
    expect(cleanCreatorName('')).toBe('')
    expect(cleanCreatorName('   ')).toBe('')
    expect(cleanCreatorName(null)).toBe('')
    expect(cleanCreatorName(undefined)).toBe('')
  })

  it('24자로 자른다', () => {
    expect(cleanCreatorName('x'.repeat(40)).length).toBe(24)
  })

  it('서로게이트 쌍을 경계에서 잘라도 반쪽 문자를 만들지 않는다', () => {
    const s = cleanCreatorName('a' + '\u{1F600}'.repeat(15))
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s)).toBe(false)
  })
})

describe('isValidCreatorId', () => {
  it('6~24자 [A-Za-z0-9_-]만 허용', () => {
    expect(isValidCreatorId('abcdef')).toBe(true)
    expect(isValidCreatorId('A1_b-2Cd3Ef4Gh5Ij6Kl')).toBe(true) // 21자
    expect(isValidCreatorId('abc')).toBe(false)
    expect(isValidCreatorId('a'.repeat(25))).toBe(false)
    expect(isValidCreatorId('has space')).toBe(false)
    expect(isValidCreatorId(123)).toBe(false)
    expect(isValidCreatorId(null)).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm test -- gallery`
Expected: FAIL — `cleanCreatorName`/`isValidCreatorId`가 정의되지 않음.

- [ ] **Step 3: 최소 구현**

`src/lib/sand/gallery.ts`에서 `export const MAX_TITLE = 60` 바로 뒤에 추가:

```ts
export const MAX_CREATOR_NAME = 24
```

`cleanTitle` 함수 바로 뒤(그리고 `isValidId` 앞)에 추가:

```ts
/**
 * 크리에이터 닉네임 정리 — cleanTitle과 같은 규칙(제어문자 제거·공백 압축·코드포인트-세이프 자르기)
 * 이되, 빈 값을 'Untitled'로 채우지 않는다. 이름을 아예 안 정한 게 유효한 상태이기 때문
 * (worker가 빈 문자열을 null로 저장 → 완전 익명 취급).
 */
export function cleanCreatorName(raw: unknown): string {
  const s = String(raw ?? '')
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return Array.from(s).slice(0, MAX_CREATOR_NAME).join('')
}
```

`isValidId` 함수 바로 뒤에 추가:

```ts
export function isValidCreatorId(s: unknown): s is string {
  return typeof s === 'string' && /^[A-Za-z0-9_-]{6,24}$/.test(s)
}
```

`SceneMeta` 인터페이스의 `remixCount?: number` 줄 뒤에 추가:

```ts
  /** 크리에이터 정체성 — 닉네임을 지정한 크리에이터만 있음(완전 익명 업로드는 둘 다 미포함). */
  creatorId?: string | null
  creatorName?: string | null
```

`uploadScene`의 body 타입에 `parent?: string | null,` 줄 뒤에 추가:

```ts
  /** 닉네임을 지정한 적 있는 크리에이터만 보낸다(creator.ts). 없으면 완전 익명 업로드. */
  creator?: string
  creatorName?: string
```

`listScenes`를 교체:

```ts
export function listScenes(sort: SortMode, offset = 0, creatorId?: string) {
  const q = new URLSearchParams({ sort, offset: String(offset) })
  if (creatorId) q.set('creator', creatorId)
  return req<{ scenes: SceneMeta[]; total: number }>(`/api/scenes?${q.toString()}`)
}
```

파일 끝(`listMine` 함수 뒤)에 추가:

```ts
export interface CreatorTop {
  id: string
  name: string | null
  votes: number
  scenes: number
}

export interface CreatorProfile {
  id: string
  name: string | null
  sceneCount: number
  totalVotes: number
  remixCount: number
}

/** Top Creators 리더보드 — 닉네임을 지정한 크리에이터만(익명 업로드는 집계에서 자연 제외). */
export function getCreatorTop() {
  return req<{ creators: CreatorTop[] }>('/api/creators/top')
}

/** 크리에이터 프로필 헤더용 집계 단건. 씬 목록 자체는 listScenes(sort, offset, id)로 따로 가져온다
 *  (페이지네이션되므로 클라이언트가 24건만 보고 합산하면 총계가 틀린다 — 서버 집계를 쓰는 이유). */
export function getCreatorProfile(id: string) {
  return req<CreatorProfile>(`/api/creators/${encodeURIComponent(id)}`)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test -- gallery`
Expected: PASS, 기존 테스트 포함 전부 통과.

- [ ] **Step 5: typecheck**

Run: `pnpm typecheck`
Expected: 에러 없음.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sand/gallery.ts src/lib/sand/gallery.test.ts
git commit -m "feat(gallery): add creator identity types, validation, and leaderboard/profile client API"
```

---

### Task 3: `worker/index.ts` — creator 저장·리더보드·프로필 엔드포인트

**Files:**
- Modify: `worker/index.ts`
- Modify: `scripts/verify-gallery.py`

**Interfaces:**
- Consumes: Task 2의 `cleanCreatorName`, `isValidCreatorId` (import 추가).
- Produces:
  - `POST /api/scenes` body에 `creator`/`creatorName` 저장.
  - `GET /api/scenes` 응답 각 행에 `creatorId`/`creatorName`, `?creator=<id>` 필터.
  - `GET /api/creators/top` — `{ creators: CreatorTop[] }`.
  - `GET /api/creators/:id` — `CreatorProfile` (없으면 404).

- [ ] **Step 1: import 확장**

`worker/index.ts` 상단 import 블록의 `cleanTitle,` 줄 뒤에 추가:

```ts
  cleanCreatorName,
  isValidCreatorId,
```

(전체 import는 `{ HOT_WINDOW_DAYS, PAGE_SIZE, MAX_SCENE_BYTES, MAX_THUMB_BYTES, THUMB_W, THUMB_H, cleanTitle, cleanCreatorName, isValidCreatorId, isValidId, type SceneMeta, type SortMode } from '../src/lib/sand/gallery'`)

- [ ] **Step 2: GET /api/scenes에 creator 컬럼 + 필터 추가**

기존 목록 핸들러(`if (p === '/api/scenes' && request.method === 'GET')` 블록)를 교체:

```ts
    if (p === '/api/scenes' && request.method === 'GET') {
      const sort = (url.searchParams.get('sort') as SortMode) === 'new' ? 'new' : 'hot'
      const offset = Math.max(0, Math.min(5000, Number(url.searchParams.get('offset')) || 0))
      const creatorParam = url.searchParams.get('creator')
      const creatorFilter = isValidCreatorId(creatorParam) ? creatorParam : null

      const cols =
        'id,title,votes,created_at AS createdAt,w,h,parent,creator_id AS creatorId,creator_name AS creatorName,' +
        '(SELECT COUNT(*) FROM scenes r WHERE r.parent=scenes.id) AS remixCount'

      if (creatorFilter) {
        // 크리에이터 프로필의 씬 그리드 — hot/new 창 없이 이 사람 것만 최신순 페이지네이션.
        const q = `SELECT ${cols} FROM scenes WHERE creator_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?`
        const { results } = await env.DB.prepare(q).bind(creatorFilter, PAGE_SIZE, offset).all<SceneMeta>()
        const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM scenes WHERE creator_id=?')
          .bind(creatorFilter)
          .first<{ n: number }>()
        return json({ scenes: results, total: cnt?.n ?? 0 })
      }

      // hot = 최근 1주일 이내 + 표 순. Powder Toy FP 복제.
      // 이 창이 없으면 오래된 히트작이 영원히 상단을 점거해 신규가 절대 안 보인다.
      const since = Date.now() - HOT_WINDOW_DAYS * 86400_000
      const q =
        sort === 'hot'
          ? `SELECT ${cols} FROM scenes WHERE created_at>? ORDER BY votes DESC, created_at DESC LIMIT ? OFFSET ?`
          : `SELECT ${cols} FROM scenes WHERE created_at>-1 ORDER BY created_at DESC LIMIT ? OFFSET ?`
      const stmt =
        sort === 'hot'
          ? env.DB.prepare(q).bind(since, PAGE_SIZE, offset)
          : env.DB.prepare(q).bind(PAGE_SIZE, offset)
      const { results } = await stmt.all<SceneMeta>()

      const cnt = await env.DB.prepare(
        sort === 'hot'
          ? 'SELECT COUNT(*) AS n FROM scenes WHERE created_at>?'
          : 'SELECT COUNT(*) AS n FROM scenes',
      )
        .bind(...(sort === 'hot' ? [since] : []))
        .first<{ n: number }>()

      return json({ scenes: results, total: cnt?.n ?? 0 })
    }
```

- [ ] **Step 3: POST /api/scenes에 creator 저장 추가**

`body` 타입 선언에 `parent?: unknown` 줄 뒤 추가:
```ts
        creator?: unknown
        creatorName?: unknown
```

`const parent = ...` 줄 바로 뒤에 추가:
```ts
      // 닉네임을 지정한 적 있는 크리에이터만 id를 보낸다(creator.ts) — 형식 안 맞으면 완전 익명 취급.
      const creatorId = isValidCreatorId(body.creator) ? body.creator : null
      const creatorName = creatorId ? cleanCreatorName(body.creatorName) || null : null
```

INSERT 문을 교체:
```ts
      const id = newId()
      await env.DB.prepare(
        'INSERT INTO scenes (id,title,data,thumb,votes,created_at,w,h,ip,parent,creator_id,creator_name) VALUES (?,?,?,?,0,?,?,?,?,?,?,?)',
      )
        .bind(id, cleanTitle(body.title), data, bytes, Date.now(), w, h, hash, parentId, creatorId, creatorName)
        .run()
```

- [ ] **Step 4: 리더보드 + 프로필 엔드포인트 추가**

`// ── 업로드 ──` 블록이 끝나는 `}`(POST 핸들러 마지막 `return json({ id })` 다음의 닫는 중괄호) 바로
뒤, `// ── 씬 공유 링크 /s/:id ──` 주석 앞에 삽입:

```ts
    // ── Top Creators 리더보드 (동적 :id 라우트보다 먼저 와야 'top'이 id로 안 먹힌다) ──
    if (p === '/api/creators/top' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT creator_id AS id,
                (SELECT creator_name FROM scenes s2 WHERE s2.creator_id = s.creator_id
                   ORDER BY created_at DESC LIMIT 1) AS name,
                SUM(votes) AS votes, COUNT(*) AS scenes
         FROM scenes s
         WHERE creator_id IS NOT NULL
         GROUP BY creator_id
         ORDER BY votes DESC
         LIMIT 20`,
      ).all<{ id: string; name: string | null; votes: number; scenes: number }>()
      return json({ creators: results })
    }

    // ── 크리에이터 프로필 집계 (헤더용 — 씬 목록은 /api/scenes?creator=id로 따로 페이지네이션) ──
    const creatorM = p.match(/^\/api\/creators\/([^/]+)$/)
    if (creatorM && request.method === 'GET') {
      const id = creatorM[1]
      if (!isValidCreatorId(id)) return err('bad id')
      const row = await env.DB.prepare(
        `SELECT
           (SELECT creator_name FROM scenes WHERE creator_id=? ORDER BY created_at DESC LIMIT 1) AS name,
           (SELECT COUNT(*) FROM scenes WHERE creator_id=?) AS sceneCount,
           (SELECT COALESCE(SUM(votes),0) FROM scenes WHERE creator_id=?) AS totalVotes,
           (SELECT COUNT(*) FROM scenes WHERE parent IN (SELECT id FROM scenes WHERE creator_id=?)) AS remixCount`,
      )
        .bind(id, id, id, id)
        .first<{ name: string | null; sceneCount: number; totalVotes: number; remixCount: number }>()
      if (!row || row.sceneCount === 0) return err('not found', 404)
      return json({ id, ...row })
    }

```

- [ ] **Step 5: typecheck**

Run: `pnpm typecheck`
Expected: 에러 없음.

- [ ] **Step 6: e2e 테스트 추가 (verify-gallery.py)**

`scripts/verify-gallery.py` 끝부분(마지막 테스트 블록 뒤, 요약 출력 전)에 추가할 새 섹션을 작성한다.
먼저 파일을 열어 기존 테스트가 `ok()`/카운터를 어떻게 쌓는지 정확한 헬퍼 이름을 확인하고 그 패턴을
그대로 따라 다음 시나리오를 추가한다:

1. `creator`(6~24자 랜덤 문자열)와 `creatorName="TestCreator"`를 포함해 씬 업로드 → 200.
2. `GET /api/scenes?sort=new`에서 방금 올린 씬에 `creatorId`/`creatorName`이 그대로 들어있는지 확인.
3. `GET /api/scenes?creator=<id>`로 그 크리에이터의 씬만 필터되는지 확인(total이 1 이상, 모든 항목의
   creatorId가 일치).
4. `GET /api/creators/<id>`가 `sceneCount>=1`, `totalVotes>=0`, `name=="TestCreator"`를 돌려주는지 확인.
5. `GET /api/creators/top`이 200이고 `creators` 배열에 방금 만든 id가 존재하는지 확인.
6. `creator` 필드 없이(완전 익명) 업로드한 씬은 `GET /api/creators/top`에도 `GET /api/creators/<빈 id 없음>`
   에도 안 걸리는지 확인 — 애초에 그 씬은 목록에서 `creatorId`가 null이면 됨.
7. 형식이 안 맞는 `creator`(예: 5자 미만)를 보내면 서버가 조용히 null로 취급(400 아님, 그냥 익명
   업로드로 성공)하는지 확인.

- [ ] **Step 7: e2e 실행**

Run (별도 터미널에서 `npx wrangler dev --port 8799 --local` 먼저 띄운 상태):
```bash
python3 scripts/verify-gallery.py
```
Expected: 새로 추가한 테스트 포함 전부 통과(기존 17개 + 신규 7개 = 24개 안팎).

- [ ] **Step 8: Commit**

```bash
git add worker/index.ts scripts/verify-gallery.py
git commit -m "feat(worker): store creator identity, add leaderboard + creator profile endpoints"
```

---

### Task 4: `src/lib/sand/creator.ts` — 클라이언트 정체성 lib

**Files:**
- Create: `src/lib/sand/creator.ts`
- Create: `src/lib/sand/creator.test.ts`

**Interfaces:**
- Consumes: 없음(순수 localStorage 래퍼, `discovery.ts`/`gallery.ts`의 기존 스타일과 동일).
- Produces:
  - `getCreatorName(): string | undefined` — localStorage에 키 자체가 없으면 `undefined`(=한 번도 안
    물어봄). 빈 문자열 `''`이면 "물어봤고 스킵함"(다시 안 물어봄). 이름 있으면 그 문자열.
  - `setCreatorName(name: string): void` — 이름을 저장한다. 처음으로 비어있지 않은 이름이 저장되는
    순간에만 `creatorId`를 새로 생성해 함께 저장한다(이후 재호출은 기존 id를 유지).
  - `getCreatorId(): string | undefined` — 아직 이름을 한 번도 지정 안 했으면 `undefined`.
  - Task 5(`SandCanvas.tsx`)가 이 세 함수를 그대로 소비한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/sand/creator.test.ts` 새로 작성:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCreatorName, setCreatorName, getCreatorId } from './creator'

describe('creator identity (localStorage)', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    })
  })

  it('한 번도 이름을 안 정했으면 name과 id 둘 다 undefined', () => {
    expect(getCreatorName()).toBeUndefined()
    expect(getCreatorId()).toBeUndefined()
  })

  it('이름을 스킵(빈 문자열)해도 다시 물어보지 않을 수 있게 빈 문자열을 저장하되, id는 안 만든다', () => {
    setCreatorName('')
    expect(getCreatorName()).toBe('') // undefined가 아님 = "이미 물어봤다"는 신호
    expect(getCreatorId()).toBeUndefined()
  })

  it('처음 이름을 지정하면 id가 새로 생기고, 이후엔 같은 id를 유지한다', () => {
    setCreatorName('Nova')
    const id1 = getCreatorId()
    expect(getCreatorName()).toBe('Nova')
    expect(id1).toBeDefined()
    expect(id1!.length).toBeGreaterThanOrEqual(6)

    setCreatorName('Nova Renamed')
    expect(getCreatorName()).toBe('Nova Renamed')
    expect(getCreatorId()).toBe(id1) // 개명해도 id는 그대로
  })

  it('localStorage가 던져도(프라이빗 모드) 예외를 밖으로 내지 않는다', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(() => setCreatorName('X')).not.toThrow()
    expect(getCreatorName()).toBeUndefined()
    expect(getCreatorId()).toBeUndefined()
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm test -- creator`
Expected: FAIL — `./creator` 모듈이 없음.

- [ ] **Step 3: 구현**

`src/lib/sand/creator.ts` 새로 작성:

```ts
/**
 * 익명 지속 크리에이터 정체성 — 로그인/계정 없음.
 *
 * 이름을 한 번도 안 정한 사용자는 creator_id 자체가 없다(완전 익명 업로드) — 리더보드/프로필
 * 집계는 서버에서 creator_id IS NOT NULL만 보므로, 스킵한 사용자는 애초에 이 시스템에 안 걸린다.
 * "물어봤지만 스킵함"과 "아직 안 물어봄"을 구분해야 매 Publish마다 다시 묻지 않는다 —
 * 그래서 이름 키는 세 상태(없음/빈 문자열/실제 이름)를 갖는다.
 */

const NAME_KEY = 'sandlab.creatorName'
const ID_KEY = 'sandlab.creatorId'

function newCreatorId(): string {
  const b = crypto.getRandomValues(new Uint8Array(8))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** undefined = 한 번도 안 물어봄. '' = 물어봤고 스킵함(다시 안 물어봄). 그 외 = 실제 이름. */
export function getCreatorName(): string | undefined {
  try {
    const v = localStorage.getItem(NAME_KEY)
    return v === null ? undefined : v
  } catch {
    return undefined
  }
}

/** 이름을 저장한다. 처음으로 비어있지 않은 이름을 저장할 때만 id를 새로 만든다. */
export function setCreatorName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name)
    if (name && !localStorage.getItem(ID_KEY)) {
      localStorage.setItem(ID_KEY, newCreatorId())
    }
  } catch {
    /* 프라이빗 모드 등 — 이번 세션엔 이름이 안 남지만 업로드 자체는 계속 진행 */
  }
}

/** 이름을 한 번도 안 지정했으면 undefined(=완전 익명, creator_id를 서버에 보내지 않는다). */
export function getCreatorId(): string | undefined {
  try {
    return localStorage.getItem(ID_KEY) || undefined
  } catch {
    return undefined
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test -- creator`
Expected: PASS.

- [ ] **Step 5: typecheck**

Run: `pnpm typecheck`
Expected: 에러 없음.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sand/creator.ts src/lib/sand/creator.test.ts
git commit -m "feat(creator): add anonymous persistent creator identity lib"
```

---

### Task 5: `SandCanvas.tsx` — Publish에 크리에이터 정체성 연결

**Files:**
- Modify: `src/components/SandCanvas.tsx`

**Interfaces:**
- Consumes: Task 4의 `getCreatorName`, `setCreatorName`, `getCreatorId`. Task 2의 확장된
  `uploadScene(body)` 타입(`creator?`, `creatorName?`).
- Produces: 없음(터미널 UI 동작 — Task 6이 직접 소비하진 않음, 서버에 저장된 데이터를 통해서만 연결).

- [ ] **Step 1: import 추가**

`SandCanvas.tsx` 상단의 `import { uploadScene, getScene, listScenes, rememberMine, type SceneMeta } from '@/lib/sand/gallery'` 줄 뒤에 추가:

```ts
import { getCreatorName, setCreatorName, getCreatorId } from '@/lib/sand/creator'
```

- [ ] **Step 2: publish()에 닉네임 프롬프트 + creator 필드 연결**

`publish` 함수 내부, `const title = window.prompt('Title for the gallery?', '')` 줄 바로 뒤에 추가:

```ts
      // 처음 Publish하는 순간에만(닉네임을 한 번도 안 정했을 때만) 한 번 물어본다.
      // 스킵(빈 값)해도 다음부턴 다시 안 물어본다 — creator.ts가 '물어봤음'을 빈 문자열로 기억.
      if (getCreatorName() === undefined) {
        const entered = (window.prompt('Your name for the gallery? (optional — shown on your scenes)', '') || '').trim()
        setCreatorName(entered)
      }
```

`uploadScene({ ... })` 호출의 `parent: loadedSceneId.current,` 줄 뒤에 추가:

```ts
        creator: getCreatorId(),
        creatorName: getCreatorId() ? getCreatorName() : undefined,
```

- [ ] **Step 3: typecheck**

Run: `pnpm typecheck`
Expected: 에러 없음.

- [ ] **Step 4: build**

Run: `pnpm build`
Expected: 정적 export 성공, 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add src/components/SandCanvas.tsx
git commit -m "feat(publish): wire optional creator identity into scene upload"
```

---

### Task 6: `GalleryBrowser.tsx` — 크리에이터 표시 · 프로필 뷰 · 리더보드 탭

**Files:**
- Modify: `src/components/GalleryBrowser.tsx`

**Interfaces:**
- Consumes: Task 2의 `listScenes(sort, offset, creatorId?)`, `getCreatorTop()`, `getCreatorProfile(id)`,
  `type CreatorTop`, `type CreatorProfile`. `SceneMeta.creatorId`/`creatorName`(worker가 이미 채워 보냄).
- Produces: 없음(최종 UI).

- [ ] **Step 1: import 확장**

`GalleryBrowser.tsx` 상단 import에 추가:

```ts
  getCreatorTop,
  getCreatorProfile,
  type CreatorTop,
  type CreatorProfile,
```

(`listScenes` 등 기존 import 목록 안에 같이 넣는다.)

- [ ] **Step 2: Tab 타입에 'top' 추가, 새 상태 추가**

```ts
type Tab = SortMode | 'mine' | 'top'
```

`GalleryBrowser` 함수 내부, 기존 `const [loadingMore, setLoadingMore] = useState(false)` 줄 뒤에 추가:

```ts
  // 크리에이터 프로필 보기(카드의 "by 이름" 클릭) — 탭과 별개 오버레이 상태.
  const [viewingCreator, setViewingCreator] = useState<{ id: string; name: string } | null>(null)
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null)
  const [topCreators, setTopCreators] = useState<CreatorTop[]>([])
```

- [ ] **Step 3: load()가 크리에이터 필터·리더보드도 처리하도록 확장**

기존 `load` 함수를 교체:

```ts
  const load = useCallback(async (mode: Tab, creatorId?: string) => {
    setLoading(true)
    setErr(null)
    try {
      if (creatorId) {
        const [r, profile] = await Promise.all([listScenes('new', 0, creatorId), getCreatorProfile(creatorId)])
        setScenes(r.scenes)
        setTotal(r.total)
        setCreatorProfile(profile)
      } else if (mode === 'mine') {
        const mine = listMine()
        const settled = await Promise.allSettled(mine.map((e) => getSceneMeta(e.id)))
        const found = settled
          .filter((s): s is PromiseFulfilledResult<SceneMeta> => s.status === 'fulfilled')
          .map((s) => s.value)
        setMineDelta(mineDeltas(found, listMine()))
        updateMineSeen(found.map((s) => ({ id: s.id, votes: s.votes || 0, remixCount: s.remixCount || 0 })))
        setScenes(found)
        setTotal(found.length)
      } else if (mode === 'top') {
        const r = await getCreatorTop()
        setTopCreators(r.creators)
        setScenes([])
        setTotal(0)
      } else {
        const r = await listScenes(mode)
        setScenes(r.scenes)
        setTotal(r.total)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])
```

기존 `useEffect(() => { load(sort) }, [sort, load])`를 교체:

```ts
  useEffect(() => {
    load(sort, viewingCreator?.id)
  }, [sort, viewingCreator, load])
```

- [ ] **Step 4: 헤더 — 프로필 보기 중엔 탭 대신 뒤로가기+통계**

기존 `<header style={S.head}>...</header>` 블록 전체를 교체:

```tsx
      <header style={S.head}>
        {viewingCreator ? (
          <>
            <button onClick={() => setViewingCreator(null)} style={S.back}>
              ← Back to gallery
            </button>
            <span style={S.title}>{viewingCreator.name || 'Anonymous'}</span>
            {creatorProfile && (
              <span style={S.count}>
                {creatorProfile.sceneCount} scene{creatorProfile.sceneCount === 1 ? '' : 's'} ·{' '}
                {creatorProfile.totalVotes} vote{creatorProfile.totalVotes === 1 ? '' : 's'} ·{' '}
                {creatorProfile.remixCount} remix{creatorProfile.remixCount === 1 ? '' : 'es'}
              </span>
            )}
          </>
        ) : (
          <>
            <a href="/" style={S.back}>
              ← Sandlab
            </a>
            <div style={S.tabs}>
              {(['hot', 'new', 'mine', 'top'] as Tab[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setSort(m)}
                  aria-pressed={sort === m}
                  style={{ ...S.tab, ...(sort === m ? S.tabOn : null) }}
                >
                  {m === 'hot' ? 'Hot this week' : m === 'new' ? 'Newest' : m === 'mine' ? 'Yours' : 'Top Creators'}
                </button>
              ))}
            </div>
            <span style={S.count}>{total > 0 ? `${total} scenes` : ''}</span>
          </>
        )}
      </header>
```

- [ ] **Step 5: Top Creators 리스트 렌더 — 카드 그리드 앞에 조건부 삽입**

`{loading && <p style={S.msg}>Loading…</p>}` 줄 바로 뒤에 추가:

```tsx
      {!loading && !err && !viewingCreator && sort === 'top' && (
        topCreators.length === 0 ? (
          <div style={S.empty}>
            <p style={{ margin: '0 0 6px', fontSize: 16 }}>No named creators yet.</p>
            <p style={{ margin: 0, opacity: 0.55, fontSize: 13.5 }}>
              Publish a scene and give it a name to be the first on the board.
            </p>
          </div>
        ) : (
          <ol style={S.leaderboard}>
            {topCreators.map((c, i) => (
              <li key={c.id} style={S.leaderboardRow}>
                <span style={S.leaderboardRank}>{i + 1}</span>
                <button
                  onClick={() => setViewingCreator({ id: c.id, name: c.name || 'Anonymous' })}
                  style={S.leaderboardName}
                >
                  {c.name || 'Anonymous'}
                </button>
                <span style={S.leaderboardStats}>
                  <ThumbIcon /> {c.votes} · {c.scenes} scene{c.scenes === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ol>
        )
      )}
```

- [ ] **Step 6: 카드 그리드는 'top' 탭이 아닐 때만(프로필 보기 포함) 렌더**

기존 `{!loading && !err && scenes.length === 0 && ( ... )}` 빈 상태 블록의 조건을 교체:

```tsx
      {!loading && !err && sort !== 'top' && scenes.length === 0 && (
```

(→ 이후 이 블록의 내용은 그대로. `viewingCreator`일 때 `sort`는 이전 탭 값을 유지하므로 'top'이 아닌
한 그대로 통과 — mine이 아닌 이상 hot/new의 빈 상태 문구가 나오는데, 프로필 뷰에서 씬이 0건이면 그냥
일반 "Nothing here yet" 문구로 충분하다.)

그 다음 `<div style={S.grid}>`로 시작해 `{sort !== 'mine' && scenes.length < total && !loading && ( ... )}`
Load-more 블록 앞까지 이어지는 카드 그리드 전체를 `{sort !== 'top' && ( ... )}`로 감싼다. 그리드 안쪽
(`{scenes.map((s) => { ... })}` 포함 카드 렌더 JSX)은 Step 7 전까지는 그대로 두고 괄호만 추가한다:

```tsx
      {sort !== 'top' && (
        <div style={S.grid}>
          {scenes.map((s) => {
            const v = voted[s.id] ?? s.votes
            const did = hasVoted(s.id)
            return (
              <div key={s.id} className="sl-card" style={S.card}>
                {/* ... 기존 카드 내용(썸네일·remix 배지·제목·투표·footer) 그대로, Step 7에서만 수정 ... */}
              </div>
            )
          })}
        </div>
      )}
```

그리고 그 뒤 `Load more` 블록의 조건을 교체:

```tsx
      {sort !== 'mine' && sort !== 'top' && scenes.length < total && !loading && (
        <div style={S.moreWrap}>
          <button onClick={loadMore} disabled={loadingMore} style={S.moreBtn}>
            {loadingMore ? 'Loading…' : `Load more · ${total - scenes.length} more`}
          </button>
        </div>
      )}
```

- [ ] **Step 7: 카드에 "by 이름" 표시 + 클릭 시 프로필 진입**

기존 `<span style={S.title} title={s.title}>{s.title}</span>` 바로 뒤(같은 `S.meta` div 안, vote
버튼/스팬보다 앞)에 추가:

```tsx
                {s.creatorId && (
                  <button
                    onClick={() => setViewingCreator({ id: s.creatorId!, name: s.creatorName || 'Anonymous' })}
                    style={S.byline}
                    title={`See all scenes by ${s.creatorName || 'Anonymous'}`}
                  >
                    by {s.creatorName || 'Anonymous'}
                  </button>
                )}
```

- [ ] **Step 8: 스타일 추가**

`S` 객체(`lineageLink: { ... },` 줄 뒤)에 추가:

```ts
  byline: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    color: '#8ea0bf',
    fontSize: 11,
    opacity: 0.75,
    cursor: 'pointer',
    flexShrink: 0,
  },
  leaderboard: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  leaderboardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  leaderboardRank: { width: 22, fontSize: 12, opacity: 0.4, fontVariantNumeric: 'tabular-nums' },
  leaderboardName: {
    background: 'transparent',
    border: 'none',
    color: '#eef1f6',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
    textAlign: 'left',
    padding: 0,
  },
  leaderboardStats: {
    fontSize: 12,
    opacity: 0.6,
    fontVariantNumeric: 'tabular-nums',
    display: 'flex',
    alignItems: 'center',
  },
```

- [ ] **Step 9: typecheck**

Run: `pnpm typecheck`
Expected: 에러 없음.

- [ ] **Step 10: build**

Run: `pnpm build`
Expected: 정적 export 성공.

- [ ] **Step 11: Commit**

```bash
git add src/components/GalleryBrowser.tsx
git commit -m "feat(gallery): add creator byline, profile view, and Top Creators leaderboard"
```

---

### Task 7: 프로덕션 배포 (needsUser 단계 포함)

**Files:** 없음(운영 단계).

- [ ] **Step 1: 로컬 종단 재확인**

`npx wrangler dev --port 8799 --local`를 띄운 채:
```bash
pnpm typecheck && pnpm test && python3 scripts/verify-gallery.py
```
Expected: 전부 통과.

- [ ] **Step 2: 프로덕션 D1 마이그레이션 (사용자 직접 실행 — needsUser)**

에이전트는 프로덕션 D1 스키마 변경이 안전분류기에 막힌다(이 프로젝트의 확립된 패턴). 사용자가
`!` 프리픽스로 직접 실행:

```bash
! cd /Users/hyunseok/Desktop/Code/sandlab && npx wrangler d1 execute sandlab-gallery --remote --yes --command "ALTER TABLE scenes ADD COLUMN creator_id TEXT; ALTER TABLE scenes ADD COLUMN creator_name TEXT; CREATE INDEX IF NOT EXISTS idx_scenes_creator ON scenes(creator_id);"
```

- [ ] **Step 3: 배포**

Run:
```bash
pnpm run deploy
```
Expected: 200, 에러 없음. (`run` 빠뜨리면 pnpm 내장 명령과 충돌 — CLAUDE.md 절대 규칙.)

- [ ] **Step 4: 프로덕션 스모크 테스트**

```bash
curl -s https://sandlab.app/api/creators/top
```
Expected: `{"creators":[]}` (아직 아무도 닉네임을 안 정했으므로 빈 배열이 정상 — 에러가 아님).

- [ ] **Step 5: 사용자 육안 확인 (needsUser)**

사용자가 실제로 씬을 하나 그려 Publish하면서 닉네임 프롬프트가 뜨는지, 갤러리 카드에 "by 이름"이
보이는지, Top Creators 탭에 본인이 뜨는지 직접 확인. 이번 장치류(체류시간 장치 #1~#4)와 동일한
검증 사이클 — 헤드리스로 여기까지 온 뒤 마지막 한 걸음만 사람이 닫는다.

- [ ] **Step 6: 인계서 갱신**

`.claude/handoff/main.md`에 이번 세션 요약(창작자 정체성+리더보드 배포, 사용자 육안 확인 결과)을
추가하고 커밋.

---

## 셀프 리뷰 메모 (계획 작성자용, 실행 시 참고)

- **스펙과의 차이 1**: 스펙 문서는 크리에이터 프로필을 `#c=<id>` 해시 라우팅으로 적었지만, 실제
  코드를 보니 `#s=`/`#g=`는 루트 페이지(`SandCanvas.tsx`)가 캔버스에 씬을 로드하는 용도의 해시이고
  갤러리(`/gallery`)는 애초에 탭 상태를 URL에 반영하지 않는 완전히 별개의 Next.js 라우트다(정적
  export라 `[id]` 동적 라우트도 못 씀 — `/s/:id`처럼 Worker가 직접 HTML을 만드는 것도 이 규모엔
  과함). 그래서 프로필/리더보드는 컴포넌트 상태(`viewingCreator`)로 구현한다 — 기존 `mine` 탭과
  동일한 패턴(URL에 안 남음). 링크 공유는 안 되지만, "무계정" 제품의 기존 관례와 정확히 일치한다.
- **스펙과의 차이 2**: creator_id를 "업로드마다 항상 생성"이 아니라 "닉네임을 처음 지정하는 순간에만
  생성"으로 좁혔다 — 완전 익명 사용자가 리더보드에 이름 없는 유령으로 잡히는 걸 막기 위함. 스펙의
  의도(시드 콘텐츠와 실사용자 분리)를 사용자 익명 스킵까지 일관되게 확장한 것.
