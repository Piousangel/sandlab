import type { Level } from '../types'
import { drag } from './helpers'

export const putOut: Level = {
  v: 1,
  id: 'put-out',
  title: 'Put out the fire',
  blurb:
    'Lava has spilled across a stone floor between stacks of wooden crates, and every crate it touches catches fire. Lava is not cooled by burning things, so the fires will keep starting as long as any lava is left. Water fixes both problems: it puts out flames on contact and hardens lava into stone. Leave no lava and no fire anywhere in the room.',
  hint: 'Sweep along the whole spill, not just the flames. A single cell of lava left behind is enough to start the fires again.',
  paintArea: { x: 380, y: 430, w: 440, h: 110 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 380, y: 560, w: 440, h: 40 },
    { kind: 'rect', mat: 'lava', x: 420, y: 559, w: 360, h: 1 },
    { kind: 'rect', mat: 'wood', x: 400, y: 530, w: 20, h: 30 },
    { kind: 'rect', mat: 'wood', x: 590, y: 540, w: 20, h: 18 },
    { kind: 'rect', mat: 'wood', x: 780, y: 530, w: 20, h: 30 },
  ],
  palette: { water: 9000 },
  goals: [
    { type: 'clear', zone: 'all', mat: 'lava' },
    { type: 'clear', zone: 'all', mat: 'fire' },
  ],
  stars: [7000, 8500],
  solution: [drag(0, 'water', 8, 400, 500, 800, 500, 160)],
}
