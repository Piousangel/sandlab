import type { LevelDef } from '../level/define'

export type GateWindowState = 'always' | 'before' | 'open' | 'after'

export interface TapAt {
  arg?: string
  tick: number
}

export function windowSpan(def: Pick<LevelDef, 'gateWindows'>, gate: string, taps: readonly TapAt[]): { lo: number; hi: number } | null | 'pending' {
  const w = def.gateWindows?.[gate]
  if (!w) return null
  let base = 0
  if (w.after !== undefined) {
    const a = taps.find((t) => t.arg === w.after)
    if (!a) return 'pending'
    base = a.tick
  }
  return { lo: base + w.from, hi: w.to === undefined ? Infinity : base + w.to }
}

export function gateWindowState(def: Pick<LevelDef, 'gateWindows'>, gate: string, tick: number, taps: readonly TapAt[]): GateWindowState {
  const span = windowSpan(def, gate, taps)
  if (span === null) return 'always'
  if (span === 'pending' || tick < span.lo) return 'before'
  return tick <= span.hi ? 'open' : 'after'
}
