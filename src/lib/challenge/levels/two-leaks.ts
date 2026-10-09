import type { Level } from '../types'
import { drag } from './helpers'

export const twoLeaks: Level = {
  v: 1,
  id: 'two-leaks',
  title: 'Two leaks',
  blurb:
    'The reservoir above the village is plugged with wood, and the lava is burning through both plugs. Once they give way, a stream of lava will fall from each hole toward a wooden hut. Ice stays where you paint it, and lava that touches ice hardens into stone, so a shelf of ice under a hole turns into a stone plug. Plug both leaks and keep at least 70 percent of the village standing until the lava stops.',
  hint: 'Deal with one leak completely, then the other. A thin shelf melts through; two strokes of ice under each hole hold.',
  paintArea: { x: 520, y: 308, w: 260, h: 160 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 500, y: 300, w: 80, h: 8 },
    { kind: 'rect', mat: 'wall', x: 600, y: 300, w: 100, h: 8 },
    { kind: 'rect', mat: 'wall', x: 720, y: 300, w: 80, h: 8 },
    { kind: 'rect', mat: 'wall', x: 500, y: 180, w: 8, h: 120 },
    { kind: 'rect', mat: 'wall', x: 792, y: 180, w: 8, h: 120 },
    { kind: 'rect', mat: 'lava', x: 508, y: 220, w: 284, h: 80 },
    { kind: 'rect', mat: 'wood', x: 580, y: 300, w: 20, h: 8 },
    { kind: 'rect', mat: 'wood', x: 700, y: 300, w: 20, h: 8 },
    { kind: 'rect', mat: 'wood', x: 565, y: 540, w: 50, h: 60 },
    { kind: 'rect', mat: 'wood', x: 685, y: 540, w: 50, h: 60 },
  ],
  palette: { ice: 12000 },
  goals: [
    { type: 'protect', zone: { x: 555, y: 520, w: 190, h: 80 }, mat: 'wood', min: 0.7 },
    { type: 'survive', ticks: 1800 },
  ],
  stars: [10500, 11800],
  solution: [
    drag(0, 'ice', 10, 560, 318, 620, 318, 20), drag(20, 'ice', 10, 680, 318, 740, 318, 20),
    drag(40, 'ice', 10, 560, 334, 620, 334, 20), drag(60, 'ice', 10, 680, 334, 740, 334, 20),
    drag(80, 'ice', 10, 560, 350, 620, 350, 20), drag(100, 'ice', 10, 680, 350, 740, 350, 20),
  ],
}
