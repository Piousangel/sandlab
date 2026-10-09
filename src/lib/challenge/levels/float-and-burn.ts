import type { Level } from '../types'
import { drag, hold } from './helpers'

export const floatAndBurn: Level = {
  v: 1,
  id: 'float-and-burn',
  title: 'Both banks',
  blurb:
    'There is a woodpile hanging over each end of the pond, and you can only light a fire in the middle of the water. Oil floats on water in a thin film and burns quickly, so one unbroken slick can carry flames in both directions at once. Lay the slick from bank to bank, light it in the middle, and burn both woodpiles.',
  hint: 'Cover the whole pond with oil before you light it. Fire travels both ways from where it starts, as long as the film is unbroken.',
  paintArea: { x: 210, y: 300, w: 770, h: 182 },
  areaFor: { fire: { x: 540, y: 420, w: 120, h: 62 } },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 100, y: 476, w: 108, h: 124 },
    { kind: 'rect', mat: 'wall', x: 208, y: 560, w: 784, h: 8 },
    { kind: 'rect', mat: 'water', x: 208, y: 480, w: 784, h: 80 },
    { kind: 'rect', mat: 'wall', x: 992, y: 476, w: 108, h: 124 },
    { kind: 'rect', mat: 'wood', x: 170, y: 440, w: 50, h: 36 },
    { kind: 'rect', mat: 'wood', x: 980, y: 440, w: 50, h: 36 },
  ],
  palette: { oil: 20000, fire: 600 },
  goals: [
    { type: 'clear', zone: { x: 160, y: 430, w: 65, h: 50 }, mat: 'wood', max: 20 },
    { type: 'clear', zone: { x: 975, y: 430, w: 65, h: 50 }, mat: 'wood', max: 20 },
  ],
  stars: [17500, 19000],
  solution: [drag(0, 'oil', 5, 216, 420, 974, 420, 400), drag(400, 'oil', 5, 974, 420, 216, 420, 400), hold(960, 'fire', 4, 600, 462, 20)],
}
