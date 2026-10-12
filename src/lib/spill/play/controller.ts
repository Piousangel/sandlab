import type { LevelDef, TargetKind } from '../level/define'
import type { ParsedLevel } from '../level/parse'
import type { Sim } from '../sim/sim'
import type { CellRect } from '../sim/sensors'
import { Attempt, asParsed, type PlayAction, type RunResult } from './attempt'
import type { FailReason } from './failure'
import { gateBoxes, legalMask, type ActionInput, type Check, type GateBox, type RejectReason } from './input'
import { toReplay, type Replay } from './replay'

export type Phase = 'setup' | 'run' | 'paused' | 'failed' | 'cleared'
export type Speed = 1 | 2 | 4

export const TICK_MS = 1000 / 60
export const MAX_FRAME_MS = 100
export const FRAME_BUDGET_MS = 12
export const CAP_SAMPLE_TICKS = 120
const ACC_TICK = 1000

export interface TargetView {
  id: string
  kind: TargetKind
  latched: boolean
  progress: number
  need: number
  rect: CellRect
}

export interface PlayState {
  phase: Phase
  tick: number
  moves: number
  attempt: number
  fails: number
  speed: Speed
  speedCap: Speed
  capMeasured: boolean
  canUndo: boolean
  targets: readonly TargetView[]
  targetsLeft: number
  gems: readonly boolean[]
  par: { moves: number; secs: number } | null
  failReason: FailReason | null
  result: RunResult | null
  setup: readonly PlayAction[]
  run: readonly PlayAction[]
  ghosts: readonly PlayAction[]
  triggered: readonly string[]
  gatesClosed: number
}

export type PlayEvent =
  | { type: 'phase'; phase: Phase; prev: Phase }
  | { type: 'action'; action: PlayAction; moves: number }
  | { type: 'reject'; reason: RejectReason }
  | { type: 'latch'; id: string; tick: number; left: number }
  | { type: 'gem'; index: number; tick: number }
  | { type: 'clear'; result: RunResult }
  | { type: 'fail'; reason: FailReason; result: RunResult }
  | { type: 'speed'; speed: Speed; cap: Speed }

export interface ControllerOptions {
  salt?: number
  now?: () => number
}

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export function capFor(avgMs: number): Speed {
  return avgMs <= 2 ? 4 : avgMs <= 4 ? 2 : 1
}

export class SpillController {
  readonly level: ParsedLevel
  readonly gates: GateBox[]
  private attempt: Attempt
  private now: () => number
  private _phase: Phase = 'setup'
  private setupCount = 0
  private ghosts: PlayAction[] = []
  private scheduled: PlayAction[] = []
  private attemptNo = 1
  private fails = 0
  private speed: Speed = 1
  private cap: Speed = 4
  private capMeasured = false
  private sampleTicks = 0
  private sampleMs = 0
  private acc = 0
  private result: RunResult | null = null
  private state: PlayState | null = null
  private listeners = new Set<(s: PlayState) => void>()
  private eventListeners = new Set<(e: PlayEvent) => void>()

  constructor(level: LevelDef | ParsedLevel, opts: ControllerOptions = {}) {
    this.level = asParsed(level)
    this.gates = gateBoxes(this.level)
    this.now = opts.now ?? defaultNow
    this.attempt = new Attempt(this.level, opts.salt)
  }

  get sim(): Sim {
    return this.attempt.sim
  }

  get phase(): Phase {
    return this._phase
  }

  get lh(): string {
    return this.attempt.sim.lh
  }

