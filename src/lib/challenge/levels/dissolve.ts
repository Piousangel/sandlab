import type { Level } from '../types'
import { drag } from './helpers'

export const dissolve: Level = {
  v: 1,
  id: 'dissolve',
  title: 'Dissolve the salt',
  blurb:
    'The basin is half full of salt. Salt behaves like sand until water reaches it: every salt grain touching water slowly disappears, and the water itself is not used up. Because salt is heavier than water, it stays at the bottom while the water sits on top and works down through the pile. Clear every grain of salt out of the basin.',
  hint: 'Cover the salt completely and give it time. The same water keeps dissolving grain after grain, so you need far less than the size of the pile; just make sure it reaches the corners.',
  paintArea: { x: 538, y: 300, w: 124, h: 100 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 530, y: 400, w: 8, h: 168 },
    { kind: 'rect', mat: 'wall', x: 662, y: 400, w: 8, h: 168 },
    { kind: 'rect', mat: 'wall', x: 530, y: 560, w: 140, h: 8 },
    { kind: 'rect', mat: 'salt', x: 538, y: 515, w: 124, h: 45 },
  ],
  palette: { water: 10000 },
  goals: [{ type: 'clear', zone: { x: 538, y: 400, w: 124, h: 160 }, mat: 'salt' }],
  stars: [7000, 8500],
  solution: [drag(0, 'water', 8, 548, 340, 652, 340, 120), drag(120, 'water', 8, 652, 340, 548, 340, 120), drag(240, 'water', 8, 548, 340, 652, 340, 120)],
}
