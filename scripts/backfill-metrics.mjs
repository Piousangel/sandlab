/**
 * 배급 지표 백필 — 새 계측 없이 기존 공개 API(GET /api/scenes)만으로 집계한다.
 *
 * 왜 이렇게 하나:
 *   scenes.votes는 이미 목록 API가 씬마다 내려준다. "업로드→최소1표 도달률"은 개별 투표
 *   타임스탬프가 필요 없다 — scenes.votes > 0 인 비율이면 충분하다. 그래서 D1을 직접 열 필요 없이
 *   프로덕션이 이미 공개한 읽기 전용 엔드포인트만으로 계산 가능하다(추가 인프라 0).
 *
 * 계산하는 것 (analytics.md 연구 사이클 1의 미해결 질문 3개, 그 이상 확장하지 않는다):
 *   - 주간 신규 씬 수 (hot 엔드포인트의 total = created_at > now-7d 카운트, 서버와 동일 정의)
 *   - 씬당 평균 표
 *   - 업로드 → 최소 1표 도달률 (= "관객이 실재하는가"의 직접 증거)
 *
 * 표본이 작을 때(현재 갤러리 규모) 비율만 보면 노이즈를 신호로 오독하니, 원본 카운트를 항상 같이 찍는다.
 *
 * 실행: node scripts/backfill-metrics.mjs [https://sandlab.app]
 */

const BASE = process.argv[2] || 'https://sandlab.app'
const PAGE_SIZE = 24 // src/lib/sand/gallery.ts 와 동일

async function fetchAllScenes() {
  const all = []
  let offset = 0
  for (;;) {
    const res = await fetch(`${BASE}/api/scenes?sort=new&offset=${offset}`)
    if (!res.ok) throw new Error(`GET /api/scenes?sort=new&offset=${offset} → ${res.status}`)
    const { scenes, total } = await res.json()
    all.push(...scenes)
    offset += scenes.length
    if (scenes.length === 0 || offset >= total) break
  }
  return all
}

async function fetchWeeklyNewCount() {
  const res = await fetch(`${BASE}/api/scenes?sort=hot`)
  if (!res.ok) throw new Error(`GET /api/scenes?sort=hot → ${res.status}`)
  const { total } = await res.json()
  return total // 서버 정의: created_at > now - HOT_WINDOW_DAYS(7일)
}

const scenes = await fetchAllScenes()
const weeklyNew = await fetchWeeklyNewCount()

const total = scenes.length
const totalVotes = scenes.reduce((s, c) => s + c.votes, 0)
const withAnyVote = scenes.filter((c) => c.votes > 0).length

const avgVotes = total ? totalVotes / total : 0
const conversionRate = total ? withAnyVote / total : 0

console.log(`대상: ${BASE}`)
console.log(`전체 씬: ${total}건`)
console.log(`주간 신규 씬(최근 7일): ${weeklyNew}건`)
console.log(`씬당 평균 표: ${avgVotes.toFixed(2)} (합계 ${totalVotes}표 / ${total}건)`)
console.log(
  `업로드→최소1표 도달률: ${(conversionRate * 100).toFixed(1)}% (${withAnyVote}/${total}건) ` +
    (total < 30 ? '— 표본이 작아 참고용(노이즈 가능성 큼)' : ''),
)
