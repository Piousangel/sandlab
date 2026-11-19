/**
 * Spill 데일리 — UTC 날짜 → 번호 → 레벨. 순수 함수라 전 세계가 같은 날 같은 퍼즐을 받는다.
 * 번호 체계는 옛 데일리와 같다(#1 = 2026-10-09). 풀은 고정 id 목록이라 레벨을 추가해도 오늘 퍼즐이 바뀌지 않는다.
 */
import { STAR_CLEAR, STAR_GEMS, STAR_PAR, formatMoves, formatSecs, starCount } from '../play/score'

export const LAUNCH_UTC = Date.UTC(2026, 9, 9)
const DAY_MS = 86_400_000

/** 1-1은 튜토리얼이라 제외. 목록을 바꾸면 이후 날짜의 퍼즐이 바뀌니 추가는 허용, 순서 변경은 금지. */
export const DAILY_POOL_IDS = ['1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9', '1-10'] as const

export function dayNumber(nowMs: number): number {
  return Math.max(1, Math.floor((nowMs - LAUNCH_UTC) / DAY_MS) + 1)
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** 연속한 두 날이 같은 레벨이 되지 않고(보폭 ≥2) 풀 전체를 한 바퀴 도는(서로소) 보폭. */
function stepFor(len: number): number {
  for (let s = 2; s < len; s++) if (gcd(s, len) === 1) return s
  return 1
}

export function dailyIdFor(n: number): string {
  const len = DAILY_POOL_IDS.length
  return DAILY_POOL_IDS[((Math.max(1, n) - 1) * stepFor(len)) % len]
}

/**
 * 공유 텍스트 v2(리디자인 P2) — 레벨 id를 빼고(풀이 9개라 id를 보면 9일 주기가 드러난다) 이모지 대신 유리알 문자.
 * 유리알 규칙(DECISIONS 2026-11-19 P2): 알 3개, 별 수만큼 앞에서부터 ●(U+25CF), 나머지 ○(U+25CB). 칸 위치에 뜻은 없다
 * (mask 유무로 뜻이 달라지지 않게 — 독립 리뷰). 별 수 = mask가 있으면 mask의 비트 수, 없으면 stars(둘은 starMask에서 같이 나와 늘 같다).
 * 시간은 ticks가 있을 때만. ●○는 기하 도형 블록이라 이모지로 바뀌지 않는다.
 * P5부터 /daily 공유(prod 결과 카드·본문 버튼, 새 결과 화면)가 전부 이것을 쓴다 — 옛 shareText(레벨 id·⭐)는 지웠다.
 */
export function shareTextV2(rec: DailyRec, n: number): string {
  const s = rec.mask !== undefined && validMask(rec.mask) ? starCount(rec.mask) : clampStars(rec.stars)
  const time = rec.ticks !== undefined && validTicks(rec.ticks) ? ` · ${formatSecs(rec.ticks)}` : ''
  return `Sandlab Daily #${n} ${beadText(s)} ${formatMoves(rec.moves)}${time}\nhttps://sandlab.app/daily`
}

/** 유리알 3개 문자열 — 별 수만큼 앞에서부터 ●, 나머지 ○(0~3으로 자른다). 공유 텍스트 공용. */
export function beadText(stars: number): string {
  const s = clampStars(stars)
  return '●'.repeat(s) + '○'.repeat(3 - s)
}

export const DAILY_KEY = 'sandlab.spill-daily.v1'
/** DailyRec.mask 비트 — score.ts 별 비트와 같은 값(starMask 결과를 그대로 저장). */
export const DAILY_MASK_CLEAR = STAR_CLEAR
export const DAILY_MASK_GEM = STAR_GEMS
export const DAILY_MASK_PAR = STAR_PAR

/**
 * 그날 첫 클리어 기록. ticks·mask는 리디자인 P2(S4)에서 더한 선택 필드 — 그 전에 저장된 기록엔 없고, 읽을 때도 없으면 생략한다.
 * 재도전(연습) 결과는 저장하지 않는다.
 */
export type DailyRec = { stars: number; moves: number; ticks?: number; mask?: number }

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const validTicks = (v: unknown): v is number => finite(v) && v >= 0
const validMask = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 7
const clampStars = (s: number) => (finite(s) ? Math.max(0, Math.min(3, Math.round(s))) : 0)

/** 저장소에서 꺼낸 한 날의 값 → 유효하면 정규화한 DailyRec(모르는 필드·잘못된 선택 필드는 버림), 아니면 null. */
export function parseDailyRec(v: unknown): DailyRec | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  if (!finite(o.stars) || !finite(o.moves)) return null
  const r: DailyRec = { stars: o.stars, moves: o.moves }
  if (validTicks(o.ticks)) r.ticks = o.ticks
  if (validMask(o.mask)) r.mask = o.mask
  return r
}

/** 날짜별 기록 맵. 손상 JSON·객체가 아닌 값이면 null(호출자가 무시). */
export function readDailyMap(raw: string | null): Record<string, unknown> | null {
  try {
    const all: unknown = JSON.parse(raw || '{}')
    return all && typeof all === 'object' && !Array.isArray(all) ? (all as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function loadDaily(day: number): DailyRec | null {
  try {
    return parseDailyRec(readDailyMap(localStorage.getItem(DAILY_KEY))?.[day])
  } catch {
    return null
  }
}

/**
 * 그날 첫 클리어만 기록한다(공식 기록). 이미 유효한 기록이 있으면 덮지 않는다.
 * 저장소 값이 통째로 손상됐으면 원본을 지우지 않고 넘어간다(예전과 같음). 그날 항목만 깨졌으면 새 기록이 채운다.
 */
export function saveDaily(day: number, r: DailyRec): void {
  try {
    const all = readDailyMap(localStorage.getItem(DAILY_KEY))
    if (!all || parseDailyRec(all[day])) return
    const rec = parseDailyRec(r)
    if (!rec) return
    all[day] = rec
    localStorage.setItem(DAILY_KEY, JSON.stringify(all))
  } catch {
    /* 저장 실패해도 결과 표시는 된다 */
  }
}
