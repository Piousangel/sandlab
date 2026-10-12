import { defineLevel } from '../../level/define'
import { W1_LEGEND, frame } from '../draw'

export default defineLevel({
  id: '1-7', v: 1, world: 1, name: 'Two Taps', salt: 0x1a07,
  legend: W1_LEGEND,
  map: frame((c) => {
    c.tile(8, 20, 4, 1, 'T').tile(8, 21, 4, 1, 'H')
    c.tile(7, 19, 1, 3, '#').tile(12, 19, 1, 3, '#').tile(7, 19, 6, 1, '#')
    c.tile(7, 30, 1, 10, '#')
    c.tile(16, 16, 2, 1, 'S').tile(16, 17, 2, 1, 'G')
    c.tile(15, 15, 1, 3, '#').tile(18, 15, 1, 3, '#').tile(15, 15, 4, 1, '#')
    c.tile(1, 40, 23, 19, '#')
    c.tile(16, 40, 2, 3, '.')
    c.tile(32, 40, 7, 19, '#').tile(24, 51, 8, 8, '#')
  }),
  spouts: { s1: { mat: 'sand', rate: 2, total: 96 }, s2: { mat: 'water', rate: 4, total: 800 } },
  targets: [
    { id: 'pot', kind: 'fill', rect: [24, 47, 8, 4], mat: 'water', need: 250 },
    { id: 'skull', kind: 'bad', rect: [16, 40, 2, 3], mat: 'water', need: 16 },
  ],
  gems: [],
  verbs: { dig: null, trigger: ['g1', 'g2'] },
  gateWindows: { g2: { after: 'g1', from: 20 } },
  legalTiles: 'auto',
  par: { moves: 2, secs: 7.3 },
  dev: [[30, 'trigger', 0, 0, 0, 0, 'g1'], [60, 'trigger', 0, 0, 0, 0, 'g2']],
  hint: 'Sand first, then water.',
})
