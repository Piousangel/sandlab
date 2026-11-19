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
import type { DailyRec } from '@/lib/spill/client/daily'

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

/** 새 셸 /daily 플레이 화면의 설명 패널(P7) — classic(prod)은 null이라 DailySpill이 지금 패널을 그대로 그린다. */
export interface DailyAsideProps {
  n: number
  level: LevelDef
  /** 오늘 공식 기록(없으면 null). */
  mine: DailyRec | null
  /** 정적 설명(SEO "How the daily works"). */
  children?: ReactNode
}

/**
 * "오늘 클리어한 사람 중 상위 N%" 한 줄의 데이터(P5는 자리와 인터페이스만 — 서버 집계 엔드포인트가 아직 없다).
 * 값이 없거나(null) 표본이 작으면 결과 화면은 그 줄을 아예 그리지 않는다(가짜 수치 금지). 설계 제안은 계획서 P5 메모.
 */
export interface DailyStanding {
  /** 1~100. 공식 기록(첫 클리어) 기준 상위 퍼센트(작을수록 좋음). */
  topPercent: number
  /** 그날 공식 기록 수(분모). */
  sample: number
}

/**
 * 데일리 클리어 한 번의 정보 — DailySpill의 onCleared가 돌려준다(SpillPlayer가 결과 카드·결과 화면에 넘김).
 * text = shareTextV2(공식 기록) — prod 결과 카드의 Share도 이것을 쓴다(레벨 id 없음).
 */
export interface DailyClear {
  n: number
  /** 이번 클리어가 그날 첫 클리어(공식 기록, S4)인가. 아니면 연습. */
  official: boolean
  /** 그날 공식 기록(공유 텍스트·이미지가 말하는 기록). */
  record: DailyRec
  text: string
  standing: DailyStanding | null
}

export interface SpillResultProps {
  layout: Layout
  level: LevelDef
  /** 이번 판 결과(수·틱). */
  moves: number
  ticks: number
  stars: { clear: boolean; gems: boolean; par: boolean; count: number }
  /** 엔진 보드 캔버스 — 결과 화면이 처음 그려질 때 한 번 복사해 액자에 건다(실제 종료 프레임, 목업 아님). */
  board(): HTMLCanvasElement | null
  starGapMs: number
  onStar(i: number): void
  onSkip(): void
  /** 해답 보기(Watch)가 끝난 결과 — 공유 없이 "직접 해 보기"만. */
  solution: boolean
  /** 데일리 직접 플레이 클리어면 그 정보(공유 = 공식 기록 기준 shareTextV2). 레벨 모드·해답 보기는 null(레벨 공유 텍스트를 결과 화면이 만든다). */
  daily: DailyClear | null
  /** 레벨 모드 다음 레벨 링크(마지막이면 null → 전체 목록). */
  nextHref: string | null
  onPractice(): void
}
