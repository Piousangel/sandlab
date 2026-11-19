import type { LevelDef, TargetDef } from '../level/define'
import type { PlayState } from '../play/controller'

export const DOCK_ROW_H = 21
export const DOCK_PAD = 20
export const DOCK_COMPACT_MIN = 30
/** 목표 칩 한 줄 실제 높이(GoalDock: 링 28 + padding 4 + border 4). 이 값 + 여유 8이면 full. */
export const DOCK_CHIP_H = 36
export const DOCK_FULL_MIN = DOCK_CHIP_H + 8

export type DockMode = 'full' | 'compact' | null

export interface DockRow {
  kind: 'goal' | 'bad'
  label: string
  value: string
  frac: number
  done: boolean
}

export function dockMode(space: number, rows: number): DockMode {
  void rows // 칩은 한 줄(가로 스크롤)이라 목표 수와 무관하게 높이는 일정
  if (space >= DOCK_FULL_MIN) return 'full'
  return space >= DOCK_COMPACT_MIN ? 'compact' : null
}

export function dockSummary(rows: DockRow[]): string {
  const goals = rows.filter((r) => r.kind === 'goal')
  const done = goals.filter((r) => r.done).length
  const pots = goals.every((r) => r.label.startsWith('Pot'))
  const noun = pots ? (goals.length === 1 ? 'pot' : 'pots') : goals.length === 1 ? 'goal' : 'goals'
  return `${done}/${goals.length} ${noun}`
}

function nameOf(t: TargetDef, n: number, many: boolean): string {
  const k = many ? ` ${n}` : ''
  switch (t.kind) {
    case 'fill': return `Pot${k} · ${t.mat ?? ''}`
    case 'ignite': return `Torch${k}`
    case 'reach': return `Bell${k}`
    case 'protect': return `Crate${k}`
    case 'bad': return 'Skull pot'
  }
}

export function dockRows(s: PlayState, def: LevelDef): DockRow[] {
  const goals = def.targets.filter((t) => t.kind !== 'bad').length
  let n = 0
  return def.targets.map((t, k) => {
    const v = s.targets[k]
    const need = Math.max(1, v?.need ?? t.need ?? 1)
    const progress = Math.max(0, v?.progress ?? 0)
    const frac = Math.min(1, progress / need)
    if (t.kind === 'bad') return { kind: 'bad', label: nameOf(t, 0, false), value: progress > 0 ? 'hit' : 'safe', frac, done: false }
    n++
    const value = t.kind === 'protect' ? `${(Math.min(progress, need) / 60).toFixed(1)}/${(need / 60).toFixed(1)}s` : `${Math.min(progress, need)}/${need}`
    return { kind: 'goal', label: nameOf(t, n, goals > 1), value, frac: v?.latched ? 1 : frac, done: !!v?.latched }
  })
}
