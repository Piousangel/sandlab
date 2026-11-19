/**
 * Spill 화면 새 HUD(P4)의 계약 타입. classic.ts·next.ts·SpillPlayer·DailySpill이 `import type`으로만 쓴다
 * (타입 전용 import는 컴파일 때 지워져 번들 그래프에 들어가지 않는다 — classic.ts의 런타임 import 0개는 그대로).
 */
import type { ReactNode } from 'react'
import type { LevelDef, Verb } from '@/lib/spill/level/define'
import type { Speed } from '@/lib/spill/play/controller'
import type { DockRow } from '@/lib/spill/client/dock'
import type { RunAction, TrayVerb } from '@/lib/spill/client/view'
import type { Layout, LayoutChrome } from '@/lib/spill/render/layout'

export interface SpillFrameProps {
  layout: Layout
  /** 헤더 제목. badge = 레벨 id(데일리는 No.N — 풀 9개라 id를 보이면 주기가 드러난다). */
  title: { badge: string; name: string; backHref: string; backLabel: string }
  /** 캔버스 2장(엔진·오버레이). 크기 cssW×cssH, Frame이 어두운 유리 테두리 안에 넣는다. */
  board: ReactNode
  goals: DockRow[]
  gems: { got: number; total: number }
  /** 진행 줄(hudLine 형식). 1-1·1-2처럼 수를 숨기는 레벨은 null. */
  progress: { moves: number; par: { moves: number; secs: number } | null; over: boolean } | null
  message: { text: string; tone: 'info' | 'fail' } | null
  onWatch: (() => void) | null
  verbs: TrayVerb[]
  selected: Verb | null
  onVerb(v: Verb): void
  run: { action: RunAction; watching: boolean }
  runHighlight: boolean
  onRun(a: RunAction): void
  canUndo: boolean
  onUndo(): void
  onRetry(): void
  onClearAll(): void
  speed: Speed
  /** 속도 버튼을 누를 수 있는가(실행 중이고 속도 상한 > 1). */
  speedOn: boolean
  onSpeed(): void
  sound: boolean
  onSound(): void
  /** 화면 어디를 눌러도 오디오 잠금 해제(지금 HUD의 .spill-main 캡처 핸들러와 같음 — iOS 첫 효과음). */
  onPointer(): void
  /** 결과 카드가 떠 있으면 도구 줄을 숨긴다(지금 화면과 같음). */
  toolsHidden: boolean
  /** 보드·트레이 위에 얹는 것(결과 카드·온보딩 손). */
  overlay: ReactNode
  /** 오른쪽(데스크톱)/아래(모바일) 설명 패널 — 정적 HTML 설명 텍스트가 여기 들어간다. */
  aside: ReactNode
}

export interface SpillHudKit {
  /** 보드 위·아래에 예약할 높이(computeLayout에 넘김). vw로 데스크톱 여부를 가른다. */
  chrome(vw: number): LayoutChrome
  Frame(p: SpillFrameProps): React.JSX.Element
}

export interface DailyStartProps {
  dayNumber: number
  level: LevelDef
  /** 오늘 이미 공식 기록이 있으면 연습 모드 문구. */
  solved: boolean
  onStart(): void
  /** 정적 설명(SEO) — 시작 화면 아래에 그린다. */
  children?: ReactNode
}
