import type { LevelDef } from '../level/define'
import type { RunResult } from './attempt'

export interface Par {
  moves: number
  secs: number
}

export interface Stars {
  clear: boolean
  gems: boolean
  par: boolean
  count: number
}

export interface Rank {
  moves: number
  ticks: number
  dug: number
}

export const STAR_CLEAR = 1
export const STAR_GEMS = 2
export const STAR_PAR = 4

export function parTicks(secs: number): number {
  return Math.round(secs * 10) * 6
}

export function parSecsFromBest(ticks: number): number {
  return Math.ceil((ticks * 23) / 120) / 10
}

export function stars(r: RunResult, level: Pick<LevelDef, 'par'>): Stars {
  if (r.outcome !== 'cleared') return { clear: false, gems: false, par: false, count: 0 }
  const gems = r.gemTotal === 0 || r.gems === r.gemTotal
  const p = level.par
  const par = !!p && r.moves <= p.moves && r.ticks <= parTicks(p.secs)
  return { clear: true, gems, par, count: 1 + (gems ? 1 : 0) + (par ? 1 : 0) }
}

export function starMask(s: Stars): number {
  return (s.clear ? STAR_CLEAR : 0) | (s.gems ? STAR_GEMS : 0) | (s.par ? STAR_PAR : 0)
}

export function starCount(mask: number): number {
  return (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1)
}

export function compareResults(a: Rank, b: Rank): number {
  return a.moves - b.moves || a.ticks - b.ticks || a.dug - b.dug
}

export function formatMoves(n: number): string {
  return `${n} ${n === 1 ? 'move' : 'moves'}`
}

export function formatSecs(ticks: number): string {
  return `${(Math.ceil(ticks / 6) / 10).toFixed(1)}s`
}

export function hudLine(moves: number, par: Par | null | undefined): string {
  if (!par) return formatMoves(moves)
  return `${formatMoves(moves)} · par ${par.moves} / ${par.secs.toFixed(1)}s`
}

export function overPar(moves: number, ticks: number, par: Par): { moves: boolean; time: boolean } {
  return { moves: moves > par.moves, time: ticks > parTicks(par.secs) }
}
