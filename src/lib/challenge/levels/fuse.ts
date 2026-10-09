import type { Level } from '../types'
import { drag } from './helpers'

export const fuse: Level = {
  v: 1,
  id: 'fuse',
  title: 'Light the fuse',
  blurb:
    'There is a small pit of lava on the left and a pile of wood far away on the right. Gunpowder turns into fire almost instantly when heat touches it, and the new fire lights the next grain, so a line of gunpowder carries fire much faster than anything else. Lay a fuse from the lava pit to the woodpile and burn every piece of the wood.',
  hint: 'Start the line over the lava pit so the first grains drop straight in, and drag it all the way across so it ends on top of the woodpile.',
  paintArea: { x: 110, y: 380, w: 930, h: 130 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 184, y: 520, w: 916, h: 8 },
    { kind: 'rect', mat: 'wall', x: 100, y: 470, w: 8, h: 98 },
    { kind: 'rect', mat: 'wall', x: 100, y: 560, w: 84, h: 8 },
    { kind: 'rect', mat: 'wall', x: 176, y: 520, w: 8, h: 48 },
    { kind: 'rect', mat: 'lava', x: 108, y: 528, w: 68, h: 32 },
    { kind: 'rect', mat: 'wood', x: 980, y: 480, w: 40, h: 40 },
  ],
  palette: { gunpowder: 11000 },
  goals: [{ type: 'clear', zone: { x: 970, y: 460, w: 60, h: 60 }, mat: 'wood' }],
  stars: [8000, 9500],
  solution: [drag(0, 'gunpowder', 4, 130, 470, 1000, 470, 440)],
}
