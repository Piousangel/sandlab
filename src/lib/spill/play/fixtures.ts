import { defineLevel, type LevelDef } from '../level/define'
import { MapCanvas } from '../level/mapcanvas'

const LEGEND = {
  '.': 'empty', '#': 'wall', d: 'dirt', s: 'sand', w: 'water', c: 'crate', G: 'gate:g1', H: 'gate:g2', S: 'spout:s1',
}

function draw(f: (c: MapCanvas) => void): string {
  const c = new MapCanvas()
  c.box(0, 0, 80, 120, '#')
  f(c)
  return c.toString()
}

const potMap = (floor: (c: MapCanvas) => void) => draw((c) => {
  c.rect(20, 1, 32, 30, 'w')
  c.rect(1, 31, 78, 4, 'd')
  floor(c)
  c.rect(29, 95, 1, 24, '#')
  c.rect(42, 95, 1, 24, '#')
})

export const POT_LEVEL: LevelDef = defineLevel({
  id: 't-pot', v: 1, world: 0, name: 'Test Pot', salt: 0x51a7,
  legend: LEGEND,
  map: potMap(() => {}),
  targets: [{ id: 'pot', kind: 'fill', rect: [15, 48, 6, 11], mat: 'water', need: 400 }],
  gems: [{ rect: [17, 30, 2, 2], mat: 'water' }],
  verbs: { dig: { maxLen: 6 }, trigger: null },
  legalTiles: 'auto',
  par: { moves: 1, secs: 4 },
  dev: [[0, 'dig', 18, 15, 18, 17]],
  hint: 'Dig straight down.',
})

export const GATE_LEVEL: LevelDef = defineLevel({
  id: 't-gate', v: 1, world: 0, name: 'Test Gate', salt: 0x6a7e,
  legend: LEGEND,
  map: potMap((c) => c.rect(34, 31, 4, 4, 'G').rect(10, 31, 4, 4, 'H')),
  targets: [{ id: 'pot', kind: 'fill', rect: [15, 48, 6, 11], mat: 'water', need: 400 }],
  gems: [],
  verbs: { dig: { maxLen: 6 }, trigger: ['g1', 'g2'] },
  legalTiles: 'auto',
  par: { moves: 1, secs: 5 },
  dev: [[30, 'trigger', 0, 0, 0, 0, 'g1']],
})

export const BAD_LEVEL: LevelDef = defineLevel({
  ...POT_LEVEL,
  id: 't-bad',
  targets: [
    { id: 'far', kind: 'fill', rect: [2, 50, 4, 4], mat: 'water', need: 400 },
    { id: 'skull', kind: 'bad', rect: [15, 48, 6, 11], mat: 'water', need: 20 },
  ],
  gems: [],
  dev: [[0, 'dig', 18, 15, 18, 17]],
})

export const PROTECT_LEVEL: LevelDef = defineLevel({
  ...POT_LEVEL,
  id: 't-protect',
  map: draw((c) => {
    c.rect(20, 1, 32, 30, 'w')
    c.rect(1, 31, 78, 4, 'd')
    c.rect(4, 110, 4, 4, 'c')
  }),
  targets: [{ id: 'box', kind: 'protect', rect: [2, 55, 2, 2], holdTicks: 30 }],
  gems: [],
  dev: [],
})
