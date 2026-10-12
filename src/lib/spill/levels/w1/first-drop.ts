import { defineLevel } from '../../level/define'
import { W1_LEGEND, frame } from '../draw'

export default defineLevel({
  id: '1-1', v: 1, world: 1, name: 'First Drop', salt: 0x1a01,
  legend: W1_LEGEND,
  map: frame((c) => {
    c.tile(9, 2, 1, 12, '#').tile(30, 2, 1, 12, '#')
    c.tile(10, 3, 20, 9, 'w')
    c.tile(10, 12, 20, 2, 'd')
    c.tile(1, 44, 22, 1, '#').tile(31, 44, 8, 1, '#')
    c.tile(23, 44, 1, 9, '#').tile(30, 44, 1, 9, '#').tile(23, 52, 8, 1, '#')
  }),
  targets: [{ id: 'pot', kind: 'fill', rect: [24, 48, 6, 4], mat: 'water', need: 300 }],
  gems: [{ rect: [2, 42, 2, 2], mat: 'water' }],
  verbs: { dig: { maxLen: 4 }, trigger: null },
  legalTiles: 'auto',
  par: { moves: 1, secs: 4.7 },
  dev: [[0, 'dig', 26, 11, 26, 14]],
  hint: 'Dig straight down.',
})