  subscribe(fn: (s: PlayState) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  onEvent(fn: (e: PlayEvent) => void): () => void {
    this.eventListeners.add(fn)
    return () => { this.eventListeners.delete(fn) }
  }

  getState(): PlayState {
    if (!this.state) this.state = this.buildState()
    return this.state
  }

  legalMask(verb: 'dig' | 'drop' | 'line'): Uint8Array {
    return legalMask(this.attempt.sim.grid, verb)
  }

  replay(): Replay {
    return toReplay(this.level, this.attempt.actions)
  }

  act(input: ActionInput): Check {
    const c = this.tryAct(input)
    if (!c.ok) this.emit({ type: 'reject', reason: c.reason })
    this.changed()
    return c
  }

  private tryAct(input: ActionInput): Check {
    const p = this._phase
    if (p === 'failed' || p === 'cleared') return { ok: false, reason: 'phase' }
    if (p === 'setup' && input.verb === 'trigger') return { ok: false, reason: 'phase' }
    const c = this.attempt.apply(input)
    if (!c.ok) return c
    if (p === 'setup') this.setupCount++
    const action = this.attempt.actions[this.attempt.actions.length - 1]
    this.emit({ type: 'action', action, moves: this.attempt.actions.length })
    if (action.verb === 'trigger' && this.speed !== 1) {
      this.speed = 1
      this.emit({ type: 'speed', speed: 1, cap: this.cap })
    }
    return c
  }

  undo(): boolean {
    if (this._phase !== 'setup' || this.setupCount === 0) return false
    const keep = this.attempt.actions.slice(0, this.setupCount - 1)
    this.rebuild(keep)
    this.changed()
    return true
  }

  run(): boolean {
    if (this._phase !== 'setup') return false
    this.acc = 0
    this.setPhase('run')
    this.changed()
    return true
  }

  pause(): boolean {
    if (this._phase !== 'run') return false
    this.setPhase('paused')
    this.changed()
    return true
  }

  resume(): boolean {
    if (this._phase !== 'paused') return false
    this.acc = 0
    this.setPhase('run')
    this.changed()
    return true
  }

  togglePause(): boolean {
    return this._phase === 'run' ? this.pause() : this.resume()
  }

  retry(): void {
    if (this._phase === 'setup') return
    const actions = this.attempt.actions
    this.ghosts = actions.slice(this.setupCount)
    this.scheduled = []
    this.attemptNo++
    this.rebuild(actions.slice(0, this.setupCount))
    this.setPhase('setup')
    this.changed()
  }

  clearAll(): void {
    this.ghosts = []
    this.scheduled = []
    if (this._phase !== 'setup') this.attemptNo++
    this.rebuild([])
    this.setPhase('setup')
    this.changed()
  }

  schedule(actions: readonly PlayAction[]): void {
    this.scheduled = [...this.scheduled, ...actions].sort((a, b) => a.tick - b.tick)
  }

  setSpeed(s: Speed): Speed {
    const next = (s > this.cap ? this.cap : s) as Speed
    if (next !== this.speed) {
      this.speed = next
      this.emit({ type: 'speed', speed: next, cap: this.cap })
      this.changed()
    }
    return this.speed
  }

  frame(dtMs: number): number {
    if (this._phase !== 'run') return 0
    const dt = dtMs > MAX_FRAME_MS ? MAX_FRAME_MS : dtMs < 0 ? 0 : dtMs
    this.acc += dt * 60 * this.speed
    const start = this.now()
    let n = 0
    while (this.acc >= ACC_TICK && this._phase === 'run') {
      this.tickOnce()
      this.acc -= ACC_TICK
      n++
      if (this.now() - start > FRAME_BUDGET_MS) { this.acc = 0; break }
    }
    if (this._phase !== 'run') this.acc = 0
    if (n > 0) this.changed()
    return n
  }

  advance(ticks: number): number {
    let n = 0
    while (n < ticks && this._phase === 'run') {
      this.tickOnce()
      n++
    }
    if (n > 0) this.changed()
    return n
  }

  private tickOnce(): void {
    const a = this.attempt
    while (this.scheduled.length > 0 && this.scheduled[0].tick <= a.sim.tick) {
      const s = this.scheduled.shift()!
      if (s.tick !== a.sim.tick) continue
      const c = this.tryAct(s)
      if (!c.ok) this.emit({ type: 'reject', reason: c.reason })
    }
    const measure = !this.capMeasured
    const t0 = measure ? this.now() : 0
    const u = a.step()
    if (measure) this.sample(this.now() - t0)
    const tick = a.sim.tick
    const left = a.judge.left
    for (const id of u.latched) this.emit({ type: 'latch', id, tick, left })
    for (const index of u.gems) this.emit({ type: 'gem', index, tick })
    if (a.status === 'cleared') {
      this.result = a.result()
      this.setPhase('cleared')
      this.emit({ type: 'clear', result: this.result })
    } else if (a.status === 'failed') {
      this.result = a.result()
      this.fails++
      this.setPhase('failed')
      this.emit({ type: 'fail', reason: a.failReason!, result: this.result })
    }
  }

  private sample(ms: number): void {
    this.sampleTicks++
    this.sampleMs += ms
    if (this.sampleTicks < CAP_SAMPLE_TICKS) return
    this.capMeasured = true
    this.cap = capFor(this.sampleMs / this.sampleTicks)
    if (this.speed > this.cap) this.speed = this.cap
    this.emit({ type: 'speed', speed: this.speed, cap: this.cap })
  }

  private rebuild(setup: readonly PlayAction[]): void {
    const a = this.attempt
    a.reset()
    for (const s of setup) {
      const c = a.apply(s)
      if (!c.ok) throw new Error(`setup action no longer legal: ${c.reason}`)
    }
    this.setupCount = setup.length
    this.result = null
    this.acc = 0
  }

  private setPhase(p: Phase): void {
    const prev = this._phase
    if (prev === p) return
    this._phase = p
    this.emit({ type: 'phase', phase: p, prev })
  }

  private emit(e: PlayEvent): void {
    for (const fn of this.eventListeners) fn(e)
  }

  private changed(): void {
    this.state = null
    if (this.listeners.size === 0) return
    const s = this.getState()
    for (const fn of this.listeners) fn(s)
  }

  private buildState(): PlayState {
    const a = this.attempt
    const j = a.judge
    const actions = a.actions
    return {
      phase: this._phase,
      tick: a.sim.tick,
      moves: actions.length,
      attempt: this.attemptNo,
      fails: this.fails,
      speed: this.speed,
      speedCap: this.cap,
      capMeasured: this.capMeasured,
      canUndo: this._phase === 'setup' && this.setupCount > 0,
      targets: j.targets.map((t) => ({ id: t.id, kind: t.kind, latched: t.latched, progress: t.progress, need: t.need, rect: t.rect })),
      targetsLeft: j.left,
      gems: j.gems.slice(),
      par: this.level.def.par ?? null,
      failReason: a.failReason,
      result: this.result,
      setup: actions.slice(0, this.setupCount),
      run: actions.slice(this.setupCount),
      ghosts: this.ghosts,
      triggered: a.triggered.slice(),
      gatesClosed: a.gatesClosed,
    }
  }
}
