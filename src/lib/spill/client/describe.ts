import type { LevelDef, TargetDef } from '../level/define'
import { parseLevel } from '../level/parse'
import { MATS, M } from '../sim/materials'
import { formatMoves } from '../play/score'

export interface LevelDescription {
  summary: string
  goals: string[]
  warnings: string[]
  verbs: string[]
  materials: string[]
  par: string | null
}

const STATIC_HIDDEN = new Set<number>([M.empty, M.wall, M.spout, M.vent])

export function goalText(t: TargetDef): string {
  const mat = t.mat ?? ''
  switch (t.kind) {
    case 'fill': return `Fill the pot with ${t.need ?? 1} cells of ${mat}`
    case 'ignite': return 'Light the torch'
    case 'reach': return `Ring the bell with ${mat && mat !== 'empty' ? mat : 'steam'}`
    case 'protect': return `Keep the crate intact for ${((t.holdTicks ?? 0) / 60).toFixed(1)}s`
    case 'bad': return `Keep ${mat} out of the skull pot`
  }
}

export function verbText(def: LevelDef): string[] {
  const v = def.verbs ?? {}
  const out: string[] = []
  if (v.dig) out.push(`Dig: drag a straight line through dirt, up to ${v.dig.maxLen} tiles long`)
  if (v.drop) out.push(`Drop: tap to place ${v.drop.kind} on an empty spot (${v.drop.charges} ${v.drop.charges === 1 ? 'charge' : 'charges'})`)
  if (v.line) out.push(`Line: drag to lay ${v.line.mat} across empty space, up to ${v.line.maxLen} tiles`)
  if (v.trigger && v.trigger.length) out.push(`Trigger: tap a gate while the level runs (or is paused) to open it`)
  return out
}

function materialsOf(def: LevelDef): string[] {
  try {
    const p = parseLevel(def)
    const seen = new Set<number>()
    for (let i = 0; i < p.mat.length; i++) seen.add(p.mat[i])
    for (const s of p.spouts) seen.add(s.mat)
    return [...seen].filter((m) => !STATIC_HIDDEN.has(m)).sort((a, b) => a - b).map((m) => MATS[m].slug)
  } catch {
    return []
  }
}

export function describeLevel(def: LevelDef): LevelDescription {
  const goals = def.targets.filter((t) => t.kind !== 'bad').map(goalText)
  const warnings = def.targets.filter((t) => t.kind === 'bad').map(goalText)
  const verbs = verbText(def)
  const materials = materialsOf(def)
  const par = def.par ? `Par: ${formatMoves(def.par.moves)} in ${def.par.secs.toFixed(1)}s` : null
  const gems = def.gems?.length ?? 0
  const lines = [
    `${def.id} ${def.name} is a falling-sand physics puzzle in Sandlab Spill, world ${def.world}.`,
    `${goals.join('. ')}${goals.length ? '.' : ''}`,
    warnings.length ? `${warnings.join('. ')}.` : '',
    materials.length ? `The scene is built from ${materials.join(', ')}.` : '',
    `Plan your moves while the scene is frozen, then press Run and watch the materials do the work. Every action counts as one move, Undo is free before you run, and Retry keeps your placements.`,
    gems ? `Collect ${gems === 1 ? 'the gem' : `all ${gems} gems`} for the second star.` : '',
    par ? `${par} earns the third star.` : '',
  ]
  return { summary: lines.filter(Boolean).join(' '), goals, warnings, verbs, materials, par }
}
