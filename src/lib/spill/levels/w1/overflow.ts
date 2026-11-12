import { defineLevel } from '../../level/define'
import { W1_LEGEND, frame } from '../draw'

export default defineLevel({
  id: '1-9', v: 1, world: 1, name: 'Overflow', salt: 0x1a09,
  legend: W1_LEGEND,
  map: frame((c) => {
    c.tile(11, 6, 1, 16, '#').tile(32, 6, 1, 16, '#')
    c.tile(12, 12, 20, 9, 's')
    c.tile(12, 21, 20, 1, 'd')
    c.tile(13, 30, 1, 17, '#').tile(18, 38, 1, 21, '#').tile(13, 46, 6, 1, '#')
    c.tile(14, 39, 4, 7, 'w')
    c.tile(31, 44, 1, 15, '#')
    c.tile(19, 54, 12, 5, '.')
  }),
  targets: [{ id: 'pot', kind: 'fill', rect: [19, 54, 12, 4], mat: 'water', need: 150 }],
  gems: [],
  verbs: { dig: { maxLen: 4 }, trigger: null },
  legalTiles: 'auto',
  par: { moves: 1, secs: 6.3 },
  dev: [[0, 'dig', 13, 21, 16, 21]],
  hint: 'Sand sinks. Water rises. Mind where the sand lands.',
})
