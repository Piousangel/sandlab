import type { Level } from '../types'
import { drag } from './helpers'

export const oilSlick: Level = {
  v: 1,
  id: 'oil-slick',
  title: 'Fire across water',
  blurb:
    'Water is a firebreak: flames cannot spread across it. Oil changes that. Oil is lighter than water, so it floats in a thin film on top, and fire spreads through oil quickly. Lava on the left bank can light it. Lay a slick from the lava across the pond so the fire travels over the water and burns the woodpile hanging over the far edge.',
  hint: 'Start the slick on the lava so it catches, and keep the film unbroken all the way to the right bank.',
  paintArea: { x: 150, y: 300, w: 830, h: 170 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 100, y: 476, w: 108, h: 124 },
    { kind: 'rect', mat: 'wall', x: 142, y: 440, w: 8, h: 36 },
    { kind: 'rect', mat: 'lava', x: 150, y: 446, w: 50, h: 30 },
    { kind: 'rect', mat: 'wall', x: 200, y: 430, w: 8, h: 46 },
    { kind: 'rect', mat: 'wall', x: 208, y: 560, w: 784, h: 8 },
    { kind: 'rect', mat: 'water', x: 208, y: 480, w: 784, h: 80 },
    { kind: 'rect', mat: 'wall', x: 992, y: 476, w: 108, h: 124 },
    { kind: 'rect', mat: 'wood', x: 980, y: 440, w: 50, h: 36 },
  ],
  palette: { oil: 12000 },
  goals: [{ type: 'clear', zone: { x: 975, y: 430, w: 65, h: 50 }, mat: 'wood' }],
  stars: [6000, 9000],
  solution: [drag(0, 'oil', 5, 175, 420, 960, 420, 500)],
}
