import type { Level } from '../types'
import { drag } from './helpers'

export const layerCake: Level = {
  v: 1,
  id: 'layer-cake',
  title: 'Layer cake',
  blurb:
    'Liquids sort themselves by weight. Oil is lighter than water, so wherever you pour them, the oil ends up floating on top and the water settles underneath. Fill the lower band of the tank with water and the upper band with oil. The order you pour them in does not matter; the simulation does the sorting for you.',
  hint: 'Sweep each liquid across the whole width of the tank. Poured in one spot, liquids pile up and take a long time to level out.',
  paintArea: { x: 528, y: 220, w: 144, h: 140 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 520, y: 380, w: 8, h: 188 },
    { kind: 'rect', mat: 'wall', x: 672, y: 380, w: 8, h: 188 },
    { kind: 'rect', mat: 'wall', x: 520, y: 560, w: 160, h: 8 },
  ],
  palette: { water: 12000, oil: 12000 },
  goals: [
    { type: 'fill', zone: { x: 528, y: 530, w: 144, h: 30 }, mat: 'water', min: 0.8 },
    { type: 'fill', zone: { x: 528, y: 495, w: 144, h: 25 }, mat: 'oil', min: 0.8 },
  ],
  stars: [14000, 18000],
  solution: [
    drag(0, 'water', 8, 540, 300, 660, 300, 150), drag(150, 'water', 8, 660, 300, 540, 300, 150),
    drag(300, 'oil', 8, 540, 300, 660, 300, 150), drag(450, 'oil', 8, 660, 300, 540, 300, 150),
  ],
}
