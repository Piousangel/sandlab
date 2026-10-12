import { defineLevel } from '../../level/define'
import { W1_LEGEND, frame } from '../draw'

export default defineLevel({
  id: '1-5', v: 1, world: 1, name: 'Gatekeeper', salt: 0x1a05,
  legend: W1_LEGEND,
  map: frame((c) => {
    c.tile(7, 26, 1, 14, '#').tile(16, 26, 1, 11, '#')
    c.tile(8, 28, 8, 8, 'w')
    c.tile(8, 36, 8, 1, 'G')
    c.tile(18, 16, 2, 1, 'S')
    c.tile(1, 40, 38, 19, '#')
    c.tile(18, 40, 2, 3, '.')
    c.tile(25, 37, 1, 3, 'd')
    c.tile(27, 40, 8, 10, '.')
  }),
  spouts: { s1: { mat: 'sand', rate: 2, total: 96 } },
  targets: [
    { id: 'pot', kind: 'fill', rect: [27, 46, 8, 4], mat: 'water', need: 250 },
    { id: 'skull', kind: 'bad', rect: [18, 40, 2, 3], mat: 'water', need: 16 },
  ],
  gems: [],
  verbs: { dig: { maxLen: 4 }, trigger: ['g1'] },
  legalTiles: 'auto',
  par: { moves: 2, secs: 5.8 },
  dev: [[0, 'dig', 25, 36, 25, 39], [100, 'trigger', 0, 0, 0, 0, 'g1']],
  hint: 'Wait for the sand wall, then open the gate.',
})
