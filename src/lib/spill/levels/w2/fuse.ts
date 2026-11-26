import { defineLevel } from '../../level/define'
import { W2_LEGEND, frame } from '../draw'

// 불꽃은 1개, 판자 문은 2개. 불꽃은 위로만 뜨지만 도화선은 옆으로 불을 옮긴다.
export default defineLevel({
  id: '2-2', v: 1, world: 2, name: 'Fuse', salt: 0x2a02,
  legend: W2_LEGEND,
  map: frame((c) => {
    c.tile(1, 1, 38, 58, '#')
    c.tile(3, 6, 13, 7, 'w').tile(24, 6, 13, 7, 'w')
    c.tile(12, 13, 4, 1, 'p').tile(24, 13, 4, 1, 'p')
    c.tile(10, 14, 20, 3, '.')
    c.tile(12, 17, 4, 12, '.').tile(24, 17, 4, 12, '.')
    c.tile(9, 29, 10, 6, '.').tile(21, 29, 10, 6, '.')
  }),
  targets: [
    { id: 'left', kind: 'fill', rect: [9, 31, 10, 4], mat: 'water', need: 250 },
    { id: 'right', kind: 'fill', rect: [21, 31, 10, 4], mat: 'water', need: 250 },
  ],
  gems: [],
  verbs: { drop: { kind: 'spark', charges: 1 }, line: { mat: 'fuse', maxLen: 12, charges: 1 } },
  legalTiles: 'auto',
  par: { moves: 2, secs: 5.1 },
  dev: [[0, 'line', 14, 14, 25, 14, 'fuse'], [0, 'drop', 19, 15, 19, 15, 'spark']],
  hint: 'One spark, two doors. Give the fire a road.',
})
