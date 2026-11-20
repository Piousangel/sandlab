/**
 * 갤러리 큐레이션 "Sandlab pick" 12점(계획서 P9). 저장소 안 정적 데이터 — prod D1에 새 장면을 쓰지 않는다.
 *
 * - 장면 = 이미 공개된 갤러리 id. 전부 팀(아트 카운슬, 2026-08 라운드 1~6 — 인계서 이력)이 만들어 올린 작품이라
 *   작성자 표기 "Sandlab"이 사실이다(올릴 때 이름 없이 올려 D1의 creator_name은 비어 있다 → 홈 진입 부제는 이 목록으로 채운다).
 *   존재 확인은 prod GET(/api/scenes/:id)으로만 했다(2026-11-20).
 * - 썸네일 = 로컬 실엔진 캡처(프리뷰 홈 `/#s=<id>`를 헤드리스 크로미움 Metal WebGPU로 열어 1.5초 돌린 우물 캔버스) → webp 640×320(1점만 560),
 *   개당 ≤ 20KB. 재생성: scripts/capture-wall.cjs(설명은 그 파일 머리말).
 * - 제목은 D1에 올린 그대로(소문자 포함) — 홈 진입 제목과 같게.
 * - 순서 = 이웃끼리 색조가 겹치지 않게(따뜻함·차가움·무채를 번갈아). `tone`은 캡처에서 잰 대표 색(채도 0.25 이상 픽셀의 평균 색상각)
 *   + 눈으로 본 팔레트 — 화면에는 안 쓰고 다양성 검토·테스트용.
 */
export const SANDLAB_CREATOR = 'Sandlab'

export type Pick = { id: string; title: string; tone: string }

export const PICKS: readonly Pick[] = [
  { id: 'LmIK_BTArCk', title: 'molten cascade', tone: 'yellow lava 49°' },
  { id: 'm71SWxdb9sc', title: 'deep drift', tone: 'sky-blue water 204°' },
  { id: 'rIxeixvTdzg', title: 'Bramble Crown', tone: 'amber wood 34°' },
  { id: 'byF1YyDKtUo', title: 'Descending Glowvines', tone: 'lime glow on slate 90°' },
  { id: 'laZ7c3B20l4', title: 'Quench', tone: 'orange beam into teal 177°' },
  { id: 'iSYHbdYprI8', title: 'Frozen Tide', tone: 'silver monochrome' },
  { id: 'OrvXQ1OIu9E', title: 'light waves', tone: 'green, orange and white bands 53°' },
  { id: 'KrL2Zri9mFk', title: 'Abyssal Bell', tone: 'navy with green tendrils 202°' },
  { id: 'YVMAgr-Rhko', title: 'Bioluminescent Mushroom Grove', tone: 'grey field, lime caps 75°' },
  { id: 'PAwj98FASEE', title: 'crystal grotto', tone: 'white ice over pale blue 204°' },
  { id: 'rEi8KjPA8mU', title: 'Narrow Gauge', tone: 'warm wood lines on black 33°' },
  { id: '832_afMsVeU', title: 'After Hours', tone: 'slate city, lit windows' },
]

const PICK_IDS = new Set(PICKS.map((p) => p.id))

export function isSandlabPick(id: string | null | undefined): boolean {
  return !!id && PICK_IDS.has(id)
}

export const pickThumb = (id: string) => `/ui-next/wall/${id}.webp`
