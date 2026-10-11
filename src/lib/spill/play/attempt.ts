import type { LevelDef } from '../level/define'
import { parseLevel, type ParsedLevel } from '../level/parse'
import { Sim } from '../sim/sim'
import { FailureDetector, type FailReason } from './failure'
import { checkAction, type ActionInput, type Check } from './input'
import { Judge, type JudgeUpdate } from './targets'

export interface PlayAction extends ActionInput {
  tick: number
}

export type AttemptStatus = 'live' | 'cleared' | 'failed'

export interface RunResult {
  id: string
  lh: string
  outcome: 'cleared' | 'failed'
  reason: FailReason | null
  ticks: number
  moves: number
  dug: number
  gems: number
  gemTotal: number
  gemMask: boolean[]
  latched: string[]
  targetsLeft: number
  hash: string
}

export function asParsed(level: LevelDef | ParsedLevel): ParsedLevel {
  return 'mat' in level && 'def' in level ? (level as ParsedLevel) : parseLevel(level as LevelDef)
}

export function devActions(level: LevelDef | ParsedLevel): PlayAction[] {
  const def = 'def' in level && 'mat' in level ? (level as ParsedLevel).def : (level as LevelDef)
  return (def.dev ?? []).map(([tick, verb, tx, ty, tx2, ty2, arg]) => (arg === undefined ? { tick, verb, tx, ty, tx2, ty2 } : { tick, verb, tx, ty, tx2, ty2, arg }))
}

export class Attempt {
  readonly sim = new Sim()
  readonly judge: Judge
  readonly fail = new FailureDetector()
  status: AttemptStatus = 'live'
  failReason: FailReason | null = null
  endTick = -1
  actions: PlayAction[] = []
  dug = 0
  drops = 0
  lines = 0
  triggered: string[] = []
  lastUpdate: JudgeUpdate | null = null

  constructor(readonly level: ParsedLevel, readonly salt?: number) {
    this.judge = new Judge(level)
    this.reset()
  }

  reset(): void {
    this.sim.load(this.level)
    if (this.salt !== undefined) this.sim.salt = this.salt
    this.judge.init(this.sim.grid)
    this.fail.reset()
    this.status = 'live'
    this.failReason = null
    this.endTick = -1
    this.actions = []
    this.dug = 0
    this.drops = 0
    this.lines = 0
    this.triggered = []
    this.lastUpdate = null
  }

  check(input: ActionInput): Check {
    return checkAction(this.level, this.sim.grid, input, { drops: this.drops, lines: this.lines, triggered: this.triggered })
  }

  apply(input: ActionInput): Check {
    if (this.status !== 'live') return { ok: false, reason: 'phase' }
    const c = this.check(input)
    if (!c.ok) return c
    const a = c.action
    this.sim.apply({ verb: a.verb, tx: a.tx, ty: a.ty, tx2: a.tx2, ty2: a.ty2, arg: a.arg })
    this.actions.push({ tick: this.sim.tick, ...a })
    this.dug += c.dug
    if (a.verb === 'drop') this.drops++
    if (a.verb === 'line') this.lines++
    if (a.verb === 'trigger') this.triggered.push(a.arg ?? '')
    return c
  }

  step(): JudgeUpdate {
    const sim = this.sim
    sim.step()
    const u = this.judge.update(sim.grid, sim.tick)
    this.lastUpdate = u
    if (u.allLatched && !u.bad && !u.crateBroken) {
      this.status = 'cleared'
      this.endTick = sim.tick
      return u
    }
    const r = this.fail.observe({
      tick: sim.tick, moved: sim.lastMoved, progressed: u.progressed || u.latched.length > 0,
      sourcesLeft: sim.spoutTotalLeft, burning: sim.lastBurning, bad: u.bad, crateBroken: u.crateBroken,
    })
    if (r) {
      this.status = 'failed'
      this.failReason = r
      this.endTick = sim.tick
    }
    return u
  }

  result(): RunResult {
    if (this.status === 'live') throw new Error('Attempt.result while live')
    const j = this.judge
    return {
      id: this.level.def.id,
      lh: this.sim.lh,
      outcome: this.status,
      reason: this.failReason,
      ticks: this.endTick,
      moves: this.actions.length,
      dug: this.dug,
      gems: j.gemCount,
      gemTotal: j.gems.length,
      gemMask: j.gems.slice(),
      latched: j.targets.filter((t) => t.kind !== 'bad' && t.latched).map((t) => t.id),
      targetsLeft: j.left,
      hash: this.sim.hash(),
    }
  }
}

export interface SimulateOptions {
  salt?: number
}

export function simulate(level: LevelDef | ParsedLevel, actions: readonly PlayAction[], opts: SimulateOptions = {}): RunResult {
  for (let k = 0; k < actions.length; k++) {
    const t = actions[k].tick
    if (!Number.isInteger(t) || t < 0) throw new Error(`action ${k}: bad tick ${t}`)
    if (k > 0 && t < actions[k - 1].tick) throw new Error(`action ${k}: ticks out of order`)
  }
  const a = new Attempt(asParsed(level), opts.salt)
  let i = 0
  while (a.status === 'live') {
    while (i < actions.length && actions[i].tick === a.sim.tick) {
      const c = a.apply(actions[i])
      if (!c.ok) throw new Error(`action ${i} at tick ${actions[i].tick}: ${c.reason === 'illegal' ? 'illegal' : c.reason}`)
      i++
    }
    a.step()
  }
  if (i < actions.length) throw new Error(`action ${i} at tick ${actions[i].tick} is after the end (tick ${a.endTick})`)
  return a.result()
}
