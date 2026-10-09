/** 챌린지 레벨 포맷 v1 (스펙 §1.2·§1.3). 좌표는 격자 좌표(1200×600). */
export type Zone = { x: number; y: number; w: number; h: number } | 'all'

export type Shape =
  | { kind: 'rect'; mat: string; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; mat: string; x: number; y: number; r: number }
  | { kind: 'line'; mat: string; x0: number; y0: number; x1: number; y1: number; t: number }

export type Goal =
  | { type: 'fill'; zone: Zone; mat: string; min: number }
  | { type: 'clear'; zone: Zone; mat: string }
  | { type: 'reach'; zone: Zone; mat: string }
  | { type: 'protect'; zone: Zone; mat: string; min: number }

/** 모범답안 획. pts[k] = (tick + k) 틱의 브러시 위치. */
export interface Stroke {
  tick: number
  mat: string
  r: number
  pts: [number, number][]
}

export interface Level {
  v: 1
  id: string
  title: string
  /** 레벨 페이지 본문(영어, 직접 작성) */
  blurb: string
  hint: string
  shapes: Shape[]
  /** 재료 slug → 잉크 예산(픽셀) */
  palette: Record<string, number>
  /** 전부 AND */
  goals: Goal[]
  /** [3성 잉크 상한, 2성 잉크 상한] */
  stars: [number, number]
  solution: Stroke[]
}

export interface GoalStatus {
  met: boolean
  /** 0..1 */
  progress: number
}
