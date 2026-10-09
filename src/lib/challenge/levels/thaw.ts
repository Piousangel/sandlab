import type { Level } from '../types'
import { drag } from './helpers'

export const thaw: Level = {
  v: 1,
  id: 'thaw',
  title: 'Thaw',
  blurb:
    'A thin wall of ice holds back a reservoir. Ice is stubborn: water touching it slowly freezes into more ice, so the dam gets thicker if you leave it alone. Fire is what melts it. A flame touching ice turns the ice into water and the flame into steam. Melt a hole in the dam and let the water through to the right.',
  hint: 'Fire rises, so paint it low against the ice and let it climb along the face of the dam.',
  paintArea: { x: 510, y: 300, w: 200, h: 255 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 300, y: 560, w: 600, h: 8 },
    { kind: 'rect', mat: 'wall', x: 300, y: 380, w: 8, h: 188 },
    { kind: 'rect', mat: 'wall', x: 892, y: 380, w: 8, h: 188 },
    { kind: 'rect', mat: 'ice', x: 500, y: 380, w: 8, h: 180 },
    { kind: 'rect', mat: 'water', x: 308, y: 420, w: 192, h: 140 },
  ],
  palette: { fire: 5000 },
  goals: [{ type: 'reach', zone: { x: 620, y: 520, w: 200, h: 40 }, mat: 'water' }],
  stars: [2000, 3500],
  solution: [drag(0, 'fire', 4, 516, 550, 516, 400, 120), drag(140, 'fire', 4, 516, 550, 516, 400, 120)],
}
