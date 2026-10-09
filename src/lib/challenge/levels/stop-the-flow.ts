import type { Level } from '../types'
import { drag } from './helpers'

export const stopTheFlow: Level = {
  v: 1,
  id: 'stop-the-flow',
  title: 'Stop the flow',
  blurb:
    'Lava is pouring off the shelf and heading for two wooden huts. Lava sets wood alight on contact and is not cooled by it, so the huts will not survive a direct hit. Ice is the answer: it stays exactly where you paint it, and when lava reaches it the lava hardens into stone. Build an ice wall in the path and save at least 70 percent of the village until the flow is spent.',
  hint: 'Build the wall early and make it thick. Each bit of ice is used up as it turns lava into stone.',
  paintArea: { x: 420, y: 350, w: 300, h: 250 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 100, y: 300, w: 300, h: 8 },
    { kind: 'rect', mat: 'wall', x: 100, y: 200, w: 8, h: 100 },
    { kind: 'rect', mat: 'lava', x: 108, y: 240, w: 200, h: 60 },
    { kind: 'rect', mat: 'wood', x: 800, y: 540, w: 60, h: 60 },
    { kind: 'rect', mat: 'wood', x: 900, y: 540, w: 60, h: 60 },
  ],
  palette: { ice: 8000 },
  goals: [
    { type: 'protect', zone: { x: 780, y: 520, w: 200, h: 80 }, mat: 'wood', min: 0.7 },
    { type: 'survive', ticks: 1800 },
  ],
  stars: [3500, 5500],
  solution: [drag(0, 'ice', 6, 560, 590, 560, 470, 60), drag(60, 'ice', 6, 575, 590, 575, 470, 60), drag(120, 'ice', 6, 590, 590, 590, 470, 60)],
}
