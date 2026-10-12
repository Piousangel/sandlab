import { defineLevel } from '../../level/define'
import { W1_LEGEND, frame } from '../draw'

export default defineLevel({
  id: '1-2', v: 1, world: 1, name: 'Detour', salt: 0x1a02,
  legend: W1_LEGEND,
  map: frame((c) => {
    c.tile(2, 1, 1, 12, '#').tile(15, 1, 1, 12, '#')
    c.tile(3, 3, 12, 7, 'w')
    c.tile(3, 10, 12, 2, 'd')
    c.tile(1, 20, 30, 39, '#')
    c.tile(7, 20, 6, 1, '.').tile(13, 20, 6, 2, '.').tile(19, 20, 6, 3, '.').tile(25, 20, 6, 4, '.')
    c.tile(2, 20, 3, 2, '.')
  }),
  targets: [{ id: 'pot', kind: 'fill', rect: [31, 52, 8, 6], mat: 'water', need: 300 }],
  gems: [{ rect: [2, 20, 2, 2], mat: 'water' }],
  verbs: { dig: { maxLen: 4 }, trigger: null },
  legalTiles: 'auto',
  par: { moves: 1, secs: 8.9 },
  dev: [[0, 'dig', 14, 9, 14, 12]],
  hint: 'Let it run along the ledge.',
})
