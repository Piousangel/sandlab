import { defineLevel, type ActionTuple, type LevelDef } from '../level/define'
import { parseLevel, type ParsedLevel } from '../level/parse'
import type { PlayAction } from '../play/attempt'
import { W1_LEGEND, frame } from '../levels/draw'

export function splitLevel(def: LevelDef): { meta: string; map: string } {
  const rest: Partial<LevelDef> = { ...def }
  delete rest.map
  return { meta: JSON.stringify(rest, null, 2), map: def.map.trim() }
}

export type Joined = { ok: true; def: LevelDef; parsed: ParsedLevel } | { ok: false; error: string }

export function joinLevel(meta: string, map: string): Joined {
  let obj: unknown
  try {
    obj = JSON.parse(meta)
  } catch (e) {
    return { ok: false, error: `meta JSON: ${(e as Error).message}` }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'meta JSON: must be an object' }
  try {
    const def = defineLevel({ ...(obj as LevelDef), map: map.trim() })
    return { ok: true, def, parsed: parseLevel(def) }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export function devFromActions(actions: readonly PlayAction[]): ActionTuple[] {
  return actions.map((a) => (a.arg === undefined || a.verb === 'dig' ? [a.tick, a.verb, a.tx, a.ty, a.tx2, a.ty2] : [a.tick, a.verb, a.tx, a.ty, a.tx2, a.ty2, a.arg]))
}

export function withDev(def: LevelDef, dev: ActionTuple[]): LevelDef {
  return { ...def, dev }
}

export function withPar(def: LevelDef, moves: number, secs: number): LevelDef {
  return { ...def, par: { moves, secs } }
}

export function levelSource(def: LevelDef): string {
  const { meta, map } = splitLevel(def)
  const body = meta.replace(/^\{\n/, '').replace(/\n\}$/, '')
  return [
    "import { defineLevel } from '../../level/define'",
    '',
    'export default defineLevel({',
    body + ',',
    '  map: `',
    map,
    '`,',
    '})',
    '',
  ].join('\n')
}

export function blankLevel(): LevelDef {
  return defineLevel({
    id: 'new', v: 1, world: 1, name: 'New Level', salt: 0x1234,
    legend: W1_LEGEND,
    map: frame((c) => {
      c.tile(14, 4, 12, 6, 'w').tile(13, 3, 1, 9, '#').tile(26, 3, 1, 9, '#')
      c.tile(14, 10, 12, 2, 'd')
      c.tile(15, 50, 1, 9, '#').tile(24, 50, 1, 9, '#')
    }),
    targets: [{ id: 'pot', kind: 'fill', rect: [16, 54, 8, 4], mat: 'water', need: 200 }],
    gems: [],
    verbs: { dig: { maxLen: 4 }, trigger: null },
    legalTiles: 'auto',
    par: { moves: 1, secs: 9.9 },
    dev: [],
    hint: '',
  })
}
