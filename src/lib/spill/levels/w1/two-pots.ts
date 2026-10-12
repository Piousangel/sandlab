import { defineLevel } from '../../level/define'
import { W1_LEGEND, frame } from '../draw'

export default defineLevel({
  id: '1-3', v: 1, world: 1, name: 'Two Pots', salt: 0x1a03,
  legend: W1_LEGEND,
  map: frame((c) => {
    c.tile(7, 1, 1, 13, '#').tile(32, 1, 1, 13, '#')
    c.tile(8, 7, 24, 4, 'w')
    c.tile(8, 11, 24, 2, '#')
    c.tile(9, 11, 3, 2, 'd').tile(28, 11, 3, 2, 'd').tile(19, 11, 2, 2, 'd')
    c.tile(18, 13, 1, 4, '#').tile(21, 13, 1, 4, '#').tile(18, 17, 4, 1, '#')
    c.tile(1, 46, 38, 13, '#')
    c.tile(3, 46, 10, 12, '.').tile(27, 46, 10, 12, '.')
  }),
  targets: [
    { id: 'left', kind: 'fill', rect: [3, 54, 10, 4], mat: 'water', need: 300 },
    { id: 'right', kind: 'fill', rect: [27, 54, 10, 4], mat: 'water', need: 300 },
  ],
  gems: [{ rect: [19, 14, 2, 2], mat: 'water' }],
  verbs: { dig: { maxLen: 4 }, trigger: null },
  legalTiles: 'auto',
  par: { moves: 2, secs: 5.3 },
  dev: [[0, 'dig', 9, 9, 9, 12], [0, 'dig', 29, 10, 29, 13]],
  hint: 'One stream per pot.',
})
