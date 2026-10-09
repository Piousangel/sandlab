import type { Level } from '../types'
import { drag } from './helpers'

export const overTheWall: Level = {
  v: 1,
  id: 'over-the-wall',
  title: 'Over the wall',
  blurb:
    'You only have sand, and the water you need to move is already sitting in the left basin. Sand is heavier than water, so it sinks to the bottom and pushes the water up. Raise the water high enough and it spills over the divider into the basin on the right. This is displacement, the same idea as a stone dropped into a full glass.',
  hint: 'Sweep sand back and forth across the whole basin. Poured in one spot it stacks into a tower instead of sinking, and a tower above the water does not push anything.',
  paintArea: { x: 310, y: 60, w: 180, h: 220 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 300, y: 380, w: 8, h: 188 },
    { kind: 'rect', mat: 'wall', x: 500, y: 430, w: 8, h: 138 },
    { kind: 'rect', mat: 'wall', x: 712, y: 380, w: 8, h: 188 },
    { kind: 'rect', mat: 'wall', x: 300, y: 560, w: 420, h: 8 },
    { kind: 'rect', mat: 'water', x: 308, y: 446, w: 192, h: 114 },
  ],
  palette: { sand: 18000 },
  goals: [{ type: 'reach', zone: { x: 508, y: 530, w: 204, h: 30 }, mat: 'water' }],
  stars: [14500, 16500],
  solution: [drag(0, 'sand', 8, 320, 150, 480, 150, 200), drag(200, 'sand', 8, 480, 150, 320, 150, 200), drag(400, 'sand', 8, 320, 150, 480, 150, 200), drag(600, 'sand', 8, 480, 150, 320, 150, 200)],
}
