import { defineLevel } from '../../level/define'
import { W2_LEGEND, frame } from '../draw'

// 불은 위로 뜨고 약 6타일에서 꺼진다. 판자 마개 바로 아래에서 붙여야 한다.
export default defineLevel({
  id: '2-1', v: 1, world: 2, name: 'Wooden Door', salt: 0x2a01,
  legend: W2_LEGEND,
  map: frame((c) => {
    c.tile(2, 6, 1, 38, '#').tile(17, 6, 1, 38, '#')
    c.tile(3, 6, 14, 7, 'w')
    c.tile(3, 13, 14, 1, '#')
    c.tile(8, 13, 4, 1, 'p')
    c.tile(3, 44, 14, 1, '#')
  }),
  targets: [{ id: 'pot', kind: 'fill', rect: [3, 40, 14, 4], mat: 'water', need: 300 }],
  gems: [],
  verbs: { drop: { kind: 'spark', charges: 1 } },
  legalTiles: 'auto',
  par: { moves: 1, secs: 5.2 },
  dev: [[0, 'drop', 9, 14, 9, 14, 'spark']],
  hint: 'Fire rises. Light the wood from below.',
})
