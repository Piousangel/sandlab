import type { Level } from '../types'
import { drag } from './helpers'

export const saltAndSand: Level = {
  v: 1,
  id: 'salt-and-sand',
  title: 'Sort the salt',
  blurb:
    'The basin holds a layer of salt on top of a layer of sand, and they look almost alike. Water tells them apart: salt touching water dissolves away, while sand does not react with water at all. Wash out every grain of salt and leave at least 80 percent of the sand where it is.',
  hint: 'Sweep water over the whole basin. The water sinks through the salt and keeps dissolving it until only sand is left.',
  paintArea: { x: 538, y: 300, w: 124, h: 100 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 530, y: 400, w: 8, h: 168 },
    { kind: 'rect', mat: 'wall', x: 662, y: 400, w: 8, h: 168 },
    { kind: 'rect', mat: 'wall', x: 530, y: 560, w: 140, h: 8 },
    { kind: 'rect', mat: 'sand', x: 538, y: 530, w: 124, h: 30 },
    { kind: 'rect', mat: 'salt', x: 538, y: 500, w: 124, h: 30 },
  ],
  palette: { water: 10000 },
  goals: [
    { type: 'clear', zone: { x: 538, y: 400, w: 124, h: 160 }, mat: 'salt' },
    { type: 'protect', zone: { x: 538, y: 400, w: 124, h: 160 }, mat: 'sand', min: 0.8 },
  ],
  stars: [7000, 8500],
  solution: [drag(0, 'water', 8, 548, 340, 652, 340, 120), drag(120, 'water', 8, 652, 340, 548, 340, 120), drag(240, 'water', 8, 548, 340, 652, 340, 120)],
}
