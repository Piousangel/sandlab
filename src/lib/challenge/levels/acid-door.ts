import type { Level } from '../types'
import { hold } from './helpers'

export const acidDoor: Level = {
  v: 1,
  id: 'acid-door',
  title: 'The acid door',
  blurb:
    'The funnel ends in a metal plate, and the chamber you need to reach is underneath it. Acid eats metal one cell at a time and is not used up while it does, so a small pool of acid on the plate will cut a hole all by itself. The walls are made of wall, which nothing in Sandlab can dissolve, so the acid has only one way to go.',
  hint: 'A little acid goes a long way. Pour a small pool onto the plate and wait for it to eat through.',
  paintArea: { x: 536, y: 120, w: 128, h: 200 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 520, y: 200, w: 8, h: 360 },
    { kind: 'rect', mat: 'wall', x: 672, y: 200, w: 8, h: 360 },
    { kind: 'rect', mat: 'metal', x: 528, y: 392, w: 144, h: 8 },
    { kind: 'rect', mat: 'wall', x: 520, y: 560, w: 160, h: 8 },
  ],
  palette: { acid: 6000 },
  goals: [{ type: 'reach', zone: { x: 528, y: 480, w: 144, h: 80 }, mat: 'acid' }],
  stars: [1900, 3200],
  solution: [hold(0, 'acid', 6, 600, 250, 200)],
}
