/**
 * 갤러리 The Wall(P9) 순수 규칙 — 문구·병합·라이브 재생 규칙. 화면(GalleryWall.tsx)은 이걸 그리기만 한다.
 */
import type { SceneMeta } from '@/lib/sand/gallery'

/**
 * 정렬 = 기존 API 그대로. hot/new = /api/scenes?sort=, top = /api/creators/top(작품 순위 API는 없다 — 표를 많이 받은 작성자).
 * mine(Yours, P9b) = 옛 갤러리와 같은 출처 — 이 브라우저 localStorage `sandlab.mine`(listMine)의 id를 단건 meta로 하나씩 조회.
 * 순서는 옛 탭 순서(Hot·Newest·Yours·Top Creators) 그대로.
 */
export type WallSort = 'hot' | 'new' | 'mine' | 'top'

export const SORTS: readonly { id: WallSort; label: string; hint: string }[] = [
  { id: 'hot', label: 'Hot', hint: 'Most votes from the last seven days.' },
  { id: 'new', label: 'New', hint: 'Every scene, newest first.' },
  { id: 'mine', label: 'Yours', hint: 'Scenes you published from this browser. Come back to see their votes climb.' },
  { id: 'top', label: 'Top', hint: 'Makers whose scenes earned the most votes.' },
]

/** 작성자 줄. 이름을 정하지 않고 올린 작품은 'Unsigned'(박물관 캡션 말투 — '익명'이라 단정하지 않는다). */
export function creditLine(creatorName: string | null | undefined): string {
  const n = creatorName?.trim()
  return n ? `by ${n}` : 'Unsigned'
}

export const remixLabel = (n: number | undefined) => (n === 1 ? '1 remix' : `${n ?? 0} remixes`)
export const voteLabel = (n: number) => (n === 1 ? '1 vote' : `${n} votes`)
export const sceneLabel = (n: number) => (n === 1 ? '1 scene' : `${n} scenes`)

