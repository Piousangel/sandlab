import { defineLevel, type LevelDef } from '../level/define'
import { frame } from '../levels/draw'

const LEGEND = { '.': 'empty', '#': 'wall', d: 'dirt', w: 'water', G: 'gate:g1' }

const plugMap = (gate: boolean) => frame((c) => {
  c.tile(1, 1, 38, 20, '#')
  c.tile(16, 2, 8, 10, 'w')
  c.tile(16, 12, 8, 1, gate ? 'G' : 'w')
  c.tile(16, 13, 8, 1, gate ? '.' : 'w')
  c.tile(18, 14, 4, 2, 'd')
  c.tile(19, 16, 2, 5, '.')
  c.tile(14, 50, 1, 9, '#').tile(25, 50, 1, 9, '#')
})

export const PLUG_LEVEL: LevelDef = defineLevel({
  id: 'v-plug', v: 1, world: 0, name: 'Verify Plug', salt: 0x7e51,
  legend: LEGEND,
  map: plugMap(false),
  targets: [{ id: 'pot', kind: 'fill', rect: [15, 54, 10, 5], mat: 'water', need: 200 }],
  gems: [{ rect: [15, 52, 2, 2], mat: 'water' }],
  verbs: { dig: { maxLen: 2 }, trigger: null },
  legalTiles: 'auto',
  par: { moves: 1, secs: 9.9 },
  dev: [[0, 'dig', 19, 14, 19, 15]],
})

export const PLUG_GATE_LEVEL: LevelDef = defineLevel({
  ...PLUG_LEVEL,
  id: 'v-plug-gate',
  legend: LEGEND,
  map: plugMap(true),
  verbs: { dig: { maxLen: 2 }, trigger: ['g1'] },
  par: { moves: 2, secs: 9.9 },
  dev: [[0, 'dig', 19, 14, 19, 15], [30, 'trigger', 0, 0, 0, 0, 'g1']],
})
