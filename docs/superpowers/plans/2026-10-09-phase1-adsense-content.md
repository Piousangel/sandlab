# Phase 1 — AdSense 콘텐츠 정비 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AdSense 반려 사유 두 가지("게시자 콘텐츠 없는 화면에 광고", "가치 없는 콘텐츠")를 제거한다 — 광고 로더를 글 있는 페이지로 한정하고, 재료 가이드·소개·개인정보 페이지를 추가한다.

**Architecture:** 루트 레이아웃의 AdSense `<script>`를 `AdLoader` 컴포넌트로 옮겨 콘텐츠 페이지 공용 셸(`ContentShell`)에서만 렌더한다. 재료 가이드는 `materials.ts` 반응표에서 반응 문장을 순수 함수로 유도하고, 재료별 설명문은 손으로 쓴 별도 파일에 둔다. 빌드 산출물(`out/`)을 스캔하는 검증 스크립트로 "광고 로더가 허용 페이지에만 있다"를 강제한다.

**Tech Stack:** Next.js 15 App Router 정적 export(`output: 'export'`), React 19, TypeScript, vitest, Node 스크립트(.mjs).

**Spec:** `docs/superpowers/specs/2026-10-09-challenge-mode-design.md` (§3 AdSense 정비, §2 라우트 표, §9 단계 1)

## Global Constraints

- 배포는 Cloudflare Workers 전용, `pnpm run deploy`(`run` 필수). 버셀 금지.
- 콘텐츠 언어는 영어만. `<html lang="en">` 유지.
- 광고 허용 페이지(✅): `/materials`, `/materials/[slug]`, `/about`, `/privacy`. (`/play`는 Phase 2에서 추가)
- 광고 금지: `/`, `/gallery`, 404, 그 밖의 모든 페이지.
- `google-adsense-account` 메타 태그는 루트 레이아웃에 유지(소유권 확인, 모든 페이지).
- ads.txt(`public/ads.txt`) 수정 금지.
- 재료 설명문은 재료마다 직접 쓴 문장. 템플릿 치환으로 찍어낸 문장 금지(저가치 판정 위험). 반응 수치만 자동 삽입.
- 스타일은 기존 컨벤션: 인라인 스타일, 배경 `#07090D`, 글자 `#eef1f6`, 시스템 폰트.
- `pnpm lint`는 기존부터 깨져 있음(eslint 미설치) — 이 계획의 검증 항목이 아니다. 고치지 않는다.
- 검증 명령: `pnpm test`, `pnpm typecheck`, `pnpm build`, `node scripts/verify-ads.mjs`, `node scripts/verify-margolus.mjs`.

## Review Focus

- 광고 로더가 새로 추가된 페이지 중 허용 목록 밖 페이지(예: 404 `out/404.html`, `/gallery`)에 실리면 반려 사유가 그대로 남는다 → `verify-ads.mjs`가 **전체 HTML을 스캔**하고 허용 목록 외 등장 시 실패해야 한다(Task 1).
- 반응 문장에서 `self`/`empty` 센티넬이 사람 문장으로 바뀌어야 한다("turns into itself" 같은 문장 금지) → Task 2 테스트.
- 다른 재료의 반응표에만 적힌 반응(예: 물의 `with: 'lava'`)도 용암 페이지에 나와야 한다 → Task 2 `undergoes`/`causes` 양방향 테스트.
- `empty`는 재료 가이드 페이지가 없어야 한다(슬러그 `/materials/empty` 생성 금지) → Task 3 테스트.
- 재료가 `materials.ts`에 추가됐는데 설명문이 없으면 빌드가 아니라 테스트가 실패해야 한다 → Task 2 테스트.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/components/AdLoader.tsx` (신규) | AdSense 로더 `<script>` 하나. 다른 일 없음 |
| `src/components/ContentShell.tsx` (신규) | 콘텐츠 페이지 공용 셸: 헤더 내비, 본문 폭, 푸터 링크, `AdLoader` 포함 |
| `src/lib/guide/reactions.ts` (신규) | `materials.ts` → 재료별 반응 문장(양방향) 순수 함수 |
| `src/lib/guide/copy.ts` (신규) | 재료별 손글씨 설명문 데이터 |
| `src/lib/guide/reactions.test.ts`, `copy.test.ts` (신규) | 위 두 파일 테스트 |
| `src/app/materials/page.tsx` (신규) | 재료 목록 + 반응 매트릭스 |
| `src/app/materials/[slug]/page.tsx` (신규) | 재료별 가이드 |
| `src/app/about/page.tsx`, `src/app/privacy/page.tsx` (신규) | 소개, 개인정보 |
| `src/app/sitemap.ts` (수정) + `src/app/sitemap.test.ts` (신규) | 새 페이지 등록 |
| `src/app/layout.tsx` (수정) | 광고 로더 제거 |
| `src/lib/site.ts` (수정) | `CONTACT_EMAIL` 추가 |
| `src/components/GalleryBrowser.tsx` (수정) | 헤더에 Guide 링크(내부 링크) |
| `scripts/verify-ads.mjs` (신규) | 빌드 산출물 광고 로더 위치·본문 글자수 검증 |

---

### Task 1: 광고 로더 격리 + 산출물 검증 스크립트

**Files:**
- Create: `scripts/verify-ads.mjs`, `src/components/AdLoader.tsx`
- Modify: `src/app/layout.tsx:69-76`

**Interfaces:**
- Produces: `export default function AdLoader(): JSX.Element` — 인자 없음. Task 3·4의 `ContentShell`이 렌더한다.
- Produces: `node scripts/verify-ads.mjs` — `out/`을 스캔. 허용 목록(`ALLOW`)은 파일 상단 상수. Task 3·4가 페이지를 추가할 때 이 목록과 `MIN_TEXT`를 갱신한다.

- [ ] **Step 1: 검증 스크립트 작성(실패해야 정상)**

`scripts/verify-ads.mjs`:

```js
/**
 * AdSense 배치 검증 — 빌드 산출물(out/) 기준.
 *
 * 왜: AdSense가 "게시자 콘텐츠가 없는 화면에 Google 게재 광고"로 sandlab.app을 반려했다
 * (2026-09-21). 로더가 루트 레이아웃에 있어 캔버스 화면·갤러리 로딩 화면에까지 실렸기 때문.
 * 이 스크립트는 (1) 로더가 허용 페이지에만 있고 (2) 허용 페이지엔 반드시 있으며
 * (3) 허용 페이지의 정적 본문 텍스트가 최소 분량 이상인지를 강제한다.
 *
 * 실행: pnpm build && node scripts/verify-ads.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const OUT = 'out'
const MARK = 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'

// 광고 허용 페이지 (out/ 기준 상대 경로). 정규식은 동적 세그먼트용.
const ALLOW = [/^materials\.html$/, /^materials\/[a-z]+\.html$/, /^about\.html$/, /^privacy\.html$/]
// 허용 페이지의 최소 본문 글자 수(태그·스크립트·스타일 제거 후). 얇은 페이지에 광고 = 반려 재발.
const MIN_TEXT = 600

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []
  })
}

function bodyText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const failures = []
let allowedSeen = 0
for (const file of walk(OUT)) {
  const rel = relative(OUT, file)
  const html = readFileSync(file, 'utf8')
  const hasAd = html.includes(MARK)
  const allowed = ALLOW.some((re) => re.test(rel))
  if (allowed) {
    allowedSeen++
    if (!hasAd) failures.push(`${rel}: 허용 페이지인데 광고 로더 없음`)
    const n = bodyText(html).length
    if (n < MIN_TEXT) failures.push(`${rel}: 본문 ${n}자 < ${MIN_TEXT}자`)
  } else if (hasAd) {
    failures.push(`${rel}: 허용 목록 밖인데 광고 로더 있음`)
  }
}
if (allowedSeen === 0) failures.push('허용 페이지가 하나도 빌드되지 않음')

if (failures.length) {
  console.error(`FAIL (${failures.length})\n` + failures.map((f) => '  - ' + f).join('\n'))
  process.exit(1)
}
console.log(`OK — 허용 페이지 ${allowedSeen}개, 그 외 페이지에 광고 로더 없음`)
```

- [ ] **Step 2: 빌드 후 실행 — 실패 확인**

Run: `pnpm build && node scripts/verify-ads.mjs`
Expected: FAIL — `index.html: 허용 목록 밖인데 광고 로더 있음`, `gallery.html: ...`, `404.html: ...`, `허용 페이지가 하나도 빌드되지 않음`.

- [ ] **Step 3: AdLoader 생성, 루트 레이아웃에서 제거**

`src/components/AdLoader.tsx`:

```tsx
/**
 * Google AdSense 로더. 글 콘텐츠가 있는 페이지(ContentShell)에서만 렌더한다.
 *
 * 루트 레이아웃에 두면 캔버스 화면·갤러리 로딩 화면에도 실려 AdSense가 "게시자 콘텐츠가 없는
 * 화면에 광고"로 반려한다(2026-09-21 실제 반려). 허용 페이지 목록은 scripts/verify-ads.mjs가 강제한다.
 * 자동광고는 대시보드에서 꺼둔 상태 — 이 로더는 심사·게재 자격용이다.
 */