/** 올린 지 얼마나(옛 갤러리 카드 ago()와 같은 구간·문구). now는 테스트용. */
export function ago(t: number, now = Date.now()): string {
  const s = (now - t) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/** Yours 합계 줄(옛 mineDigest와 같은 합산): 작품 수·받은 표·리믹스. */
export function mineTotals(scenes: readonly { votes?: number; remixCount?: number }[]) {
  return {
    scenes: scenes.length,
    votes: scenes.reduce((n, s) => n + (s.votes || 0), 0),
    remix: scenes.reduce((n, s) => n + (s.remixCount || 0), 0),
  }
}

/**
 * 지난 Yours 방문 뒤 늘어난 표·리믹스(gallery.ts mineDeltas 결과) → 한 줄. 늘어난 게 없으면 null(줄을 그리지 않는다).
 * 문구는 옛 배지와 같다("+2 votes, +1 remix since your last visit") — 앞의 화살표 글리프만 아이콘으로 바꿨다(R8).
 */
export function deltaLine(d: { votes: number; remix: number }): string | null {
  const parts = [
    d.votes > 0 ? `+${d.votes} vote${d.votes === 1 ? '' : 's'}` : null,
    d.remix > 0 ? `+${d.remix} remix${d.remix === 1 ? '' : 'es'}` : null,
  ].filter(Boolean)
  return parts.length ? `${parts.join(', ')} since your last visit` : null
}

/** Yours 단건 조회 실패가 '지워진 장면'인가 — 워커 404 본문은 {"error":"not found"}(gallery.ts req가 본문을 Error 메시지로). 그 밖(망·5xx)은 장애. */
export function isGone(reason: unknown): boolean {
  return reason instanceof Error && /not found|HTTP 404/.test(reason.message)
}

/** 작성자 화면에서 돌아가는 버튼 — 들어온 정렬로 돌아간다(Top이면 작성자 순위, 카드 작성자 링크로 왔으면 그 정렬, 리뷰 2). */
export function backLabel(sort: WallSort): string {
  if (sort === 'top') return 'Top makers'
  return `Back to ${SORTS.find((s) => s.id === sort)!.label}`
}

/** 작성자 집계 줄(옛 작성자 화면 머리와 같은 문구) — /api/creators/:id 서버 집계. */
export function makerStats(p: { sceneCount: number; totalVotes: number; remixCount: number }): string {
  return `${sceneLabel(p.sceneCount)} · ${voteLabel(p.totalVotes)} · ${p.remixCount} remix${p.remixCount === 1 ? '' : 'es'}`
}

/** "More"로 받은 다음 쪽을 붙인다 — 그 사이 새 업로드로 offset이 밀려 같은 id가 다시 오면 버린다(같은 key 두 번 = React 경고·중복 액자). */
export function appendPage(prev: SceneMeta[], next: SceneMeta[]): SceneMeta[] {
  const seen = new Set(prev.map((s) => s.id))
  return prev.concat(next.filter((s) => !seen.has(s.id)))
}

export const hasMore = (shown: number, total: number) => shown < total

/** 빈 상태 문구(목록이 0개일 때). 행동은 하나만: hot은 New로, new·작성자는 홈에서 붓기. */
export function emptyState(sort: WallSort, creator: boolean): { text: string; action: 'new' | 'pour' } {
  if (creator) return { text: 'Nothing from this maker yet.', action: 'pour' }
  if (sort === 'mine') return { text: 'Nothing of yours yet. Publish a scene and it shows up here.', action: 'pour' }
  if (sort === 'hot') return { text: 'Nothing new on the wall this week.', action: 'new' }
  if (sort === 'top') return { text: 'No named makers yet. Add a name when you publish and you will show up here.', action: 'pour' }
  return { text: 'The wall is empty. Pour the first scene.', action: 'pour' }
}

/**
 * 라이브 재생 상태. key = 구역 + id(`pick:<id>`·`all:<id>`) — 큐레이션 장면은 아래 목록에도 같은 id로 나오므로
 * id만으로 고르면 두 액자가 동시에 재생된다(독립 리뷰 차단 1). via = 무엇으로 시작했나(hover는 마우스가 떠나면 멈춤, button은 고정).
 */
export type Live = { key: string; via: 'button' | 'hover' }

export const liveKey = (section: 'pick' | 'all', id: string) => `${section}:${id}`

/**
 * 라이브 재생 규칙: 한 번에 하나(동시 라이브 캔버스 ≤ 1). 새 요청은 이전 것을 대체한다.
 * - 버튼: 같은 액자가 버튼으로 재생 중이면 멈춤. hover로 재생 중이면 멈추지 않고 '고정'(Play를 누르러 다가간 사람이 Stop을 누르게 되는 문제 — 리뷰 3).
 * - hover(마우스): reduced-motion이면 자동 재생하지 않는다. 버튼으로 고정된 다른 액자가 있으면 빼앗지 않는다.
 */
export function nextLive(cur: Live | null, key: string, via: 'button' | 'hover', reducedMotion: boolean): Live | null {
  if (via === 'hover') {
    if (reducedMotion) return cur
    if (cur?.via === 'button') return cur
    return { key, via: 'hover' }
  }
  if (cur?.key === key && cur.via === 'button') return null
  return { key, via: 'button' }
}

/** 멈춤 요청. reason 'leave'(마우스가 떠남)는 hover 재생만 멈춘다 — 버튼으로 고정한 재생은 계속. 'end'(화면 밖·실패)는 무조건. */
export function endLive(cur: Live | null, key: string, reason: 'leave' | 'end'): Live | null {
  if (!cur || cur.key !== key) return cur
  if (reason === 'leave' && cur.via === 'button') return cur
  return null
}

/** 실엔진 재생 가능한 장면인가 — 격자 1200×600만(옛 960×540 업로드는 Play를 그리지 않는다, 리뷰 2). */
export const canPlay = (w: number, h: number) => w === 1200 && h === 600

/** 홈 진입 링크(P6 흐름 — `#s=<id>`, 형식 변경 금지). */
export const openHref = (id: string) => `/#s=${id}`
