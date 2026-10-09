import type { Level } from '../types'
import { hold } from './helpers'

export const lavaBridge: Level = {
  v: 1,
  id: 'lava-bridge',
  title: 'Bridge the lava',
  blurb:
    'A pit of lava separates the left ledge from the right. Water cannot cross lava: the moment the two touch, the water boils into steam and the lava hardens into stone. That reaction is also the way across. Pour enough water and the lava surface turns into a stone crust, and once the crust is complete, water can run over it to the far side.',
  hint: 'Pour on the ledge close to the pit and keep pouring. The first water is spent building the crust; only after that does any reach the other side.',
  paintArea: { x: 40, y: 100, w: 320, h: 260 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 0, y: 420, w: 380, h: 180 },
    { kind: 'rect', mat: 'wall', x: 820, y: 420, w: 380, h: 180 },
    { kind: 'rect', mat: 'lava', x: 380, y: 426, w: 440, h: 174 },
  ],
  palette: { water: 15000 },
  goals: [{ type: 'reach', zone: { x: 900, y: 380, w: 200, h: 40 }, mat: 'water' }],
  stars: [8000, 11500],
  solution: [hold(0, 'water', 8, 330, 330, 1000)],
}