export default function AdLoader() {
  return (
    <script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9363381710674627"
      crossOrigin="anonymous"
    />
  )
}
```

`src/app/layout.tsx`에서 아래 블록(주석 2줄 + `<script async src=".../adsbygoogle.js...">`)을 삭제한다. `metadata.other['google-adsense-account']`는 그대로 둔다:

```tsx
        {/* Google AdSense 로더 — 심사·게재용. 자동광고는 대시보드에서 끄고 갤러리 하단 유닛만 쓴다
            (캔버스 미학 보호). 승인 전엔 광고가 뜨지 않는다. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9363381710674627"
          crossOrigin="anonymous"
        />
```

- [ ] **Step 4: 재빌드 후 실행 — 남은 실패는 "허용 페이지 없음"뿐**

Run: `pnpm build && node scripts/verify-ads.mjs`
Expected: FAIL 1건 — `허용 페이지가 하나도 빌드되지 않음`. (`index.html`/`gallery.html`/`404.html` 실패는 사라져야 한다. Task 3에서 페이지가 생기면 통과.)

- [ ] **Step 5: 기존 테스트·타입 확인 후 커밋**

Run: `pnpm test && pnpm typecheck`
Expected: 73 passed, tsc 에러 없음.

```bash
git add scripts/verify-ads.mjs src/components/AdLoader.tsx src/app/layout.tsx
git commit -m "fix(adsense): 광고 로더를 루트 레이아웃에서 분리 + 산출물 배치 검증 스크립트

AdSense 반려 사유 '게시자 콘텐츠가 없는 화면에 광고' — 로더가 캔버스·갤러리 로딩
화면에 실리던 원인 제거. verify-ads.mjs가 허용 페이지 외 등장을 막는다.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 재료 반응 문장 + 손글씨 설명문

**Files:**
- Create: `src/lib/guide/reactions.ts`, `src/lib/guide/reactions.test.ts`, `src/lib/guide/copy.ts`, `src/lib/guide/copy.test.ts`

**Interfaces:**
- Consumes: `PRESETS: Material[]`, `Reaction`, `Material` from `@/lib/sand/materials`
- Produces:
  ```ts
  export interface ReactionLine { partner: string; chance: number; text: string }
  export function guideMaterials(): Material[]            // PRESETS minus 'empty'
  export function materialBySlug(slug: string): Material | undefined
  export function reactionsOf(slug: string): { causes: ReactionLine[]; undergoes: ReactionLine[] }
  export function chanceLabel(chance: number): string     // 0.9 → 'very fast', ...
  export interface MaterialCopy { summary: string; body: string[]; tip: string }
  export const COPY: Record<string, MaterialCopy>
  ```

정의: `materials.ts`의 반응 `{ with, become, other }`는 "이 재료(self)가 `with`에 닿으면, 틱당 `chance` 확률로 self는 `become`이 되고 닿은 이웃은 `other`가 된다"이다. `become: 'self'`=그대로, `other: 'self'`=이웃이 self 재료로 바뀜, `'empty'`=사라짐.
- `causes`: self가 리스트에 가진 반응 중 **이웃이 바뀌는** 것(`other !== 'self'`가 아닌 경우 포함 — 아래 문장 규칙 참고). 단순화를 위해: self 쪽 리스트의 모든 반응은 해당 재료 페이지의 `undergoes`에도, 상대(`with`) 재료 페이지의 `causes`에도 나온다. 즉 **각 반응은 두 페이지에 한 번씩** 나온다.
  - self 페이지 `undergoes`: "Touching {With}: {self 결과 문장}; the {With} {other 결과 문장}."
  - with 페이지 `causes`: "Touching {Self}: the {Self} {self 결과 문장}; this {With} {other 결과 문장}."

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/guide/reactions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PRESETS } from '@/lib/sand/materials'
import { guideMaterials, materialBySlug, reactionsOf, chanceLabel } from './reactions'

describe('guideMaterials', () => {
  it('empty를 제외한 모든 재료를 PRESETS 순서로 돌려준다', () => {
    const slugs = guideMaterials().map((m) => m.slug)
    expect(slugs).not.toContain('empty')
    expect(slugs).toEqual(PRESETS.filter((m) => m.slug !== 'empty').map((m) => m.slug))
  })
  it('materialBySlug는 empty와 없는 slug에 undefined', () => {
    expect(materialBySlug('empty')).toBeUndefined()
    expect(materialBySlug('nope')).toBeUndefined()
    expect(materialBySlug('lava')?.name).toBe('Lava')
  })
})

describe('reactionsOf', () => {
  it('자기 반응표의 반응은 undergoes에 나온다 (물 + 용암)', () => {
    const { undergoes } = reactionsOf('water')
    const lava = undergoes.find((r) => r.partner === 'lava')
    expect(lava).toBeDefined()
    expect(lava!.chance).toBe(0.7)
    expect(lava!.text).toBe('Touching Lava: turns into Steam; the Lava turns into Stone.')
  })
  it('다른 재료 반응표에 적힌 반응은 상대 페이지 causes에 나온다 (용암 페이지에 물 반응)', () => {
    const { causes } = reactionsOf('lava')
    const water = causes.find((r) => r.partner === 'water')
    expect(water).toBeDefined()
    expect(water!.text).toBe('Touching Water: the Water turns into Steam; this Lava turns into Stone.')
  })
  it("'self'/'empty' 센티넬은 사람 문장으로 바뀐다", () => {
    // salt: { with: 'water', become: 'empty', other: 'water' } → 소금은 사라지고 물은 그대로
    const salt = reactionsOf('salt').undergoes.find((r) => r.partner === 'water')!
    expect(salt.text).toBe('Touching Water: dissolves away; the Water stays Water.')
    // acid: { with: 'metal', become: 'self', other: 'empty' }
    const acid = reactionsOf('acid').undergoes.find((r) => r.partner === 'metal')!
    expect(acid.text).toBe('Touching Metal: stays Acid; the Metal dissolves away.')
    // wood: { with: 'fire', become: 'fire', other: 'self' } → 이웃 불이 나무가 됨(셰이더 의미 그대로)
    const wood = reactionsOf('wood').undergoes.find((r) => r.partner === 'fire')!
    expect(wood.text).toBe('Touching Fire: turns into Fire; the Fire turns into Wood.')
    for (const m of guideMaterials()) {
      const { causes, undergoes } = reactionsOf(m.slug)
      for (const r of [...causes, ...undergoes]) {
        expect(r.text).not.toMatch(/\bself\b|\bempty\b|Empty/)
      }
    }
  })
  it('모든 반응이 정확히 두 번(undergoes 1 + causes 1) 나온다', () => {
    const total = PRESETS.reduce((n, m) => n + m.reactions.length, 0)
    let u = 0
    let c = 0
    for (const m of guideMaterials()) {
      const r = reactionsOf(m.slug)
      u += r.undergoes.length
      c += r.causes.length
    }
    expect(u).toBe(total)
    expect(c).toBe(total)
  })
  it('반응 없는 재료는 빈 배열', () => {
    expect(reactionsOf('wall')).toEqual({ causes: [], undergoes: [] })
  })
})

describe('chanceLabel', () => {
  it('확률 구간을 말로 바꾼다', () => {
    expect(chanceLabel(0.9)).toBe('almost instant')
    expect(chanceLabel(0.5)).toBe('fast')
    expect(chanceLabel(0.2)).toBe('steady')
    expect(chanceLabel(0.05)).toBe('slow')
    expect(chanceLabel(0.01)).toBe('very slow')
  })
})
```

- [ ] **Step 2: 실행 — 실패 확인**

Run: `pnpm vitest run src/lib/guide/reactions.test.ts`
Expected: FAIL — `Failed to resolve import "./reactions"`.

- [ ] **Step 3: 구현**

`src/lib/guide/reactions.ts`:

```ts
/**
 * 재료 가이드용 반응 문장 — materials.ts(SSOT)에서 유도한다.
 *
 * 반응 의미(셰이더와 동일): self 재료가 `with`에 닿으면 틱당 `chance` 확률로
 * self → `become`, 닿은 이웃 → `other`. 'self' = 그대로(이웃 쪽이면 self 재료로 바뀜), 'empty' = 사라짐.
 * 각 반응은 두 페이지에 한 번씩 나온다: self 페이지의 undergoes, with 페이지의 causes.
 * 수치만 자동이고, 설명문은 copy.ts에 손으로 쓴다(템플릿 문장은 저가치 판정 위험).
 */
import { PRESETS, type Material, type Reaction } from '@/lib/sand/materials'

export interface ReactionLine {
  partner: string
  chance: number
  text: string
}

export function guideMaterials(): Material[] {
  return PRESETS.filter((m) => m.slug !== 'empty')
}

export function materialBySlug(slug: string): Material | undefined {
  return guideMaterials().find((m) => m.slug === slug)
}

const nameOf = (slug: string) => PRESETS.find((m) => m.slug === slug)?.name ?? slug

/** subject(재료 slug)가 result로 바뀌는 것을 서술. 'self'는 subject 그대로. */
function outcome(subject: string, result: string, selfSlug: string): string {
  if (result === 'empty') return 'dissolves away'
  const target = result === 'self' ? selfSlug : result
  if (target === subject) return `stays ${nameOf(subject)}`
  return `turns into ${nameOf(target)}`
}

function lines(self: Material, r: Reaction) {
  const selfName = self.name
  const withName = nameOf(r.with)
  const selfOut = r.become === 'self' ? `stays ${selfName}` : outcome(self.slug, r.become, self.slug)
  const otherOut = outcome(r.with, r.other, self.slug)
  return {
    undergoes: `Touching ${withName}: ${selfOut}; the ${withName} ${otherOut}.`,
    causes: `Touching ${selfName}: the ${selfName} ${selfOut}; this ${withName} ${otherOut}.`,
  }
}

export function reactionsOf(slug: string): { causes: ReactionLine[]; undergoes: ReactionLine[] } {
  const causes: ReactionLine[] = []
  const undergoes: ReactionLine[] = []
  for (const m of PRESETS) {
    for (const r of m.reactions) {
      const t = lines(m, r)
      if (m.slug === slug) undergoes.push({ partner: r.with, chance: r.chance, text: t.undergoes })
      if (r.with === slug) causes.push({ partner: m.slug, chance: r.chance, text: t.causes })
    }
  }
  return { causes, undergoes }
}

export function chanceLabel(chance: number): string {
  if (chance >= 0.7) return 'almost instant'
  if (chance >= 0.3) return 'fast'
  if (chance >= 0.1) return 'steady'
  if (chance >= 0.03) return 'slow'
  return 'very slow'
}
```

- [ ] **Step 4: 실행 — 통과 확인**

Run: `pnpm vitest run src/lib/guide/reactions.test.ts`
Expected: PASS (전부). 실패하면 문장 규칙을 테스트 기대값에 맞춘다 — 테스트 문장이 기준이다.

- [ ] **Step 5: 설명문 테스트 작성**

`src/lib/guide/copy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { guideMaterials } from './reactions'
import { COPY } from './copy'

const words = (s: string) => s.trim().split(/\s+/).length

describe('재료 설명문', () => {
  it('가이드 대상 재료 전부에 설명문이 있고, 남는 키가 없다', () => {
    const slugs = guideMaterials().map((m) => m.slug).sort()
    expect(Object.keys(COPY).sort()).toEqual(slugs)
  })
  it('각 설명문은 summary 1문장 + 본문 2문단 이상 + tip, 합계 90단어 이상', () => {
    for (const [slug, c] of Object.entries(COPY)) {
      expect(c.summary.length, slug).toBeGreaterThan(20)
      expect(c.body.length, slug).toBeGreaterThanOrEqual(2)
      expect(c.tip.length, slug).toBeGreaterThan(20)
      const total = words(c.summary) + c.body.reduce((n, p) => n + words(p), 0) + words(c.tip)
      expect(total, slug).toBeGreaterThanOrEqual(90)
    }
  })
  it('설명문끼리 문단이 겹치지 않는다(템플릿 복붙 방지)', () => {
    const seen = new Set<string>()
    for (const c of Object.values(COPY)) {
      for (const p of c.body) {
        expect(seen.has(p)).toBe(false)
        seen.add(p)
      }
    }
  })
})
```

- [ ] **Step 6: 실행 — 실패 확인**

Run: `pnpm vitest run src/lib/guide/copy.test.ts`
Expected: FAIL — `Failed to resolve import "./copy"`.

- [ ] **Step 7: 설명문 작성**

`src/lib/guide/copy.ts` — 아래 내용 그대로(수치는 `materials.ts` 기준으로 맞춰 썼다. 수치를 바꾸면 이 문장도 고친다):

```ts
/**
 * 재료별 손글씨 설명문(영어). 반응 수치는 reactions.ts가 표로 따로 붙인다.
 * 템플릿 치환 금지 — 재료마다 실제로 시뮬에서 벌어지는 일을 쓴다. copy.test.ts가
 * 누락·분량·문단 중복을 막는다.
 */
export interface MaterialCopy {
  summary: string
  body: string[]
  tip: string
}

export const COPY: Record<string, MaterialCopy> = {
  wall: {
    summary: 'Wall is the indestructible frame of every scene: nothing moves it, burns it, or eats through it.',
    body: [
      'Wall is the heaviest material in Sandlab and it never moves. No reaction in the table targets it, so acid, lava and fire all slide off it. That makes it the only truly permanent material you can paint.',
      'Use it for anything that has to survive the whole scene: the sides of a container, a funnel that guides sand, or a floor that should still be there after the lava has finished its work. If you want a barrier that eventually fails, pick stone or metal instead.',
    ],
    tip: 'Build containers out of wall first, then fill them. A one-cell gap is enough for water to leak through, so draw walls with a thicker brush than you think you need.',
  },
  stone: {
    summary: 'Stone is solid rock that stays put until acid slowly dissolves it.',
    body: [
      'Stone is static and heavy, so powders pile on top of it and liquids pool against it. Unlike wall, it is not permanent: acid eats a touching stone cell at a modest rate, so an acid pool will carve a channel through a stone floor given time.',
      'Stone is also what you get when water meets lava. That reaction is how you build bridges in the challenges: pour water onto a lava river and the surface hardens into a stone crust you can stack sand on.',
    ],
    tip: 'If a stone wall is leaking, look for acid. If you need stone where there is none, pour water onto lava and let the crust form.',
  },
  metal: {
    summary: 'Metal is a heavy static block that only acid can harm.',
    body: [
      'Metal behaves like stone for movement, but acid eats it faster than stone. Fire and lava have no effect on it, which makes metal a good choice for a heat-proof shelf that you still want to be able to cut later.',
      'Because acid removes metal one cell at a time and keeps going, a thin metal plate is a natural timer: put acid on top and the plate gives way after a few seconds, dropping whatever was resting on it.',
    ],
    tip: 'Use a thin metal floor with acid above it as a delayed trapdoor. Thicker plates take longer to cut, so the plate thickness sets the delay.',
  },
  wood: {
    summary: 'Wood is static fuel: it stands still until fire or lava sets it burning.',
    body: [
      'Wood does not fall, so you can build shelves and houses out of it. Its weakness is heat. Fire spreads into touching wood steadily, and lava ignites it even faster, so a single spark can take down a whole wooden structure one cell at a time.',
      'Acid also eats wood, quickly. That gives you two ways to remove a wooden obstacle: burn it, which spreads unpredictably and makes smoke, or dissolve it, which is precise but costs acid.',
    ],
    tip: 'To protect wood from a fire, cut a gap: fire only spreads to cells it touches. Water poured on the flames turns them to steam before they reach the next plank.',
  },
  plant: {
    summary: 'Plant is living, static growth that spreads along water and burns very easily.',
    body: [
      'Plant cells do not move, but when water touches them, the water slowly turns into more plant. A small patch of plant next to a pool will creep across it over time. Seeds that land in water sprout into the same material.',
      'The trade-off is fire. Plant catches fire faster than wood, and lava ignites it faster still, so an overgrown scene is also a very flammable one.',
    ],
    tip: 'To grow plant upward, keep feeding it water from above. To stop it spreading, take away the water rather than trying to cut the plant.',
  },
  ice: {
    summary: 'Ice is a static, slightly glowing solid that freezes water and melts in heat.',
    body: [
      'Ice slowly turns touching water into more ice, so a block of ice in a pool will grow. Heat reverses that: fire melts ice into water and turns the flame into steam, and lava melts it almost instantly, leaving water behind and cooling the lava into stone.',
      'That last reaction makes ice a lava stopper. Drop ice into a lava flow and you get a plug of stone with a puddle of water on top.',
    ],
    tip: 'Ice is the cleanest way to stop lava. Water also works but boils off as steam, while ice leaves solid stone exactly where it touched.',
  },
  sand: {
    summary: 'Sand is the classic falling powder: it piles into dunes and sinks through lighter liquids.',
    body: [
      'Sand falls and slides off slopes, forming cones and dunes. It is heavier than water and oil, so it sinks to the bottom of a pool and pushes the liquid up. It has no reactions at all, which makes it the most predictable material for building.',
      'Because sand displaces liquid, you can use it to raise a water level: pour sand into a cup of water and the water rises over the rim.',
    ],
    tip: 'Sand is the best cheap filler. When a challenge asks you to block or raise something without side effects, try sand first.',
  },
  salt: {
    summary: 'Salt is a white powder that dissolves when it touches water.',
    body: [
      'Salt falls like sand, but water eats it: a salt cell touching water disappears at a slow, steady rate, and the water stays water. A heap of salt in a pool shrinks from the bottom up.',
      'That makes salt a temporary material. A salt dam holds back water for a while and then fails on its own, which is useful when something needs to happen later rather than now.',
    ],
    tip: 'Use salt as a timed barrier: the more salt touches the water, the faster it goes. A tall, thin dam lasts longer than a short, wide one.',
  },
  ash: {
    summary: 'Ash is a light grey powder that falls and settles but does nothing else.',
    body: [
      'Ash is lighter than sand and has no reactions, so it behaves like a soft, inert dust. It sinks through gases and comes to rest on top of anything denser.',
      'Ash is good for decoration and for filling space without changing what happens in the scene. Nothing ignites it, dissolves it, or turns it into anything else.',
    ],
    tip: 'When you need a powder that will not react with a nearby fire or acid, use ash instead of gunpowder, seed or salt.',
  },
  gunpowder: {
    summary: 'Gunpowder is a dark powder that turns into fire almost instantly when heat touches it.',
    body: [
      'Gunpowder falls like sand, but any fire or lava touching it converts both cells to fire almost immediately. The new fire touches the next grains, so a trail of gunpowder burns along its whole length in a fraction of a second.',
      'That speed is the point. A gunpowder fuse carries fire across a scene far faster than wood or oil, and a pile of it flashes into a burst of flame that can reach targets nothing else can.',
    ],
    tip: 'Lay gunpowder as a thin fuse from a fire source to whatever you want to light. Keep water away from the path, or the fire becomes steam before it arrives.',
  },
  seed: {
    summary: 'Seed is a light powder that sprouts into plant when it lands in water.',
    body: [
      'Seed falls like a light sand. When a seed touches water, it slowly becomes a plant cell and uses up the water it touched. The plant then keeps growing along any remaining water.',
      'Sprinkle seed over a pond and the surface turns green. Drop seed on dry ground and nothing happens until water arrives, so seed lets you plant growth now and trigger it later.',
    ],
    tip: 'To grow plant where you want it, put seed there first and send water to it afterwards. The plant follows the water from that point on.',
  },
  water: {
    summary: 'Water is the everyday liquid: it flows, finds its level, and puts out fire.',
    body: [
      'Water spreads sideways until it is flat, fills containers, and sinks below oil. Touching fire turns both the water and the flame into steam almost instantly, which is why water is the fastest way to stop a fire.',
      'Water and lava react too: the water boils into steam while the lava cools into stone. Water also feeds plants, sprouts seeds, freezes against ice and dissolves salt, so it is involved in more reactions than any other material.',
    ],
    tip: 'Water is consumed when it fights fire or lava, so pour more than you think you need, and pour it where the fire is going rather than where it has been.',
  },
  oil: {
    summary: 'Oil is a light, dark liquid that floats on water and burns readily.',
    body: [
      'Oil is lighter than water, so it always ends up on top of it. Fire spreads into oil fast, and lava ignites it almost instantly, so a film of oil on a pond becomes a sheet of flame.',
      'Because it floats, oil lets fire travel across water, which is normally a fire break. That makes it the material to use when you need a fire to reach the far side of a pool.',
    ],
    tip: 'Pour oil on water to make a burning bridge. Oil fires are stubborn: water quenches the flames it touches but sinks beneath the oil, leaving the fuel on top to catch again.',
  },
  acid: {
    summary: 'Acid is a glowing green liquid that eats metal, stone and wood.',
    body: [
      'Acid flows like water and dissolves the static materials it touches: wood fastest, then metal, then stone. The acid itself survives each bite, so one pool keeps cutting until it runs out of things to eat.',
      'Water neutralises it. When acid meets water both turn into steam, so a water moat is the one barrier acid cannot dissolve its way through.',
    ],
    tip: 'Acid cannot touch wall, so contain it with wall. To stop an acid leak in a hurry, pour water on it.',
  },
  lava: {
    summary: 'Lava is a heavy, glowing liquid that ignites fuel and hardens into stone when cooled.',
    body: [
      'Lava is a liquid heavier than water and oil, so it sinks beneath both. It sets wood, plant and oil on fire on contact, and it keeps doing so because the lava itself is not used up.',
      'Cooling turns it to rock. Water poured on lava boils into steam and leaves stone behind, and ice does the same even faster. That is how you build a crossing over a lava river.',
    ],
    tip: 'To cross lava, harden its surface with water or ice, then build on the stone crust. To burn something far away, lead lava to it in a channel.',
  },
  fire: {
    summary: 'Fire is a short-lived glowing gas that spreads into fuel and then burns out.',
    body: [
      'A fire cell rises and fades after a short lifetime. It survives by spreading: it turns touching wood, plant and oil into more fire. Without fuel it dies out on its own in about a second.',
      'Water and ice are its enemies. Water turns flame into steam almost instantly, and ice melts while putting the fire out. Gunpowder, on the other hand, turns into fire immediately and carries it far.',
    ],
    tip: 'Fire goes where the fuel is. To save something, remove the fuel between it and the flames; to burn something, give the fire a path of oil or gunpowder.',
  },
  steam: {
    summary: 'Steam is the hot white gas left behind when water meets fire or lava.',
    body: [
      'Steam rises and drifts for a few seconds before it disappears. It does not react with anything, so it is purely a by-product: a sign that water just fought fire, lava or acid somewhere below.',
      'Because steam takes the place of the water that made it, the water is gone. A lot of steam means a lot of water was spent.',
    ],
    tip: 'Watch the steam to see where your water is being used up. If a challenge is running short on water, the steam shows you where it went.',
  },
  smoke: {
    summary: 'Smoke is a dark, inert gas that rises and fades.',
    body: [
      'Smoke floats upward and vanishes after a couple of seconds. Nothing reacts with it, so it never spreads fire or puts it out; it only drifts.',
      'In Sandlab, smoke is a painting material more than a physical one. Use it for chimneys, fog and atmosphere that should clear on its own.',
    ],
    tip: 'Paint smoke at the top of a fire scene for a more convincing plume. It disappears by itself, so it never clutters the final picture.',
  },
}
```

- [ ] **Step 8: 실행 — 통과 확인 + 사실 대조**

Run: `pnpm vitest run src/lib/guide`
Expected: PASS.
그리고 각 재료 설명문의 사실 주장을 `materials.ts` 반응표와 눈으로 대조한다(예: "acid eats wood fastest" ↔ wood 0.3 > metal 0.25 > stone 0.15). 틀린 문장은 반응표에 맞춰 고친다 — 반응표가 SSOT다.

- [ ] **Step 9: 커밋**

```bash
git add src/lib/guide
git commit -m "feat(guide): 재료 반응 문장(양방향) 유도 + 재료별 설명문

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ContentShell + 재료 가이드 페이지

**Files:**
- Create: `src/components/ContentShell.tsx`, `src/app/materials/page.tsx`, `src/app/materials/[slug]/page.tsx`, `src/app/materials/staticParams.test.ts`
- Modify: `src/lib/site.ts`

**Interfaces:**
- Consumes: `guideMaterials`, `materialBySlug`, `reactionsOf`, `chanceLabel`, `COPY` (Task 2), `AdLoader` (Task 1)
- Produces:
  ```tsx
  export default function ContentShell(props: { children: React.ReactNode; ads?: boolean }): JSX.Element // ads 기본 true
  export const CONTACT_EMAIL = 'hello@sandlab.app' // src/lib/site.ts
  export function materialStaticParams(): { slug: string }[] // src/app/materials/[slug]/page.tsx 에서 export 하지 않고 src/lib/guide/reactions.ts 에 둔다
  ```
  `materialStaticParams`는 `src/lib/guide/reactions.ts`에 추가한다(페이지 파일에서 named export를 추가하면 Next가 거부한다).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/materials/staticParams.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { materialStaticParams } from '@/lib/guide/reactions'

describe('materialStaticParams', () => {
  it('empty 없이 가이드 재료 전부의 slug를 낸다', () => {
    const slugs = materialStaticParams().map((p) => p.slug)
    expect(slugs).not.toContain('empty')
    expect(slugs).toContain('lava')
    expect(slugs.length).toBe(18)
  })
  it('slug는 소문자 알파벳만 (verify-ads.mjs 허용 정규식과 일치)', () => {
    for (const { slug } of materialStaticParams()) expect(slug).toMatch(/^[a-z]+$/)
  })
})
```

- [ ] **Step 2: 실행 — 실패 확인**

Run: `pnpm vitest run src/app/materials`
Expected: FAIL — `materialStaticParams is not a function` (또는 export 없음).

- [ ] **Step 3: `materialStaticParams` + `CONTACT_EMAIL` 추가**

`src/lib/guide/reactions.ts` 끝에 추가:

```ts
/** /materials/[slug] 정적 생성 목록. empty는 가이드 페이지가 없다. */
export function materialStaticParams(): { slug: string }[] {
  return guideMaterials().map((m) => ({ slug: m.slug }))
}
```

`src/lib/site.ts` 끝에 추가:

```ts
/** 문의 주소 — /about, /privacy에 노출. Cloudflare Email Routing으로 운영자 메일함에 전달된다. */
export const CONTACT_EMAIL = 'hello@sandlab.app'
```

Run: `pnpm vitest run src/app/materials` → PASS.

- [ ] **Step 4: ContentShell 작성**

`src/components/ContentShell.tsx`:

```tsx
import Link from 'next/link'
import AdLoader from './AdLoader'

/**
 * 글 콘텐츠 페이지 공용 셸(가이드·소개·개인정보·레벨 목록).
 * 광고 로더는 여기서만 렌더된다 — 캔버스/갤러리 화면엔 절대 넣지 않는다(scripts/verify-ads.mjs가 강제).
 * 루트 body가 overscroll-behavior:none + 캔버스용이라, 이 셸이 스크롤 가능한 문서 레이아웃을 따로 잡는다.
 */
const link = { color: '#eef1f6', textDecoration: 'none', opacity: 0.75, fontSize: 14 } as const

export default function ContentShell({ children, ads = true }: { children: React.ReactNode; ads?: boolean }) {
  return (
    <div style={{ minHeight: '100vh', overflowY: 'auto' }}>
      {ads && <AdLoader />}
      <header
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '20px 18px 0',
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Link href="/" style={{ ...link, opacity: 1, fontWeight: 700, fontSize: 16 }}>
          Sandlab
        </Link>
        <Link href="/materials" style={link}>Materials</Link>
        <Link href="/gallery" style={link}>Gallery</Link>
        <Link href="/about" style={link}>About</Link>
      </header>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 18px 48px', lineHeight: 1.65, fontSize: 16 }}>
        {children}
      </main>
      <footer
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '20px 18px max(32px, env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          fontSize: 13,
        }}
      >
        <Link href="/" style={link}>Open the sandbox</Link>
        <Link href="/materials" style={link}>Materials guide</Link>
        <Link href="/about" style={link}>About</Link>
        <Link href="/privacy" style={link}>Privacy</Link>
      </footer>
    </div>
  )
}
```

- [ ] **Step 5: 재료 목록 + 반응 매트릭스 페이지**

`src/app/materials/page.tsx`:

```tsx
import Link from 'next/link'
import ContentShell from '@/components/ContentShell'
import { guideMaterials, reactionsOf } from '@/lib/guide/reactions'
import { COPY } from '@/lib/guide/copy'
import { PRESETS } from '@/lib/sand/materials'

