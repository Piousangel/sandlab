import type { Level } from '../types'
import { hold } from './helpers'

export const overTheWall: Level = {
  v: 1,
  id: 'over-the-wall',
  title: 'Over the wall',
  blurb:
    'You only have sand, and the water you need to move is already sitting in the left basin. Sand is heavier than water, so it sinks to the bottom and pushes the water up. Raise the water high enough and it spills over the divider into the basin on the right. This is displacement, the same idea as a stone dropped into a full glass.',
  hint: 'Pour sand into the middle of the left basin and keep going. The water level climbs a little with every grain that sinks.',
  paintArea: { x: 310, y: 60, w: 180, h: 220 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 300, y: 380, w: 8, h: 188 },
    { kind: 'rect', mat: 'wall', x: 500, y: 420, w: 8, h: 148 },
    { kind: 'rect', mat: 'wall', x: 712, y: 380, w: 8, h: 188 },
    { kind: 'rect', mat: 'wall', x: 300, y: 560, w: 420, h: 8 },
    { kind: 'rect', mat: 'water', x: 308, y: 440, w: 192, h: 120 },
  ],
  palette: { sand: 12000 },
  goals: [{ type: 'reach', zone: { x: 508, y: 530, w: 204, h: 30 }, mat: 'water' }],
  stars: [7000, 9500],
  solution: [hold(0, 'sand', 8, 400, 150, 700)],
}
