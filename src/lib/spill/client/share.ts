/**
 * Spill 공유 텍스트 v2(리디자인 P2 규칙, P5에서 교체 완료). daily.ts와 따로 둔 이유: daily.ts는 홈 화면 번들에도 들어가는 공용 모듈이라
 * 여기 함수(와 score.ts 포맷터)를 거기 두면 공유와 무관한 홈 청크까지 커진다 — /daily·결과 화면만 이 파일을 import한다.
 *
 * 유리알 규칙(DECISIONS 2026-11-19 P2): 알 3개, 별 수만큼 앞에서부터 ●(U+25CF), 나머지 ○(U+25CB). 칸 위치에 뜻은 없다
 * (mask 유무로 뜻이 달라지지 않게 — 독립 리뷰). 별 수 = mask가 있으면 mask의 비트 수, 없으면 stars. 시간은 ticks가 있을 때만.
 * ●○는 기하 도형 블록이라 이모지로 바뀌지 않는다.
 */
import { formatMoves, formatSecs, starCount } from '../play/score'
import type { DailyRec } from './daily'

// daily.ts의 같은 검사 — 거기서 export를 늘리면 홈 청크(daily.ts 포함)까지 바뀌어 여기 따로 둔다(parseDailyRec와 같은 규칙)
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const validTicks = (v: unknown): v is number => finite(v) && v >= 0
const validMask = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 7
const clampStars = (s: number) => (finite(s) ? Math.max(0, Math.min(3, Math.round(s))) : 0)

/** 유리알 3개 문자열 — 별 수만큼 앞에서부터 ●, 나머지 ○(0~3으로 자른다). */
export function beadText(stars: number): string {
  const s = clampStars(stars)
  return '●'.repeat(s) + '○'.repeat(3 - s)
}

/**
 * 데일리 공유 텍스트 — 레벨 id 없음(풀 9개라 id를 보면 9일 주기가 드러난다). P5부터 /daily 공유 전부(prod 결과 카드·본문 버튼, 새 결과 화면)가 쓴다.
 * 옛 shareText(레벨 id·⭐)는 P5에서 지웠다.
 */
export function shareTextV2(rec: DailyRec, n: number): string {
  const s = rec.mask !== undefined && validMask(rec.mask) ? starCount(rec.mask) : clampStars(rec.stars)
  const time = rec.ticks !== undefined && validTicks(rec.ticks) ? ` · ${formatSecs(rec.ticks)}` : ''
  return `Sandlab Daily #${n} ${beadText(s)} ${formatMoves(rec.moves)}${time}\nhttps://sandlab.app/daily`
}

/**
 * 레벨 모드(/play/[id]) 공유 텍스트 — 새 결과 화면(프리뷰)만 쓴다(prod 결과 카드는 hist.shareText 그대로).
 * 링크가 곧 그 레벨이라 URL에는 id가 들어가지만, 글 본문에는 id 대신 이름.
 */
export function levelShareText(level: { id: string; name: string }, stars: number, moves: number, ticks: number | null): string {
  const time = ticks !== null && Number.isFinite(ticks) && ticks >= 0 ? ` · ${formatSecs(ticks)}` : ''
  return `Sandlab Spill · ${level.name} ${beadText(stars)} ${formatMoves(moves)}${time}\nhttps://sandlab.app/play/${level.id}`
}
