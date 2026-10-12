import { defineLevel } from '../../level/define'
import { W1_LEGEND, frame } from '../draw'

export default defineLevel({
  id: '1-4', v: 1, world: 1, name: 'Hourglass', salt: 0x1a04,
  legend: W1_LEGEND,
  map: frame((c) => {
    c.tile(4, 6, 1, 8, '#').tile(35, 6, 1, 8, '#')
    c.tile(5, 9, 30, 3, 's')
    c.tile(5, 12, 30, 2, 'd')
    c.tile(1, 40, 3, 19, '#').tile(36, 40, 3, 19, '#')
  }),
  targets: [{ id: 'pot', kind: 'fill', rect: [4, 54, 32, 4], mat: 'sand', need: 180 }],
  gems: [{ rect: [4, 56, 2, 2], mat: 'sand' }],
  verbs: { dig: { maxLen: 4 }, trigger: null },
  legalTiles: 'auto',
  par: { moves: 2, secs: 6.1 },
  dev: [[0, 'dig', 10, 11, 10, 14], [0, 'dig', 26, 11, 26, 14]],
  hint: 'Sand piles up. Open more than one hole.',
})
