/**
 * /play 전시실·/play/[id] 설명 패널(리디자인 P8)의 계약 타입. classic.ts·next.ts·페이지가 `import type`으로만 쓴다
 * (컴파일 때 지워진다 — classic.ts의 런타임 import 0개 유지).
 * 페이지(서버)가 데이터를 다 계산해서 넘긴다: 새 셸 컴포넌트는 레벨 정의·describe를 직접 import하지 않는다
 * → 두 빌드의 본문 문장이 같은 출처(page.tsx)에서 나온다(단어 수 diff 0의 근거).
 */
import type { ReactNode } from 'react'

export interface PlayGalleryLevel {
  id: string
  world: number
  name: string
  /** 목록 한 줄 설명: "Flow. Fill the pot with 300 cells of water." (prod 'All levels' 목록과 같은 문장) */
  line: string
  /** /play/<id>/guide가 있는가 */
  guide: boolean
}

export interface PlayGalleryProps {
  levels: PlayGalleryLevel[]
  /** 소개 문단(prod 본문과 같은 문자열) — "How Spill works" 카드 안에 그린다. */
  intro: string[]
  /** JSON-LD 등 페이지 머리에 그대로 넣을 것. */
  children?: ReactNode
}

export interface LevelAsideProps {
  id: string
  name: string
  world: number
  worldName: string
  /** describeLevel(level).summary */
  summary: string
  verbs: string[]
  /** 재료 slug와 /materials/<slug> 글이 있는지 */
  materials: { slug: string; page: boolean }[]
  hint: string | null
  /** 레벨 고유 노트(src/content/level-notes) — 없으면 절을 숨긴다 */
  notes?: { setup: string; principle: string; stuck: string[] } | null
  guide: boolean
  next: { id: string; name: string } | null
}
