import type { Level } from '../types'
import { drag } from './helpers'

export const stopTheFlow: Level = {
  v: 1,
  id: 'stop-the-flow',
  title: 'Stop the flow',
  blurb:
    'Lava is leaking through a hole in the floor above two wooden huts. Lava sets wood alight on contact and is not cooled by it, so the huts will not last long under that stream. Ice is the answer: it stays exactly where you paint it, and lava that touches it hardens into stone. Plug the stream with ice and keep at least 70 percent of the village standing until the reservoir runs dry.',
  hint: 'Paint a thick shelf of ice right under the hole, not on the huts. The stone that forms there becomes your plug.',
  paintArea: { x: 520, y: 308, w: 260, h: 160 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 500, y: 300, w: 140, h: 8 },
    { kind: 'rect', mat: 'wall', x: 660, y: 300, w: 140, h: 8 },
    { kind: 'rect', mat: 'wall', x: 500, y: 180, w: 8, h: 120 },
    { kind: 'rect', mat: 'wall', x: 792, y: 180, w: 8, h: 120 },
    { kind: 'rect', mat: 'lava', x: 508, y: 220, w: 284, h: 80 },
    { kind: 'rect', mat: 'wood', x: 590, y: 540, w: 50, h: 60 },
    { kind: 'rect', mat: 'wood', x: 660, y: 540, w: 50, h: 60 },
  ],
  palette: { ice: 9000 },
  goals: [
    { type: 'protect', zone: { x: 580, y: 520, w: 140, h: 80 }, mat: 'wood', min: 0.7 },
    { type: 'survive', ticks: 1800 },
  ],
  stars: [4000, 6500],
  solution: [drag(0, 'ice', 8, 610, 316, 690, 316, 30), drag(30, 'ice', 8, 610, 330, 690, 330, 30)],
}
