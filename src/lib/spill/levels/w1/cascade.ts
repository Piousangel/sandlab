import { defineLevel } from '../../level/define'
import { W1_LEGEND, frame } from '../draw'

export default defineLevel({
  id: '1-8', v: 1, world: 1, name: 'Cascade', salt: 0x1a08,
  legend: W1_LEGEND,
  map: frame((c) => {
    c.tile(8, 2, 1, 15, '#')
    c.tile(1, 4, 7, 10, 'w')
    c.tile(1, 14, 7, 1, 'G')
    c.tile(1, 20, 8, 39, '#').tile(9, 26, 7, 33, '#').tile(16, 32, 7, 27, '#').tile(23, 38, 7, 21, '#').tile(30, 44, 9, 15, '#')
    c.tile(8, 17, 1, 3, 'd')
    c.tile(11, 26, 4, 3, '.')
    c.tile(22, 22, 1, 7, '#').tile(22, 29, 1, 3, 'd')
    c.tile(25, 38, 2, 3, '.')
    c.tile(25, 26, 2, 1, 'S').tile(25, 27, 2, 1, 'H')
    c.tile(24, 25, 1, 3, '#').tile(27, 25, 1, 3, '#').tile(24, 25, 4, 1, '#')
    c.tile(32, 44, 6, 4, '.')
    c.tile(3, 20, 2, 1, 'd').tile(3, 21, 2, 2, '.')
    c.tile(16, 32, 2, 3, '.')
    c.tile(19, 32, 2, 1, 'd').tile(19, 33, 2, 2, '.')
    c.tile(34, 48, 2, 1, 'd').tile(34, 49, 2, 2, '.')
  }),
  spouts: { s1: { mat: 'sand', rate: 2, total: 96 } },
  targets: [
    { id: 'a', kind: 'fill', rect: [11, 26, 4, 3], mat: 'water', need: 150 },
    { id: 'b', kind: 'fill', rect: [16, 32, 2, 3], mat: 'water', need: 80 },
    { id: 'c', kind: 'fill', rect: [32, 44, 6, 4], mat: 'water', need: 250 },
    { id: 'skull', kind: 'bad', rect: [25, 38, 2, 3], mat: 'water', need: 16 },
  ],
  gems: [
    { rect: [3, 21, 2, 2], mat: 'water' },
    { rect: [19, 33, 2, 2], mat: 'water' },
    { rect: [34, 49, 2, 2], mat: 'water' },
  ],
  verbs: { dig: { maxLen: 4 }, trigger: ['g1', 'g2'] },
  legalTiles: 'auto',
  par: { moves: 4, secs: 7.9 },
  dev: [[0, 'dig', 8, 16, 8, 19], [0, 'dig', 22, 28, 22, 31], [0, 'trigger', 0, 0, 0, 0, 'g2'], [0, 'trigger', 0, 0, 0, 0, 'g1']],
  hint: 'Plug the pit, then let it all flow.',
})
