import { defineLevel } from '../../level/define'
import { W2_LEGEND, frame } from '../draw'

// 불 없음. 판자는 고체라 물을 받친다 — 선반 끝에서 구덩이를 건너는 다리를 놓는다.
export default defineLevel({
  id: '2-3', v: 1, world: 2, name: 'Plank Bridge', salt: 0x2a03,
  legend: W2_LEGEND,
  map: frame((c) => {
    c.tile(1, 1, 38, 8, '#')
    c.tile(1, 10, 13, 8, 'w')
    c.tile(17, 45, 8, 14, '#')
    c.tile(1, 18, 16, 41, '#')
    c.tile(25, 20, 14, 39, '#')
    c.tile(28, 20, 7, 8, '.')
  }),
  targets: [{ id: 'pot', kind: 'fill', rect: [28, 23, 7, 4], mat: 'water', need: 250 }],
  gems: [],
  verbs: { line: { mat: 'plank', maxLen: 10, charges: 1 } },
  legalTiles: 'auto',
  par: { moves: 1, secs: 4.6 },
  dev: [[0, 'line', 17, 19, 24, 19, 'plank']],
  hint: 'Water cannot jump. Build it a floor.',
})
