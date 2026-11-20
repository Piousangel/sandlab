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
    // 단건 조회 API가 creatorName을 싣는다(P9). 이름 없이 올린 작품은 null — 그때 '익명'이라고 단정하지 않는다
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

/**
 * P11 선택 관 붓기(S7): 12프레임 가로 스트립이 있는 재료(고체 6종은 없음 — scripts/capture-posters.mjs --strips).
 * 파일 목록과 같아야 한다(home.test가 public/ui-next/posters/strips/와 대조).
 */
export const STRIP_SLUGS: ReadonlySet<string> = new Set(['acid', 'ash', 'fire', 'gunpowder', 'lava', 'oil', 'salt', 'sand', 'seed', 'smoke', 'steam', 'water'])
export const STRIP_FRAMES = 12
/** 한 번 붓는 길이. 900ms(보상 최대 토큰) 안, 12프레임 ≈ 15fps — 엔진 캔버스 옆 주변 시야에서 짧게. */
export const STRIP_MS = 720
/** 누른 뒤 이 안에 스트립이 도착(디코드까지)하면 재생, 늦으면 건너뛴다(뒤늦게 혼자 움직이는 관 없음). */
export const STRIP_WAIT_MS = 300
/** 첫 획 뒤 유휴 시간에 미리 받는 관 수(지금 탭 앞쪽 = 390폭 첫 화면에 보이는 관 수). */
export const STRIP_WARM = 6

/**
 * 붓기 재생 여부. hardwareConcurrency로 저사양을 거르지 않는다 — WebKit은 코어 8개 미만이면 늘 4를 돌려줘
 * 모든 iPhone이 '저사양'이 되고 옥타코어 저가 안드로이드는 통과한다(P11 반증 리서치, NavigatorBase.cpp).
 */
export function shouldPour(o: { slug: string; already: boolean; reducedMotion: boolean; saveData: boolean }): boolean {
  return STRIP_SLUGS.has(o.slug) && !o.already && !o.reducedMotion && !o.saveData
}

/** 유휴 시간에 미리 받을 스트립: 지금 보이는 순서 앞쪽에서 스트립 있는 것만 n개. Save-Data면 0. */
export function warmList(shown: readonly string[], saveData: boolean, n = STRIP_WARM): string[] {
  if (saveData) return []
  return shown.slice(0, n).filter((s) => STRIP_SLUGS.has(s))
}

/**
 * 툴바 로빙(WAI-ARIA toolbar): 좌우 화살표·Home·End로 포커스만 옮긴다(선택은 Enter/Space = 버튼 클릭).
 * radiogroup이 아닌 이유: 화살표가 곧 선택이라 18관을 지나며 재료가 계속 바뀌고, Erase 때 '선택 없음'을 못 나타낸다.
 */
export function rovingNext(key: string, i: number, n: number): number {
  if (n <= 0) return -1
  if (key === 'ArrowRight') return (i + 1) % n
  if (key === 'ArrowLeft') return (i - 1 + n) % n
  if (key === 'Home') return 0
  if (key === 'End') return n - 1
  return -1
}

/** Tab 정지점이 될 관: 마지막으로 포커스한 관 → 선택된 관 → 맨 앞(지금 탭에 보이는 것 중에서). */
export function rovingStop(shown: readonly string[], focused: string | null, sel: string): string | null {
  if (focused && shown.includes(focused)) return focused
  if (shown.includes(sel)) return sel
  return shown[0] ?? null
}
