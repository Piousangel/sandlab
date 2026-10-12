import { defineLevel } from '../../level/define'
import { W1_LEGEND, frame } from '../draw'

export default defineLevel({
  id: '1-6', v: 1, world: 1, name: 'Displacement', salt: 0x1a06,
  legend: W1_LEGEND,
  map: frame((c) => {
    c.tile(15, 6, 1, 16, '#').tile(24, 6, 1, 16, '#')
    c.tile(16, 12, 8, 9, 's')
    c.tile(16, 21, 8, 1, 'd')
    c.tile(17, 30, 1, 17, '#').tile(22, 38, 1, 21, '#').tile(17, 46, 5, 1, '#')
    c.tile(18, 39, 4, 7, 'w')
    c.tile(31, 44, 1, 15, '#')
  }),
  targets: [{ id: 'pot', kind: 'fill', rect: [23, 54, 8, 4], mat: 'water', need: 150 }],
  gems: [],
  verbs: { dig: { maxLen: 4 }, trigger: null },
  legalTiles: 'auto',
  par: { moves: 1, secs: 6.3 },
  dev: [[0, 'dig', 17, 21, 20, 21]],
  hint: 'Sand sinks. Water rises.',
})
