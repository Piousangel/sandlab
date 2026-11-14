import { defineLevel } from '../../level/define'
import { W1_LEGEND, frame } from '../draw'

export default defineLevel({
  id: '1-10', v: 1, world: 1, name: 'Twin Cups', salt: 0x1a0a,
  legend: W1_LEGEND,
  map: frame((c) => {
    c.tile(2, 6, 1, 16, '#').tile(37, 6, 1, 16, '#')
    c.tile(3, 12, 34, 9, 's')
    c.tile(3, 21, 34, 1, 'd')
    // cup A (left) overflows right into pot A; cup B mirrors it
    c.tile(3, 30, 1, 17, '#').tile(8, 38, 1, 21, '#').tile(3, 46, 6, 1, '#')
    c.tile(4, 39, 4, 7, 'w')
    c.tile(36, 30, 1, 17, '#').tile(31, 38, 1, 21, '#').tile(31, 46, 6, 1, '#')
    c.tile(32, 39, 4, 7, 'w')
    c.tile(15, 44, 10, 15, '#')
    c.tile(9, 54, 6, 5, '.').tile(25, 54, 6, 5, '.')
  }),
  targets: [
    { id: 'potA', kind: 'fill', rect: [9, 54, 6, 4], mat: 'water', need: 100 },
    { id: 'potB', kind: 'fill', rect: [25, 54, 6, 4], mat: 'water', need: 100 },
  ],
  gems: [],
  verbs: { dig: { maxLen: 4 }, trigger: null },
  legalTiles: 'auto',
  par: { moves: 2, secs: 5.5 },
  dev: [[0, 'dig', 4, 21, 7, 21], [0, 'dig', 32, 21, 35, 21]],
  hint: 'Sand sinks. Water rises. Two cups, two cuts.',
})
