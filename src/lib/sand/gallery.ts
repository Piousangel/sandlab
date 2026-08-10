/**
 * 갤러리 — 이 제품의 관객 층. Worker/클라이언트 공용 타입과 규칙.
 *
 * 왜 갤러리가 최우선인가 (1차 자료 근거):
 *   - Sandspiel 제작자 Max Bittker 본인 글: 커뮤니티를 우연히 얻은 게 아니라
 *     Powder Game(dan-ball.jp)의 구조를 의도적으로 복제했다.
 *     "관객이라는 차원이 더해지면 모래 갖고 노는 것에 엄청난 깊이가 생긴다."
 *     업로드 7만 건. 그리고 그가 명시적으로 뺀 것: **댓글**(독성 차단).
 *   - Powder Toy(20년 생존)의 Front Page: 초기 몇 표가 전부, 랭킹은 1주일 이내 저장물만.
 *     "폭탄이랑 광자 레이저는 너무 많이 만들어져서 새 거는 FP 갈 확률이 낮다" — 기시감 = 죽음.
 *
 *   → 진짜 위험은 배급 실패가 아니라 배급 성공이다. 갤러리 없이 1만 명이 들어오면
 *     3초 보고 닫고, 아무것도 안 남고, 총알만 잃는다.
 *
 * 부수 효과: URL 공유는 복잡한 장면에서 예산(6000자)을 넘겨 실패한다(측정됨).
 *   갤러리에 올리면 짧은 id 하나로 대체되므로, **모든 장면이 공유 가능해진다.**
 */

/** 랭킹 창 — Powder Toy FP 복제. 신선도가 재방문 이유다. */
export const HOT_WINDOW_DAYS = 7
export const PAGE_SIZE = 24

/** 장면 데이터 상한. deflate된 RLE 기준 최악(600획 난사)이 ~86KB였다. */
export const MAX_SCENE_BYTES = 200_000
/** 640×320 다운샘플 PNG(base64)는 복잡한 씬도 여유. 넉넉히 잡아 upload가 'bad thumb'로 안 깨지게. */
export const MAX_THUMB_BYTES = 300_000

/** worker OG 메타가 썸네일 치수에서 파생되도록 재노출한다 — 손으로 맞추면 언젠가 desync되어
 *  씬 공유 카드가 조용히 깨진다. 한 소스(thumb.ts)에서만 온다. */
export { THUMB_W, THUMB_H } from './thumb'
export const MAX_TITLE = 60
export const MAX_CREATOR_NAME = 24

export interface SceneMeta {
  id: string
  title: string
  votes: number
  createdAt: number
  w: number
  h: number
  /** 리믹스 계보: 이 씬이 파생된 원본 id (원작은 null/미포함). 단건 조회에서만 채워진다. */
  parent?: string | null
  /** 이 씬에서 파생된 리믹스 수. 단건 조회에서만 채워진다. */
  remixCount?: number
  /** 크리에이터 정체성 — 닉네임을 지정한 크리에이터만 있음(완전 익명 업로드는 둘 다 미포함). */
  creatorId?: string | null
  creatorName?: string | null
}

export interface SceneFull extends SceneMeta {
  /** base64url — urlState의 인코딩과 동일 포맷 */
  data: string
}

export type SortMode = 'hot' | 'new'

/**
 * 제목 정리 — Worker와 클라이언트가 같은 규칙을 써야 한다.
 * 제어문자 제거 + 내부 공백 압축 + 길이 제한.
 * (이전 구현은 소스에 리터럴 NUL 바이트가 박혀 있었고 내부 공백을 안 줄였다.)
 */
export function cleanTitle(raw: unknown): string {
  const s = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // 제어문자
    .replace(/\s+/g, ' ') // 내부 공백 압축
    .trim()
  // .slice()는 UTF-16 코드유닛 단위라 서로게이트 쌍(이모지 등)을 반으로 잘라 깨진 문자를 만들 수 있다.
  // Array.from은 코드포인트 단위로 순회해 쌍을 안 쪼갠다.
  const truncated = Array.from(s).slice(0, MAX_TITLE).join('')
  return truncated || 'Untitled'
}

export function isValidId(s: unknown): s is string {
  return typeof s === 'string' && /^[A-Za-z0-9_-]{6,16}$/.test(s)
}

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

export function isValidCreatorId(s: unknown): s is string {
  return typeof s === 'string' && /^[A-Za-z0-9_-]{6,24}$/.test(s)
}

// ── 클라이언트 API ───────────────────────────────────────────────

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init)
  if (!r.ok) throw new Error((await r.text().catch(() => '')) || `HTTP ${r.status}`)
  return r.json() as Promise<T>
}

export function listScenes(sort: SortMode, offset = 0, creatorId?: string) {
  const q = new URLSearchParams({ sort, offset: String(offset) })
  if (creatorId) q.set('creator', creatorId)
  return req<{ scenes: SceneMeta[]; total: number }>(`/api/scenes?${q.toString()}`)
}

export function getScene(id: string) {
  return req<SceneFull>(`/api/scenes/${encodeURIComponent(id)}`)
}

/** 메타만(씬 blob 제외) — 카드 표시에 data가 필요 없을 때. Yours 탭이 이걸 쓴다. */
export function getSceneMeta(id: string) {
  return req<SceneMeta>(`/api/scenes/${encodeURIComponent(id)}?meta=1`)
}

