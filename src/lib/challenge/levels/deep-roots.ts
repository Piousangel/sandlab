import type { Level } from '../types'
import { hold } from './helpers'

export const deepRoots: Level = {
  v: 1,
  id: 'deep-roots',
  title: 'Deep roots',
  blurb:
    'This tank is taller than the last one and holds less water, so there is a long way to go before seeds can sprout high enough. Seeds sink through water but sprout within moments of touching it, and a plant only exists where there was water to turn into it. Raise the water level into the marked band, then seed the surface.',
  hint: 'Most of your effort goes into the water. Watch the level climb, and only switch to seeds once the surface is inside the band.',
  paintArea: { x: 568, y: 40, w: 64, h: 120 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 560, y: 180, w: 8, h: 388 },
    { kind: 'rect', mat: 'wall', x: 632, y: 180, w: 8, h: 388 },
    { kind: 'rect', mat: 'wall', x: 560, y: 560, w: 80, h: 8 },
    { kind: 'rect', mat: 'water', x: 568, y: 470, w: 64, h: 90 },
  ],
  palette: { water: 16000, seed: 1500 },
  goals: [{ type: 'reach', zone: { x: 568, y: 290, w: 64, h: 40 }, mat: 'plant' }],
  stars: [12800, 15000],
  solution: [hold(0, 'water', 6, 600, 100, 1500), hold(1700, 'seed', 3, 600, 100, 60)],
}
