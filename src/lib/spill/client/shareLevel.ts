/**
 * 레벨 모드(/play/[id]) 공유 텍스트 v2 — 새 결과 화면(리디자인 P5, 프리뷰 빌드)만 쓴다.
 * 데일리 shareTextV2와 같은 유리알 규칙(●○, 별 수만큼 앞에서부터). 레벨 모드는 링크가 곧 그 레벨이라 URL에 id가 들어가지만
 * 글 본문에는 id 대신 레벨 이름을 쓴다(화면에 id를 보이지 않는 것과 같은 규칙).
 * prod 결과 카드(ResultCard)는 그대로 hist.shareText를 쓴다 — 이 파일은 ui-next에서만 import한다(prod 번들 무관).
 */
import { formatMoves, formatSecs } from '../play/score'
import { beadText } from './daily'

export function levelShareText(level: { id: string; name: string }, stars: number, moves: number, ticks: number | null): string {
  const time = ticks !== null && Number.isFinite(ticks) && ticks >= 0 ? ` · ${formatSecs(ticks)}` : ''
  return `Sandlab Spill · ${level.name} ${beadText(stars)} ${formatMoves(moves)}${time}\nhttps://sandlab.app/play/${level.id}`
}
