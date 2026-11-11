import type { LevelDef, Verb } from '../level/define'
import type { Phase, PlayState } from '../play/controller'
import type { RunResult } from '../play/attempt'
import type { FailReason } from '../play/failure'
import type { RejectReason } from '../play/input'
import { formatMoves, formatSecs, overPar, parTicks, starCount, starMask, stars } from '../play/score'

export type HudKey = string

export function failMessage(reason: FailReason | null, left: number, gatesClosed = 0): string {
  if ((reason === 'stalled' || reason === 'sourcesStopped') && gatesClosed > 0) return `Everything settled · open the ${gatesClosed === 1 ? 'gate' : 'gates'} sooner`
  const t = `${left} ${left === 1 ? 'target' : 'targets'} left`
  switch (reason) {
    case 'bad': return 'It reached the skull pot'
    case 'crate': return 'The crate broke'
    case 'timeout': return `Out of time · ${t}`
    default: return t
  }
}

export function rejectMessage(reason: RejectReason, verb: Verb): string {
  switch (reason) {
    case 'illegal': return verb === 'dig' ? 'Dig through dirt' : 'Needs an empty spot'
    case 'maxLen': return 'Too long'
    case 'charges': return 'No charges left'
    case 'phase': return verb === 'trigger' ? 'Run first, then tap the gate' : 'Retry to change the plan'
    case 'limit': return 'Move limit reached'
    case 'gate': return 'That gate is already open'
    case 'bounds': return 'Off the board'
    case 'shape': return 'Straight lines only'
    default: return 'Not here'
  }
}

export type RunAction = 'run' | 'pause' | 'resume' | 'retry' | 'next'

export function runButton(phase: Phase, hasNext: boolean, watching = false): { label: string; action: RunAction } {
  if (watching && (phase === 'cleared' || phase === 'failed')) return { label: '↺ TRY IT', action: 'retry' }
  switch (phase) {
    case 'setup': return { label: '▶ RUN', action: 'run' }
    case 'run': return { label: '⏸ PAUSE', action: 'pause' }
    case 'paused': return { label: '▶ RESUME', action: 'resume' }
    case 'failed': return { label: '↺ RETRY', action: 'retry' }
    case 'cleared': return hasNext ? { label: 'NEXT ▶', action: 'next' } : { label: '↺ RETRY', action: 'retry' }
  }
}

export interface HudParts {
  moves: string
  par: string | null
  movesOver: boolean
  timeOver: boolean
}

export function hudParts(s: PlayState, compact = false): HudParts {
  const moves = formatMoves(s.moves)
  if (!s.par) return { moves, par: null, movesOver: false, timeOver: false }
  const o = overPar(s.moves, s.tick, s.par)
  if (compact) return { moves: `${s.moves}/${s.par.moves}`, par: `${s.par.secs.toFixed(1)}s`, movesOver: o.moves, timeOver: o.time }
  return { moves, par: `par ${s.par.moves} / ${s.par.secs.toFixed(1)}s`, movesOver: o.moves, timeOver: o.time }
}

export function showMovesFor(id: string): boolean {
  return id !== '1-1' && id !== '1-2'
}

export function hudKey(s: PlayState): HudKey {
  return [
    s.phase, s.moves, Math.ceil(s.tick / 6), s.targetsLeft, s.gems.join(''), s.speed, s.speedCap, s.canUndo, s.attempt,
    s.targets.map((t) => (t.latched ? 'L' : Math.floor((t.progress / (t.need || 1)) * 20))).join(','), s.triggered.length,
  ].join('|')
}

export interface TrayVerb {
  verb: Verb
  label: string
  icon: string
  left: number | null
}

export interface Usage {
  drops: number
  lines: number
  triggered: string[]
}

export function usageOf(s: Pick<PlayState, 'setup' | 'run'>): Usage {
  const all = [...s.setup, ...s.run]
  return {
    drops: all.filter((a) => a.verb === 'drop').length,
    lines: all.filter((a) => a.verb === 'line').length,
    triggered: all.filter((a) => a.verb === 'trigger').map((a) => a.arg ?? ''),
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function trayVerbs(def: LevelDef, used: { drops: number; lines: number }): TrayVerb[] {
  const v = def.verbs ?? {}
  const out: TrayVerb[] = []
  if (v.dig) out.push({ verb: 'dig', label: 'Dig', icon: '⛏', left: null })
  if (v.drop) out.push({ verb: 'drop', label: cap(v.drop.kind), icon: '✦', left: Math.max(0, v.drop.charges - used.drops) })
  if (v.line) out.push({ verb: 'line', label: cap(v.line.mat), icon: '━', left: v.line.charges === undefined ? null : Math.max(0, v.line.charges - used.lines) })
  if (v.trigger && v.trigger.length) out.push({ verb: 'trigger', label: 'Gate', icon: '⚡', left: v.trigger.length })
  return out
}

export function autoplayMark(r: RunResult, def: LevelDef): string {
  if (r.outcome !== 'cleared') return `failed:${r.reason}:${r.moves}:${r.ticks}`
  return `cleared:${starCount(starMask(stars(r, def)))}:${r.moves}:${r.ticks}`
}

export function resultLines(r: RunResult, def: LevelDef): { stat: string; tip: string | null } {
  const stat = `${formatMoves(r.moves)} · ${formatSecs(r.ticks)}`
  const p = def.par
  let tip: string | null = null
  // 젬을 다 먹은 판: 별은 판마다 누적되므로 젬 별은 이미 저장됨 — par는 "다음 판" 과제로 안내한다
  const gemSaved = r.gemTotal > 0 && r.gems >= r.gemTotal
  if (p && r.moves > p.moves) tip = gemSaved ? `Gem star saved — par is ${formatMoves(p.moves)}, chase it in a fresh run` : `par is ${formatMoves(p.moves)} — try fewer`
  else if (p && r.ticks > parTicks(p.secs)) tip = gemSaved ? `Gem star saved — par is ${p.secs.toFixed(1)}s, chase it in a fresh run` : `par ${p.secs.toFixed(1)}s — ${formatSecs(r.ticks - parTicks(p.secs))} to find. Try another path`
  else if (r.gemTotal > 0 && r.gems < r.gemTotal) tip = r.gemTotal - r.gems === 1 ? 'Missed a gem' : `Missed ${r.gemTotal - r.gems} gems`
  return { stat, tip }
}

export function clearKind(o: { firstClear: boolean; newBest: boolean }): 'full' | 'short' {
  return o.firstClear || o.newBest ? 'full' : 'short'
}
