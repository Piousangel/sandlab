import type { TargetKind } from '../level/define'
import type { ParsedLevel } from '../level/parse'
import type { Grid } from '../sim/grid'
import { M } from '../sim/materials'
import { countRect, type CellRect } from '../sim/sensors'

export interface TargetState {
  id: string
  kind: TargetKind
  rect: CellRect
  need: number
  progress: number
  latched: boolean
  latchTick: number
}

export interface JudgeUpdate {
  latched: string[]
  gems: number[]
  progressed: boolean
  bad: boolean
  crateBroken: boolean
  allLatched: boolean
}

interface Probe {
  mat: number
  pad: number
  hold: number
  base: number
  best: number
}

export class Judge {
  readonly targets: TargetState[]
  readonly gems: boolean[]
  private probes: Probe[]
  private gemRects: (CellRect & { mat: number })[]
  private goals: number

  constructor(private level: ParsedLevel) {
    this.targets = level.targets.map((t) => ({
      id: t.id, kind: t.kind, rect: { x: t.x, y: t.y, w: t.w, h: t.h },
      need: t.kind === 'protect' ? t.holdTicks : t.need, progress: 0, latched: false, latchTick: -1,
    }))
    this.probes = level.targets.map((t) => ({
      mat: t.kind === 'ignite' ? M.fire : t.kind === 'protect' ? M.crate : t.kind === 'reach' && t.mat === M.empty ? M.steam : t.mat,
      pad: t.kind === 'ignite' ? 1 : 0,
      hold: t.holdTicks,
      base: 0,
      best: 0,
    }))
    this.gemRects = level.gems
    this.gems = level.gems.map(() => false)
    this.goals = level.targets.filter((t) => t.kind !== 'bad').length
  }

  get gemCount(): number {
    let n = 0
    for (const g of this.gems) if (g) n++
    return n
  }

  get left(): number {
    let n = 0
    for (const t of this.targets) if (t.kind !== 'bad' && !t.latched) n++
    return n
  }

  init(g: Grid): void {
    for (let k = 0; k < this.targets.length; k++) {
      const t = this.targets[k]
      const p = this.probes[k]
      t.progress = 0
      t.latched = false
      t.latchTick = -1
      p.best = 0
      p.base = t.kind === 'protect' ? this.count(g, t.rect, p) : 0
    }
    this.gems.fill(false)
  }

  private count(g: Grid, r: CellRect, p: Probe): number {
    return countRect(g, p.pad ? { x: r.x - p.pad, y: r.y - p.pad, w: r.w + p.pad * 2, h: r.h + p.pad * 2 } : r, p.mat)
  }

  update(g: Grid, tick = 0): JudgeUpdate {
    const u: JudgeUpdate = { latched: [], gems: [], progressed: false, bad: false, crateBroken: false, allLatched: false }
    let done = 0
    for (let k = 0; k < this.targets.length; k++) {
      const t = this.targets[k]
      const p = this.probes[k]
      if (t.kind === 'bad') {
        const n = this.count(g, t.rect, p)
        t.progress = n
        if (n >= t.need) { u.bad = true; t.latched = true; if (t.latchTick < 0) t.latchTick = tick }
        continue
      }
      if (t.latched) { done++; continue }
      if (t.kind === 'protect') {
        if (this.count(g, t.rect, p) < p.base) { u.crateBroken = true; continue }
        t.progress++
        u.progressed = true
      } else {
        const n = this.count(g, t.rect, p)
        t.progress = n
        if (n > p.best) { p.best = n; u.progressed = true }
      }
      if (t.progress >= t.need) {
        t.latched = true
        t.latchTick = tick
        u.latched.push(t.id)
        done++
      }
    }
    for (let k = 0; k < this.gemRects.length; k++) {
      if (this.gems[k]) continue
      const r = this.gemRects[k]
      if (countRect(g, r, r.mat) > 0) {
        this.gems[k] = true
        u.gems.push(k)
        u.progressed = true
      }
    }
    u.allLatched = this.goals > 0 && done === this.goals
    return u
  }
}
