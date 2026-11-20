/**
 * 새 홈 「Pour」(리디자인 P6)의 순수 규칙 — 화면 컴포넌트(HomePour.tsx)는 이 값을 그리기만 한다. 테스트 home.test.tsx.
 */
import type { Material } from '@/lib/sand/materials'
import type { Stratum } from '@/lib/strata'

/* ---------- 시험관 랙(S7) ---------- */

export type RackTab = 'all' | 'powder' | 'liquid' | 'solid' | 'gas'
export const RACK_TABS: readonly { id: RackTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'powder', label: 'Powder' },
  { id: 'liquid', label: 'Liquid' },
  { id: 'solid', label: 'Solid' },
  { id: 'gas', label: 'Gas' },
]

/** 엔진 movement → 랙 탭. static은 사람 말로 Solid. */
export function tabOf(m: Pick<Material, 'movement'>): Exclude<RackTab, 'all'> {
  return m.movement === 'static' ? 'solid' : m.movement
}

/** 랙 순서: 처음 붓기 좋은 것부터(가루 → 액체 → 고체 → 기체), 같은 탭 안은 materials.ts 순서. sand가 맨 앞(기본 선택). */
const TAB_ORDER: Record<Exclude<RackTab, 'all'>, number> = { powder: 0, liquid: 1, solid: 2, gas: 3 }
export function rackOrder<T extends Pick<Material, 'movement' | 'slug'>>(mats: readonly T[]): T[] {
  return mats
    .filter((m) => m.slug !== 'empty')
    .map((m, i) => ({ m, i }))
    .sort((a, b) => TAB_ORDER[tabOf(a.m)] - TAB_ORDER[tabOf(b.m)] || a.i - b.i)
    .map((x) => x.m)
}

/** 옅은 재료(S1 보완): Bone 위에서 사라지는 색 — 관 안에 결 패턴을 깐다(이름 라벨은 모든 관에 항상). */
export const PALE: ReadonlySet<string> = new Set(['salt', 'steam', 'ice', 'metal'])

/* ---------- 붓 크기 점 3개 ---------- */

/** 점 3개 → 엔진 붓 반경(셀). 6이 옛 홈 기본값. */
export const BRUSH_SIZES = [
  { r: 3, label: 'Small brush' },
  { r: 6, label: 'Medium brush' },
  { r: 12, label: 'Large brush' },
] as const
export const DEFAULT_BRUSH = 6

/* ---------- 첫 방문 붓기 데모 ---------- */

export const DEMO_KEY = 'sl.pourdemo.v1'
export const DEMO_MS = 1500
export const NO_BRUSH = 0xffffffff

/**
 * 데모 붓의 시간표: 0~1.5초 동안 위쪽 가운데에서 모래를 한 줄기 붓는다(살짝 좌우로 흔들림).
 * 엔진의 기존 붓 API(brush.x/y/r/mat)를 사람 손 대신 세팅할 뿐 — 엔진 코드는 바꾸지 않는다.
 * 반환 null = 데모 끝(붓을 뗀다).
 */
export function demoBrush(elapsedMs: number, W: number, H: number): { x: number; y: number; r: number } | null {
  if (elapsedMs < 0 || elapsedMs >= DEMO_MS) return null
  const f = elapsedMs / DEMO_MS
  return { x: Math.round(W * (0.5 + 0.06 * Math.sin(f * Math.PI * 2))), y: Math.round(H * 0.06), r: 9 }
}

/** 데모를 돌릴까: 첫 방문(키 없음) + reduced-motion 아님 + 빈 캔버스(링크로 연 장면이 아님). */
export function shouldDemo(o: { seen: boolean; reducedMotion: boolean; restored: boolean }): boolean {
  return !o.seen && !o.reducedMotion && !o.restored
}

/* ---------- 진입 상태(B4 ④) ---------- */

export type Entry =
  | { kind: 'blank' }
  | { kind: 'opening' } // 해시에 장면 링크가 있고 아직 불러오는 중
  | { kind: 'scene'; id: string; title: string; creatorName: string | null; remixCount: number }
  | { kind: 'link' }

export const HEADLINE = 'Pour something. It reacts.'
export const HEADLINE_SUB = 'Pick a tube, then drag on the glass.'
export const NO_GPU_HEADLINE = 'Today’s puzzle works here.'

/** 헤드라인 두 줄(제목·부제). 높이는 항상 두 줄로 예약한다(CLS). */
export function entryHeadline(e: Entry): { title: string; sub: string } {
  if (e.kind === 'scene') {
    // 단건 조회 API는 아직 작성자 이름을 싣지 않는다(목록만) — 없을 때 '익명'이라고 단정하지 않는다
    const by = e.creatorName ? `by ${e.creatorName}` : 'From the gallery'
    const rx = e.remixCount === 1 ? '1 remix' : `${e.remixCount} remixes`
    return { title: e.title || 'Untitled', sub: `${by} · ${rx}` }
  }
  if (e.kind === 'opening') return { title: 'Opening a shared scene…', sub: 'One moment.' }
  if (e.kind === 'link') return { title: 'A scene someone shared', sub: 'Made in Sandlab, sent as a link.' }
  return { title: HEADLINE, sub: HEADLINE_SUB }
}

/* ---------- 지층 띠(P2 readStrata — 띠 + "N days"만) ---------- */

/** 첫 기록일부터 오늘까지의 층(빠진 날 포함). 기록이 하나도 없으면 빈 배열. */
export function strataBand(strata: readonly Stratum[]): Stratum[] {
  const first = strata.findIndex((s) => !s.missed)
  return first < 0 ? [] : strata.slice(first)
}

export function daysLabel(strata: readonly Stratum[]): string {
  const n = strata.filter((s) => !s.missed).length
  return n === 1 ? '1 day' : `${n} days`
}

/* ---------- 해시 진입 ---------- */

/**
 * 같은 페이지에서 해시만 바뀐 경우(홈의 갤러리 카드 /#s=… 클릭) 장면을 다시 읽어야 하나.
 * 엔진은 마운트 때 한 번만 해시를 읽는다(옛 홈과 같음) — 그래서 장면 링크로 바뀌었으면 새로고침한다.
 * 우리가 replaceState로 바꾼 해시(공유 링크 만들기)는 hashchange가 안 나므로 여기 오지 않는다.
 */
export function hashNeedsReload(prev: string, next: string, sceneId: (h: string) => string | null): boolean {
  if (prev === next) return false
  const a = sceneId(prev)
  const b = sceneId(next)
  if (b && b !== a) return true
  return /[#&]g=/.test(next) && next !== prev
}
