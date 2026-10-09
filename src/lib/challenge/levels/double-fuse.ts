import type { Level } from '../types'
import { drag } from './helpers'

export const doubleFuse: Level = {
  v: 1,
  id: 'double-fuse',
  title: 'Double fuse',
  blurb:
    'The lava pit is in the middle this time, with a woodpile at each end of the room. Gunpowder carries fire faster than anything else, but only along an unbroken line: a fire running one way does not turn around. Lay two fuses out from the lava and burn both woodpiles.',
  hint: 'Start both lines over the lava pit, one heading left and one heading right, and make sure each one ends on top of its woodpile.',
  paintArea: { x: 140, y: 380, w: 920, h: 130 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 100, y: 520, w: 460, h: 8 },
    { kind: 'rect', mat: 'wall', x: 640, y: 520, w: 460, h: 8 },
    { kind: 'rect', mat: 'wall', x: 552, y: 520, w: 8, h: 48 },
    { kind: 'rect', mat: 'wall', x: 640, y: 520, w: 8, h: 48 },
    { kind: 'rect', mat: 'wall', x: 552, y: 560, w: 96, h: 8 },
    { kind: 'rect', mat: 'lava', x: 560, y: 528, w: 80, h: 32 },
    { kind: 'rect', mat: 'wood', x: 160, y: 480, w: 40, h: 40 },
    { kind: 'rect', mat: 'wood', x: 1000, y: 480, w: 40, h: 40 },
  ],
  palette: { gunpowder: 14000 },
  goals: [
    { type: 'clear', zone: { x: 150, y: 460, w: 60, h: 60 }, mat: 'wood', max: 20 },
    { type: 'clear', zone: { x: 990, y: 460, w: 60, h: 60 }, mat: 'wood', max: 20 },
  ],
  stars: [10000, 12500],
  solution: [drag(0, 'gunpowder', 4, 600, 470, 1020, 470, 220), drag(220, 'gunpowder', 4, 600, 470, 180, 470, 220)],
}