export function uploadScene(body: {
  title: string
  data: string
  thumb: string
  w: number
  h: number
  /** 리믹스일 때 원본 씬 id. 원작이면 생략. */
  parent?: string | null
  /** 닉네임을 지정한 적 있는 크리에이터만 보낸다(creator.ts). 없으면 완전 익명 업로드. */
  creator?: string
  creatorName?: string
}) {
  return req<{ id: string }>('/api/scenes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** 투표는 브라우저당 1회. localStorage는 약한 방어지만, 로그인 없는 v1엔 이게 맞다. */
const VOTED_KEY = 'sandlab.voted'

export function hasVoted(id: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(VOTED_KEY) || '[]') as string[]).includes(id)
  } catch {
    return false
  }
}

function markVoted(id: string) {
  try {
    const v = JSON.parse(localStorage.getItem(VOTED_KEY) || '[]') as string[]
    if (!v.includes(id)) localStorage.setItem(VOTED_KEY, JSON.stringify([...v, id].slice(-500)))
  } catch {
    /* 사파리 프라이빗 모드 등 — 투표는 되게 두고 중복만 못 막는다 */
  }
}

function unmarkVoted(id: string) {
  try {
    const v = JSON.parse(localStorage.getItem(VOTED_KEY) || '[]') as string[]
    localStorage.setItem(VOTED_KEY, JSON.stringify(v.filter((x) => x !== id)))
  } catch {
    /* markVoted가 애초에 못 썼을 상황과 동일 — 무해 */
  }
}

export async function voteScene(id: string): Promise<number> {
  if (hasVoted(id)) throw new Error('already voted')
  // 요청 전에 먼저 마킹한다(낙관적) — 그래야 더블탭/더블클릭으로 요청 두 개가 동시에 뜨면
  // 두 번째 호출이 hasVoted()에서 걸린다. 실패하면 되돌려 재시도할 수 있게 한다.
  markVoted(id)
  try {
    const r = await req<{ votes: number }>(`/api/scenes/${encodeURIComponent(id)}/vote`, {
      method: 'POST',
    })
    return r.votes
  } catch (e) {
    unmarkVoted(id)
    throw e
  }
}

/**
 * 내가 올린 씬 — 로그인 없는 재방문 엔진.
 * 이 장르의 유일한 재방문 이유는 "내 게 표 받았나?"(Powder Toy/Sandspiel 1차 자료).
 * 계정이 없으므로 브라우저 localStorage에 내가 만든 id를 남겨 갤러리 'Yours'에서 표를 확인한다.
 */
const MINE_KEY = 'sandlab.mine'
export interface MineEntry {
  id: string
  title: string
  at: number
  // 마지막으로 Yours에서 본 표·리믹스 수(기준선). 다음 방문에 그 이후 증가분을 델타로 보여준다.
  seenVotes?: number
  seenRemix?: number
}

export function rememberMine(id: string, title: string) {
  try {
    const m = JSON.parse(localStorage.getItem(MINE_KEY) || '[]') as MineEntry[]
    // 새 씬은 0 기준선 — 첫 Yours 재방문에 "게시 후 받은 표·리믹스"가 통째로 델타로 뜬다.
    const next = [{ id, title, at: Date.now(), seenVotes: 0, seenRemix: 0 }, ...m.filter((e) => e.id !== id)].slice(0, 200)
    localStorage.setItem(MINE_KEY, JSON.stringify(next))
  } catch {
    /* 프라이빗 모드 등 — 저장 실패해도 게시 자체는 성공했으니 조용히 넘어간다 */
  }
}

/** 현재 표·리믹스 수를 새 기준선으로 저장 → 다음 방문의 델타가 '이번 방문 이후'가 된다. */
export function updateMineSeen(seen: { id: string; votes: number; remixCount: number }[]) {
  try {
    const m = JSON.parse(localStorage.getItem(MINE_KEY) || '[]') as MineEntry[]
    const byId = new Map(seen.map((s) => [s.id, s]))
    const next = m.map((e) => {
      const s = byId.get(e.id)
      return s ? { ...e, seenVotes: s.votes, seenRemix: s.remixCount } : e
    })
    localStorage.setItem(MINE_KEY, JSON.stringify(next))
  } catch {
    /* 저장 실패해도 델타만 못 볼 뿐, 표시엔 지장 없다 */
  }
}

/** 창작자 귀환 델타 — 지난 방문 기준선 대비 늘어난 표·리믹스 합계. 순수 함수(테스트 대상).
 *  기준선이 없는(구버전/미기록) 엔트리는 델타 0으로 둔다(허위 증가분 방지). 음수는 0으로 클램프. */
export function mineDeltas(
  current: { id: string; votes?: number; remixCount?: number }[],
  entries: MineEntry[],
): { votes: number; remix: number } {
  const seen = new Map(entries.map((e) => [e.id, e]))
  let votes = 0
  let remix = 0
  for (const s of current) {
    const e = seen.get(s.id)
    if (e && e.seenVotes !== undefined) votes += Math.max(0, (s.votes || 0) - e.seenVotes)
    if (e && e.seenRemix !== undefined) remix += Math.max(0, (s.remixCount || 0) - e.seenRemix)
  }
  return { votes, remix }
}

export function listMine(): MineEntry[] {
  try {
    const m = JSON.parse(localStorage.getItem(MINE_KEY) || '[]')
    // 원소 형태까지 검증한다 — 수동 조작/구버전으로 오염된 배열이 렌더를 죽이지 않게.
    return Array.isArray(m) ? m.filter((e) => e && isValidId(e.id)) : []
  } catch {
    return []
  }
}

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
