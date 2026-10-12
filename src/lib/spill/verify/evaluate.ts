import type { ParsedLevel } from '../level/parse'
import { Attempt, type PlayAction } from '../play/attempt'
import type { FailReason } from '../play/failure'

export interface Outcome {
  legal: boolean
  cleared: boolean
  ticks: number
  moves: number
  gems: number
  gemTotal: number
  reason: FailReason | 'illegal' | null
  hash: string
}

const pool = new WeakMap<ParsedLevel, Map<number, Attempt>>()

function attemptFor(level: ParsedLevel, salt: number | undefined): Attempt {
  let m = pool.get(level)
  if (!m) { m = new Map(); pool.set(level, m) }
  const key = salt ?? -1
  let a = m.get(key)
  if (!a) { a = new Attempt(level, salt); m.set(key, a) }
  else a.reset()
  return a
}

export function sortActions(actions: readonly PlayAction[]): PlayAction[] {
  return actions.map((a, i) => ({ a, i })).sort((x, y) => x.a.tick - y.a.tick || x.i - y.i).map((x) => x.a)
}

export function evaluate(level: ParsedLevel, actions: readonly PlayAction[], salt?: number): Outcome {
  const a = attemptFor(level, salt)
  const list = sortActions(actions)
  let i = 0
  let legal = true
  while (a.status === 'live') {
    while (i < list.length && list[i].tick === a.sim.tick) {
      const c = a.apply(list[i])
      i++
      if (!c.ok) { legal = false; break }
    }
    if (!legal) break
    a.step()
  }
  if (i < list.length) legal = false
  const gemTotal = a.judge.gems.length
  if (!legal) return { legal, cleared: false, ticks: a.sim.tick, moves: a.actions.length, gems: a.judge.gemCount, gemTotal, reason: 'illegal', hash: a.sim.hash() }
  return {
    legal,
    cleared: a.status === 'cleared',
    ticks: a.endTick,
    moves: a.actions.length,
    gems: a.judge.gemCount,
    gemTotal,
    reason: a.failReason,
    hash: a.sim.hash(),
  }
}
