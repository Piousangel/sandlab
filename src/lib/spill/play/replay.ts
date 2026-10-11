import type { LevelDef, Verb } from '../level/define'
import type { ParsedLevel } from '../level/parse'
import { MAX_ACTIONS, asParsed, simulate, type PlayAction, type RunResult, type SimulateOptions } from './attempt'
import { levelHash } from '../level/hash'

export const MAX_REPLAY_ACTIONS = MAX_ACTIONS
export const VERB_CODES: Record<Verb, number> = { dig: 0, drop: 1, line: 2, trigger: 3 }
const VERBS: Verb[] = ['dig', 'drop', 'line', 'trigger']

export interface Replay {
  v: 1
  id: string
  lh: string
  a: number[][]
}

export function toReplay(level: LevelDef | ParsedLevel, actions: readonly PlayAction[]): Replay {
  const p = asParsed(level)
  return {
    v: 1,
    id: p.def.id,
    lh: levelHash(p.def),
    a: actions.map((x) =>
      x.verb === 'trigger'
        ? [x.tick, VERB_CODES.trigger, p.gates.indexOf(x.arg ?? ''), 0, 0, 0]
        : [x.tick, VERB_CODES[x.verb], x.tx, x.ty, x.tx2, x.ty2]),
  }
}

export function serializeReplay(r: Replay): string {
  return JSON.stringify({ v: r.v, id: r.id, lh: r.lh, a: r.a })
}

const isUInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 0xffff

export function parseReplay(input: unknown): Replay {
  const o = (typeof input === 'string' ? JSON.parse(input) : input) as Partial<Replay> | null
  if (!o || typeof o !== 'object') throw new Error('replay: not an object')
  if (o.v !== 1) throw new Error(`replay: unsupported version ${String(o.v)}`)
  if (typeof o.id !== 'string' || o.id.length === 0 || o.id.length > 64) throw new Error('replay: bad id')
  if (typeof o.lh !== 'string' || !/^[0-9a-f]{8}$/.test(o.lh)) throw new Error('replay: bad lh')
  if (!Array.isArray(o.a)) throw new Error('replay: actions must be an array')
  if (o.a.length > MAX_REPLAY_ACTIONS) throw new Error(`replay: too many actions (${o.a.length} > ${MAX_REPLAY_ACTIONS})`)
  const a = o.a.map((t, k) => {
    if (!Array.isArray(t) || t.length !== 6 || !t.every(isUInt) || t[1] >= VERBS.length) throw new Error(`replay: action ${k} is malformed`)
    return t.slice() as number[]
  })
  return { v: 1, id: o.id, lh: o.lh, a }
}

export function fromReplay(level: LevelDef | ParsedLevel, r: Replay): PlayAction[] {
  const p = asParsed(level)
  if (r.id !== p.def.id) throw new Error(`replay: id ${r.id} does not match level ${p.def.id}`)
  if (r.lh !== levelHash(p.def)) throw new Error(`replay: lh ${r.lh} does not match level`)
  const verbs = p.def.verbs ?? {}
  return r.a.map(([tick, code, tx, ty, tx2, ty2], k) => {
    const verb = VERBS[code]
    if (verb === 'trigger') {
      const name = p.gates[tx]
      if (name === undefined) throw new Error(`replay: action ${k} names unknown gate ${tx}`)
      return { tick, verb, tx: 0, ty: 0, tx2: 0, ty2: 0, arg: name }
    }
    const arg = verb === 'drop' ? verbs.drop?.kind : verb === 'line' ? verbs.line?.mat : undefined
    return arg === undefined ? { tick, verb, tx, ty, tx2, ty2 } : { tick, verb, tx, ty, tx2, ty2, arg }
  })
}

export function replayResult(level: LevelDef | ParsedLevel, r: Replay, opts: SimulateOptions = {}): RunResult {
  const p = asParsed(level)
  return simulate(p, fromReplay(p, r), opts)
}
