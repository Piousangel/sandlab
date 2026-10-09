import type { Level } from '../types'
import { drag } from './helpers'

export const fuse: Level = {
  v: 1,
  id: 'fuse',
  title: 'Light the fuse',
  blurb:
    'There is a small pool of lava on the left and a pile of wood far away on the right. Gunpowder turns into fire almost instantly when heat touches it, and the new fire lights the next grain, so a line of gunpowder carries fire much faster than anything else. Lay a fuse from the lava to the woodpile and burn every piece of it.',
  hint: 'Start the line on top of the lava and drag it all the way across the floor so it ends on the woodpile. A gap in the line stops the fire.',
  paintArea: { x: 120, y: 380, w: 920, h: 130 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 100, y: 520, w: 1000, h: 8 },
    { kind: 'rect', mat: 'wall', x: 100, y: 470, w: 8, h: 50 },
    { kind: 'rect', mat: 'wall', x: 176, y: 490, w: 8, h: 30 },
    { kind: 'rect', mat: 'lava', x: 108, y: 494, w: 68, h: 26 },
    { kind: 'rect', mat: 'wood', x: 980, y: 480, w: 40, h: 40 },
  ],
  palette: { gunpowder: 9000 },
  goals: [{ type: 'clear', zone: { x: 970, y: 460, w: 60, h: 60 }, mat: 'wood' }],
  stars: [4000, 6500],
  solution: [drag(0, 'gunpowder', 4, 150, 470, 1000, 470, 420)],
}
