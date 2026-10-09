import type { Level } from '../types'
import { hold, drag } from './helpers'

export const lavaBridge: Level = {
  v: 1,
  id: 'lava-bridge',
  title: 'Bridge the lava',
  blurb:
    'A pit of lava separates the left ledge from the right. Water cannot simply cross lava: the moment the two touch, the water boils into steam and the lava hardens into stone. That reaction is also the way across. Pour water straight onto the lava to grow a stone crust, then keep pouring so the water runs over your new stone to the right-hand ledge.',
  hint: 'You can only pour over the left part of the pit. Cover it with water so the crust grows, then keep pouring at the right edge of your area so the water runs across the new stone.',
  paintArea: { x: 500, y: 200, w: 122, h: 200 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 0, y: 420, w: 520, h: 180 },
    { kind: 'rect', mat: 'wall', x: 640, y: 420, w: 560, h: 180 },
    { kind: 'rect', mat: 'lava', x: 520, y: 426, w: 120, h: 174 },
  ],
  palette: { water: 9000 },
  goals: [{ type: 'reach', zone: { x: 650, y: 400, w: 120, h: 20 }, mat: 'water' }],
  stars: [5200, 7500],
  solution: [drag(0, 'water', 8, 515, 380, 612, 380, 200), hold(200, 'water', 8, 612, 380, 600)],
}
