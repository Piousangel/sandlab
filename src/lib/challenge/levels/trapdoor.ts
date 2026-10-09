import type { Level } from '../types'
import { drag } from './helpers'

export const trapdoor: Level = {
  v: 1,
  id: 'trapdoor',
  title: 'Trapdoor',
  blurb:
    'A hopper full of sand hangs over the pit, held up by a wooden floor. Fire rises, so a flame lit on top of wood climbs away from it, but a flame lit underneath pushes straight up into the wood and keeps burning its way through. Light the floor from below, burn it out, and drop the sand into the pit.',
  hint: 'Paint the fire right under the wooden floor, along its whole width. Flames below wood keep climbing into it; flames above it just float away.',
  paintArea: { x: 548, y: 421, w: 104, h: 60 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 540, y: 300, w: 8, h: 120 },
    { kind: 'rect', mat: 'wall', x: 652, y: 300, w: 8, h: 120 },
    { kind: 'rect', mat: 'wood', x: 548, y: 412, w: 104, h: 8 },
    { kind: 'rect', mat: 'sand', x: 548, y: 360, w: 104, h: 52 },
    { kind: 'rect', mat: 'wall', x: 500, y: 580, w: 200, h: 20 },
  ],
  palette: { fire: 1500 },
  goals: [{ type: 'reach', zone: { x: 520, y: 540, w: 160, h: 40 }, mat: 'sand' }],
  stars: [800, 1200],
  solution: [drag(0, 'fire', 4, 556, 425, 644, 425, 40)],
}