export const metadata = {
  title: 'Sandlab materials guide — every element and how it reacts',
  description:
    'All 18 Sandlab materials explained: how sand, water, lava, acid, fire and the rest move, and exactly what happens when two of them touch.',
  alternates: { canonical: '/materials' },
}

const GROUPS: { label: string; movement: string }[] = [
  { label: 'Solids', movement: 'static' },
  { label: 'Powders', movement: 'powder' },
  { label: 'Liquids', movement: 'liquid' },
  { label: 'Gases', movement: 'gas' },
]

const nameOf = (slug: string) => PRESETS.find((m) => m.slug === slug)?.name ?? slug

export default function Page() {
  const mats = guideMaterials()
  // 반응 매트릭스: 반응이 하나라도 있는 쌍만 행으로 나열(18×18 표는 대부분 빈칸이라 읽기 어렵다)
  const pairs = PRESETS.flatMap((m) =>
    m.reactions.map((r) => ({ a: m.slug, b: r.with, chance: r.chance, text: reactionsOf(m.slug).undergoes.find((u) => u.partner === r.with)!.text })),
  )
  return (
    <ContentShell>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Materials guide</h1>
      <p style={{ opacity: 0.8 }}>
        Sandlab simulates about 720,000 cells at once, and every cell is one of the materials below. Each
        material has a weight, a way of moving and a short list of reactions. Heavier materials sink through
        lighter ones, powders pile up, liquids find their level and gases rise. When two materials touch,
        the reaction table decides what happens next. This guide explains each material in plain words and
        lists every reaction with how quickly it happens.
      </p>
      {GROUPS.map((g) => (
        <section key={g.label}>
          <h2 style={{ fontSize: 20, marginTop: 32 }}>{g.label}</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {mats
              .filter((m) => m.movement === g.movement)
              .map((m) => (
                <li key={m.slug} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span
                    aria-hidden
                    style={{ width: 12, height: 12, borderRadius: 3, background: m.color, flex: '0 0 auto', transform: 'translateY(1px)' }}
                  />
                  <span>
                    <Link href={`/materials/${m.slug}`} style={{ color: '#eef1f6', fontWeight: 600 }}>
                      {m.name}
                    </Link>
                    <span style={{ opacity: 0.7 }}> — {COPY[m.slug].summary}</span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <section>
        <h2 style={{ fontSize: 20, marginTop: 32 }}>Every reaction</h2>
        <p style={{ opacity: 0.8 }}>
          Reactions happen when two cells touch. The chance is per simulation tick, and the simulation runs
          about sixty ticks a second, so even a 5% chance happens within a second or two of contact.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.6 }}>
              <th style={{ padding: '6px 8px 6px 0' }}>Material</th>
              <th style={{ padding: '6px 8px' }}>What happens</th>
              <th style={{ padding: '6px 0 6px 8px', textAlign: 'right' }}>Chance / tick</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((p) => (
              <tr key={`${p.a}-${p.b}`} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '6px 8px 6px 0', whiteSpace: 'nowrap' }}>{nameOf(p.a)}</td>
                <td style={{ padding: '6px 8px' }}>{p.text}</td>
                <td style={{ padding: '6px 0 6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(p.chance * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ContentShell>
  )
}
```

- [ ] **Step 6: 재료별 페이지**

`src/app/materials/[slug]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ContentShell from '@/components/ContentShell'
import { chanceLabel, materialBySlug, materialStaticParams, reactionsOf } from '@/lib/guide/reactions'
import { COPY } from '@/lib/guide/copy'

export const dynamicParams = false

export function generateStaticParams() {
  return materialStaticParams()
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const m = materialBySlug(slug)
  if (!m) return {}
  return {
    title: `${m.name} in Sandlab — how it moves and what it reacts with`,
    description: COPY[slug].summary,
    alternates: { canonical: `/materials/${slug}` },
  }
}

const MOVES: Record<string, string> = {
  static: 'Solid — stays where you paint it',
  powder: 'Powder — falls and piles up',
  liquid: 'Liquid — flows and levels out',
  gas: 'Gas — rises and drifts',
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const m = materialBySlug(slug)
  if (!m) notFound()
  const copy = COPY[slug]
  const { causes, undergoes } = reactionsOf(slug)
  const row = (r: { partner: string; chance: number; text: string }) => (
    <li key={r.partner + r.text} style={{ marginBottom: 6 }}>
      {r.text}{' '}
      <span style={{ opacity: 0.6, fontSize: 14 }}>
        ({chanceLabel(r.chance)}, {Math.round(r.chance * 100)}% per tick)
      </span>{' '}
      <Link href={`/materials/${r.partner}`} style={{ color: '#eef1f6', opacity: 0.7, fontSize: 14 }}>
        →
      </Link>
    </li>
  )
  return (
    <ContentShell>
      <p style={{ margin: '0 0 8px', fontSize: 14 }}>
        <Link href="/materials" style={{ color: '#eef1f6', opacity: 0.6 }}>← All materials</Link>
      </p>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-hidden style={{ width: 22, height: 22, borderRadius: 5, background: m.color }} />
        {m.name}
      </h1>
      <p style={{ fontSize: 18, opacity: 0.9 }}>{copy.summary}</p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px', fontSize: 14, opacity: 0.8 }}>
        <dt>Movement</dt>
        <dd style={{ margin: 0 }}>{MOVES[m.movement]}</dd>
        <dt>Weight</dt>
        <dd style={{ margin: 0 }}>{m.density} / 9 (heavier sinks through lighter)</dd>
        <dt>Lifetime</dt>
        <dd style={{ margin: 0 }}>{m.lifetime === null ? 'Permanent' : `Fades after about ${Math.round(m.lifetime / 60 * 10) / 10} s`}</dd>
        <dt>Glow</dt>
        <dd style={{ margin: 0 }}>{m.emissive === 0 ? 'None' : m.emissive >= 2 ? 'Bright' : 'Faint'}</dd>
      </dl>
      {copy.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <h2 style={{ fontSize: 20, marginTop: 28 }}>What {m.name.toLowerCase()} does to other materials</h2>
      {causes.length + undergoes.length === 0 ? (
        <p style={{ opacity: 0.8 }}>{m.name} has no reactions. It only moves.</p>
      ) : (
        <>
          {undergoes.length > 0 && <ul style={{ paddingLeft: 20 }}>{undergoes.map(row)}</ul>}
          {causes.length > 0 && (
            <>
              <h2 style={{ fontSize: 20, marginTop: 28 }}>What other materials do to {m.name.toLowerCase()}</h2>
              <ul style={{ paddingLeft: 20 }}>{causes.map(row)}</ul>
            </>
          )}
        </>
      )}
      <h2 style={{ fontSize: 20, marginTop: 28 }}>Tip</h2>
      <p>{copy.tip}</p>
      <p style={{ marginTop: 28 }}>
        <Link href="/" style={{ color: '#07090D', background: '#eef1f6', padding: '10px 16px', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>
          Try {m.name.toLowerCase()} in the sandbox
        </Link>
      </p>
    </ContentShell>
  )
}
```

- [ ] **Step 7: 빌드 + 검증 스크립트**

`scripts/verify-ads.mjs`의 `ALLOW`는 이미 `materials` 경로를 포함한다. 아직 `about`/`privacy`가 없으므로 그 둘은 "허용 페이지인데 없음"이 아니라 그냥 스캔 대상이 아니다(파일이 없으면 검사 안 됨).

Run: `pnpm build && node scripts/verify-ads.mjs`
Expected: `OK — 허용 페이지 19개, ...` (materials.html 1 + materials/*.html 18). 본문 600자 미만 실패가 나오면 해당 재료 설명문을 보강한다.
Run: `ls out/materials | wc -l` → 18, `ls out/materials/empty.html` → 없음.

- [ ] **Step 8: 커밋**

```bash
git add src/components/ContentShell.tsx src/app/materials src/lib/guide/reactions.ts src/lib/site.ts
git commit -m "feat(guide): /materials 재료 가이드 19쪽 + ContentShell(광고 허용 셸)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: /about, /privacy, sitemap, 내부 링크

**Files:**
- Create: `src/app/about/page.tsx`, `src/app/privacy/page.tsx`, `src/app/sitemap.test.ts`
- Modify: `src/app/sitemap.ts`, `src/components/GalleryBrowser.tsx` (헤더 탭 줄)

**Interfaces:**
- Consumes: `ContentShell`, `CONTACT_EMAIL`, `materialStaticParams`, `SITE`

- [ ] **Step 1: sitemap 테스트 작성**

`src/app/sitemap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import sitemap from './sitemap'
import { SITE } from '@/lib/site'

describe('sitemap', () => {
  const urls = sitemap().map((e) => e.url)
  it('콘텐츠 페이지를 모두 담는다', () => {
    for (const p of ['', '/gallery', '/materials', '/materials/lava', '/materials/water', '/about', '/privacy']) {
      expect(urls).toContain(`${SITE}${p}`)
    }
  })
  it('empty 재료 페이지와 중복 URL이 없다', () => {
    expect(urls).not.toContain(`${SITE}/materials/empty`)
    expect(new Set(urls).size).toBe(urls.length)
  })
})
```

Run: `pnpm vitest run src/app/sitemap.test.ts` → FAIL (`/materials` 없음).

- [ ] **Step 2: sitemap 구현**

`src/app/sitemap.ts` 의 `sitemap()` 본문을 교체:

```ts
import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'
import { materialStaticParams } from '@/lib/guide/reactions'

// 정적 export에 필요 — 빌드 때 sitemap.xml 파일로 굽는다.
export const dynamic = 'force-static'

// 정적 export 시 빌드 때 sitemap.xml로 생성된다. 씬 페이지(/s/:id)는 무한·동적이라 넣지 않는다
// (색인할 UGC가 쌓이면 그때 동적 사이트맵을 연다 — references/discovery 참조).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/gallery`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/materials`, changeFrequency: 'monthly', priority: 0.7 },
    ...materialStaticParams().map(({ slug }) => ({
      url: `${SITE}/materials/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${SITE}/about`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
```

Run: `pnpm vitest run src/app/sitemap.test.ts` → PASS.

- [ ] **Step 3: /about 작성**

`src/app/about/page.tsx`:

```tsx
import Link from 'next/link'
import ContentShell from '@/components/ContentShell'
import { CONTACT_EMAIL } from '@/lib/site'

export const metadata = {
  title: 'About Sandlab',
  description: 'What Sandlab is, how the falling-sand simulation works, and how to get in touch.',
  alternates: { canonical: '/about' },
}

export default function Page() {
  return (
    <ContentShell>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>About Sandlab</h1>
      <p>
        Sandlab is a falling-sand sandbox that runs in your browser. You paint with materials like sand,
        water, lava and acid, and a physics simulation decides what they do: sand piles into dunes, water
        finds its level, lava sets oil on fire and acid eats through metal. There is nothing to install and
        no account to make. Any scene can be shared as a link, published to the gallery, or recorded as a
        ten-second clip.
      </p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>How the simulation works</h2>
      <p>
        The canvas is a grid of 1200 by 600 cells, about 720,000 in total, and the whole grid is updated
        on your graphics card through WebGPU around sixty times a second. Falling sand is hard to run in
        parallel because two grains can try to move into the same empty cell at the same moment. Sandlab
        avoids that with a Margolus neighbourhood: the grid is split into two-by-two blocks and each block
        is handled by exactly one thread, with the block grid shifting by one cell every tick so material
        can cross block borders. Nothing is ever duplicated or lost.
      </p>
      <p>
        Materials are defined as data rather than code. Each one has a colour, a weight, a way of moving,
        an optional lifetime and a short list of reactions. The{' '}
        <Link href="/materials" style={{ color: '#eef1f6' }}>materials guide</Link> lists every one of them
        and exactly what happens when two touch.
      </p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>The gallery</h2>
      <p>
        The <Link href="/gallery" style={{ color: '#eef1f6' }}>gallery</Link> collects scenes people have
        published. You can vote for the ones you like and remix any scene into your own. There are no
        comments on purpose: the gallery is for showing work, not arguing about it.
      </p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>Requirements</h2>
      <p>
        Sandlab needs a browser with WebGPU: recent Chrome or Edge on desktop and Android, and Safari 26 or
        later on Apple devices. If your browser does not support it, Sandlab shows a gallery of scenes
        instead of the live canvas.
      </p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>Contact</h2>
      <p>
        Questions, bug reports and takedown requests: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#eef1f6' }}>{CONTACT_EMAIL}</a>.
      </p>
    </ContentShell>
  )
}
```

- [ ] **Step 4: /privacy 작성**

`src/app/privacy/page.tsx` (사실 근거: `schema.sql` — IP는 SHA-256 앞 12바이트만 저장, `worker/index.ts:53` — 계측은 event·referrer host·country·scene id만, `src/lib/sand/creator.ts`/`gallery.ts` — localStorage에 크리에이터 id·이름·내 작품 목록):

```tsx
import ContentShell from '@/components/ContentShell'
import { CONTACT_EMAIL } from '@/lib/site'

export const metadata = {
  title: 'Privacy — Sandlab',
  description: 'What Sandlab stores, what it does not, and how advertising cookies work on this site.',
  alternates: { canonical: '/privacy' },
}

const h2 = { fontSize: 20, marginTop: 28 } as const

export default function Page() {
  return (
    <ContentShell>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Privacy</h1>
      <p style={{ opacity: 0.7, fontSize: 14 }}>Last updated: 9 October 2026</p>
      <p>
        Sandlab has no accounts and no sign-up. This page lists everything the site stores and why. If
        something here is unclear, email <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#eef1f6' }}>{CONTACT_EMAIL}</a>.
      </p>
      <h2 style={h2}>Scenes you publish</h2>
      <p>
        When you press Publish, the scene data, the title you typed, a thumbnail image and, if you chose
        one, your display name are stored on our server so the gallery can show them. Published scenes are
        public. To have a scene removed, email us with its link.
      </p>
      <h2 style={h2}>Votes and rate limits</h2>
      <p>
        To stop one person from voting many times or flooding the gallery, we store a shortened one-way
        hash of your IP address (the first 12 bytes of a SHA-256 digest) alongside votes and uploads. We do
        not store your IP address itself, and the hash cannot be turned back into it.
      </p>
      <h2 style={h2}>Usage statistics</h2>
      <p>
        We count a few events, such as a shared link being opened, a scene being published or a vote being
        cast. Each count records only the event type, the website that linked to us and your country as
        reported by our hosting provider, Cloudflare. There is no per-person identifier, so these numbers
        cannot be linked back to you.
      </p>
      <h2 style={h2}>Stored in your browser</h2>
      <p>
        Your browser keeps a few things locally so the site remembers you without an account: your display
        name and a random creator id if you set a name, the list of scenes you published, and which scenes
        you have voted for. This never leaves your device except when you publish or vote. Clearing your
        browser data removes it.
      </p>
      <h2 style={h2}>Advertising</h2>
      <p>
        Some text pages on this site, such as the materials guide, may show ads served by Google AdSense.
        Google and its partners use cookies to serve ads based on your visits to this and other websites.
        You can turn off personalised advertising in{' '}
        <a href="https://adssettings.google.com" style={{ color: '#eef1f6' }}>Google Ads Settings</a>, and
        read how Google uses data at{' '}
        <a href="https://policies.google.com/technologies/partner-sites" style={{ color: '#eef1f6' }}>
          policies.google.com/technologies/partner-sites
        </a>
        . The sandbox canvas and the gallery never show ads.
      </p>
      <h2 style={h2}>Hosting</h2>
      <p>
        Sandlab is hosted on Cloudflare. Like any web host, Cloudflare processes your IP address to deliver
        pages and protect the site from abuse, under its own privacy policy.
      </p>
    </ContentShell>
  )
}
```

- [ ] **Step 5: 갤러리 헤더에 가이드 링크**

`src/components/GalleryBrowser.tsx` 헤더의 `← Sandlab` 링크 바로 뒤(정렬 탭 `<div>` 앞)에 추가 — 갤러리는 정적 HTML의 헤더가 SSR되므로 크롤러가 가이드로 가는 내부 링크를 본다:

```tsx
<a href="/materials" style={{ color: '#eef1f6', textDecoration: 'none', fontSize: 14, opacity: 0.6 }}>
  Materials guide
</a>
```

(파일 안에서 `← Sandlab` 문자열을 찾아 그 `<a>` 요소 닫는 태그 다음 줄에 넣는다.)

- [ ] **Step 6: 전체 검증**

Run: `pnpm test && pnpm typecheck && pnpm build && node scripts/verify-ads.mjs && node scripts/verify-margolus.mjs`
Expected: 테스트 전부 PASS, tsc 무에러, `OK — 허용 페이지 21개`, Margolus 7/7.
Run: `grep -c '<loc>' out/sitemap.xml` → 24 (`/`, `/gallery`, `/materials`, 재료 18, `/about`, `/privacy`).
Run: `grep -L adsbygoogle out/index.html out/gallery.html out/404.html` → 세 파일 모두 출력(=로더 없음).

- [ ] **Step 7: 커밋**

```bash
git add src/app/about src/app/privacy src/app/sitemap.ts src/app/sitemap.test.ts src/components/GalleryBrowser.tsx
git commit -m "feat(content): /about·/privacy + sitemap 확장 + 갤러리→가이드 내부 링크

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 로컬 육안 확인 → 배포 → 재심사 (needsUser 포함)

**Files:** 없음(검증·운영)

- [ ] **Step 1: 로컬 전체 앱 실행**

Run: `pnpm build && npx wrangler dev --port 8799 --local` (백그라운드)
claude-in-chrome로 `http://localhost:8799/materials`, `/materials/lava`, `/about`, `/privacy`, `/`, `/gallery`를 연다. 확인: 페이지가 스크롤되는지(루트 body `overscrollBehavior: none`과 충돌 없음), 375px 폭에서 가로 스크롤 없음, 반응 표가 넘치지 않음(넘치면 표 래퍼에 `overflowX: 'auto'`), 메인 캔버스·갤러리 동작이 이전과 같음.

- [ ] **Step 2: 사용자 확인 후 배포**

배포는 외부 공개 작업이다 — 사용자에게 확인받은 뒤 `pnpm run deploy`.
배포 후: `curl -s https://sandlab.app/materials/lava | grep -c adsbygoogle` → 1, `curl -s https://sandlab.app/ | grep -c adsbygoogle` → 0.

- [ ] **Step 3: 사용자에게 넘길 일 (needsUser)**

1. Cloudflare 대시보드 → sandlab.app → Email → Email Routing에서 `hello@sandlab.app`을 운영자 메일함으로 전달 설정(무료). 설정 전엔 /about·/privacy의 문의 메일이 반송된다.
2. AdSense 콘솔 → 사이트 → sandlab.app → "검토 요청". 결과까지 수 주, 통과 보장 없음.
3. Google Search Console에 `https://sandlab.app/sitemap.xml` 제출(색인 가속).
