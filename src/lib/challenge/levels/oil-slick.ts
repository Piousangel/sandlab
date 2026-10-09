import type { Level } from '../types'
import { drag, hold } from './helpers'

export const oilSlick: Level = {
  v: 1,
  id: 'oil-slick',
  title: 'Fire across water',
  blurb:
    'Water is a firebreak: flames cannot spread across it. Oil changes that. Oil is lighter than water, so it floats in a thin film on top, and fire spreads through oil quickly. Lay an unbroken slick across the pond, then light the near end with a little fire so the flames race over the water and burn the woodpile hanging over the far edge.',
  hint: 'Lay the whole slick first and light it last. If you light it while it is still being poured, the fire runs out of fuel halfway.',
  paintArea: { x: 210, y: 300, w: 770, h: 182 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 200, y: 430, w: 8, h: 138 },
    { kind: 'rect', mat: 'wall', x: 200, y: 560, w: 800, h: 8 },
    { kind: 'rect', mat: 'water', x: 208, y: 480, w: 784, h: 80 },
    { kind: 'rect', mat: 'wall', x: 992, y: 476, w: 108, h: 124 },
    { kind: 'rect', mat: 'wood', x: 980, y: 440, w: 50, h: 36 },
  ],
  palette: { oil: 11000, fire: 600 },
  goals: [{ type: 'clear', zone: { x: 975, y: 430, w: 65, h: 50 }, mat: 'wood' }],
  stars: [9000, 10500],
  solution: [drag(0, 'oil', 5, 220, 420, 970, 420, 400), hold(560, 'fire', 4, 230, 474, 20)],
}
