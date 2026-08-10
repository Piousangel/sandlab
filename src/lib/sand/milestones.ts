/**
 * 체류시간 장치 #4 — "부은 양" 마일스톤.
 *
 * neal.fun The Deep Sea(스크롤할수록 오르는 누적 숫자가 계속 끌고 간다)와 Sandboxels의
 * 수량/완주 프레이밍(전체 원소 발견 등)이 이 장르에서 실증된 패턴. 다만 실제 세계 단위
 * ("모래시계 3개 분량")는 지어낸 환산이라 정직하지 않다 — 대신 제품이 이미 stat 줄에
 * 노출하는 격자 크기(72만 셀)를 기준 단위로 삼는다: "캔버스 한 판 분량을 부었다."
 *
 * 부은 양은 정확한 셀 카운트가 아니라 스윕 면적 추정(거리 × 브러시 지름)이다 — 겹친 붓질을
 * 중복 계산하지만, 이건 정밀 계측이 아니라 게임화 장치라 괜찮다. GPU 리드백 없음.
 */

interface Threshold {
  mult: number
  text: (mult: number) => string
}

const THRESHOLDS: Threshold[] = [
  { mult: 0.1, text: () => '10% of a canvas poured' },
  { mult: 0.5, text: () => 'Half a canvas poured' },
  { mult: 1, text: () => 'A whole canvas worth poured' },
  { mult: 2, text: (m) => `${m}× a canvas poured` },
  { mult: 5, text: (m) => `${m}× a canvas poured` },
  { mult: 10, text: (m) => `${m}× a canvas poured` },
  { mult: 25, text: (m) => `${m}× a canvas poured — still going` },
]

/**
 * 누적 부은 양(totalPoured, 셀 단위 추정)이 lastMultReached보다 큰 새 마일스톤을 막 넘었으면
 * 그 문구와 도달 배수를 돌려준다. 안 넘었으면 message는 null, multReached는 그대로.
 * 한 번에 여러 임계를 건너뛰어도(빠르게 많이 부으면) 가장 높은 것 하나만 알린다 — 토스트 스팸 방지.
 */
export function checkPourMilestone(
  totalPoured: number,
  gridCells: number,
  lastMultReached: number,
): { message: string | null; multReached: number } {
  let hit: Threshold | null = null
  for (const t of THRESHOLDS) {
    if (t.mult > lastMultReached && totalPoured >= t.mult * gridCells) hit = t
  }
  if (!hit) return { message: null, multReached: lastMultReached }
  return { message: hit.text(hit.mult), multReached: hit.mult }
}
