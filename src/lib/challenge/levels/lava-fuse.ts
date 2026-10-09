import type { Level } from '../types'
import { drag } from './helpers'

export const lavaFuse: Level = {
  v: 1,
  id: 'lava-fuse',
  title: 'Fuse over fire',
  blurb:
    'The final challenge puts a wide lava pit between you and the woodpile. Gunpowder is lighter than lava, so grains that land on the pit float on its surface and catch fire straight away. That is enough to make a burning bridge: a line of gunpowder laid across the pit and on to the far ledge carries the fire all the way to the wood.',
  hint: 'Lay the line from the near ledge, over the pit and right up onto the woodpile in one continuous stroke.',
  paintArea: { x: 200, y: 330, w: 820, h: 80 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 100, y: 420, w: 360, h: 180 },
    { kind: 'rect', mat: 'wall', x: 740, y: 420, w: 360, h: 180 },
    { kind: 'rect', mat: 'lava', x: 460, y: 426, w: 280, h: 174 },
    { kind: 'rect', mat: 'wood', x: 960, y: 380, w: 40, h: 40 },
  ],
  palette: { gunpowder: 9000 },
  goals: [{ type: 'clear', zone: { x: 950, y: 360, w: 60, h: 60 }, mat: 'wood', max: 20 }],
  stars: [6000, 8000],
  solution: [drag(0, 'gunpowder', 4, 400, 390, 980, 390, 300)],
}
