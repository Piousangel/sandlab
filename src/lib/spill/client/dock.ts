import type { LevelDef, TargetDef } from '../level/define'
import type { PlayState } from '../play/controller'

export const DOCK_ROW_H = 21
export const DOCK_PAD = 20
export const DOCK_COMPACT_MIN = 30

export type DockMode = 'full' | 'compact' | null

export interface DockRow {
  kind: 'goal' | 'bad'
  label: string
  value: string
  frac: number
  done: boolean
}

export function dockMode(space: number, rows: number): DockMode {
  if (space >= (rows + 1) * DOCK_ROW_H + DOCK_PAD) return 'full'
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
