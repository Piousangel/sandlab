import type { Level } from '../types'
import { hold } from './helpers'

export const fillCup: Level = {
  v: 1,
  id: 'fill-cup',
  title: 'Fill the cup',
  blurb:
    'The first level is about how liquids behave. Water poured from above falls, spreads sideways until it is flat, and fills a container from the bottom up. Pour water into the cup until the lower part of it is at least 80 percent full. Water that misses the cup or splashes over the rim still counts as ink, so aim before you pour.',
  hint: 'Hold the brush still above the middle of the cup. Water finds its own level, so you do not need to move.',
  paintArea: { x: 450, y: 40, w: 300, h: 180 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 520, y: 380, w: 8, h: 188 },
    { kind: 'rect', mat: 'wall', x: 672, y: 380, w: 8, h: 188 },
    { kind: 'rect', mat: 'wall', x: 520, y: 560, w: 160, h: 8 },
  ],
  palette: { water: 16000 },
  goals: [{ type: 'fill', zone: { x: 528, y: 480, w: 144, h: 80 }, mat: 'water', min: 0.8 }],
  stars: [11000, 13500],
  solution: [hold(0, 'water', 8, 600, 120, 900)],
}
