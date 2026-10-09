import type { Level } from '../types'
import { hold, drag } from './helpers'

export const putOut: Level = {
  v: 1,
  id: 'put-out',
  title: 'Put out the fire',
  blurb:
    'A wooden hut has caught fire. Fire spreads into touching wood and burns it away, so if you wait, the hut is gone. Water touching fire turns both into steam almost at once, which makes it the fastest way to stop a blaze. Put out every flame while at least 60 percent of the hut is still standing.',
  hint: 'Start where the fire is, on the left side of the hut, then spread water across the roof so new flames have nowhere to go.',
  paintArea: { x: 500, y: 380, w: 220, h: 120 },
  shapes: [
    { kind: 'rect', mat: 'wood', x: 560, y: 510, w: 100, h: 90 },
    { kind: 'rect', mat: 'fire', x: 548, y: 530, w: 12, h: 70 },
  ],
  palette: { water: 20000 },
  goals: [
    { type: 'clear', zone: 'all', mat: 'fire' },
    { type: 'protect', zone: { x: 560, y: 510, w: 100, h: 90 }, mat: 'wood', min: 0.6 },
  ],
  stars: [9000, 14000],
  solution: [hold(0, 'water', 10, 545, 480, 160), drag(160, 'water', 10, 545, 480, 650, 480, 160)],
}
