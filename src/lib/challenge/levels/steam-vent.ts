import type { Level } from '../types'
import { drag } from './helpers'

export const steamVent: Level = {
  v: 1,
  id: 'steam-vent',
  title: 'Steam vent',
  blurb:
    'A thin film of lava lines the bottom of a chimney. When water touches lava, the water boils into steam and the lava hardens into stone. Steam is a gas, so it rises, and the chimney walls keep it from drifting sideways. Make enough steam to fill the marked band near the top before it fades away.',
  hint: 'Spread the water across the whole lava film. Each cell of lava can only make steam once before it turns to stone.',
  paintArea: { x: 492, y: 470, w: 216, h: 60 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 480, y: 300, w: 12, h: 268 },
    { kind: 'rect', mat: 'wall', x: 708, y: 300, w: 12, h: 268 },
    { kind: 'rect', mat: 'wall', x: 480, y: 560, w: 240, h: 40 },
    { kind: 'rect', mat: 'lava', x: 492, y: 559, w: 216, h: 1 },
  ],
  palette: { water: 6000 },
  goals: [{ type: 'reach', zone: { x: 492, y: 400, w: 216, h: 40 }, mat: 'steam' }],
  stars: [3800, 4800],
  solution: [drag(0, 'water', 8, 502, 500, 698, 500, 80)],
}
