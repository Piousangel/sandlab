import type { Level } from '../types'
import { hold } from './helpers'

export const growUp: Level = {
  v: 1,
  id: 'grow-up',
  title: 'Grow up',
  blurb:
    'Plants only grow where there is water. A seed that touches water sprouts into a plant cell, and plant slowly turns the water around it into more plant. The tank is half full, and the marked band is above the waterline. Raise the water into the band first, then drop seeds onto the surface so they sprout high enough to count.',
  hint: 'Seeds sink, but they sprout within moments of touching water. Fill the tank up to the band before you sprinkle any seeds.',
  paintArea: { x: 568, y: 60, w: 64, h: 130 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 560, y: 200, w: 8, h: 368 },
    { kind: 'rect', mat: 'wall', x: 632, y: 200, w: 8, h: 368 },
    { kind: 'rect', mat: 'wall', x: 560, y: 560, w: 80, h: 8 },
    { kind: 'rect', mat: 'water', x: 568, y: 400, w: 64, h: 160 },
  ],
  palette: { water: 9000, seed: 1500 },
  goals: [{ type: 'reach', zone: { x: 568, y: 300, w: 64, h: 40 }, mat: 'plant' }],
  stars: [5500, 8000],
  solution: [hold(0, 'water', 6, 600, 120, 500), hold(700, 'seed', 3, 600, 120, 60)],
}
