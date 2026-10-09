import type { Level } from '../types'
import { hold } from './helpers'

export const acidStairs: Level = {
  v: 1,
  id: 'acid-stairs',
  title: 'Acid stairs',
  blurb:
    'Two floors stand between you and the bottom chamber: a stone slab and, below it, a metal plate. Acid eats both and survives each bite, but stone goes more slowly than metal. The walls are made of wall, which acid cannot touch, so whatever you pour has only one way down. Get acid into the bottom chamber.',
  hint: 'Be patient with the stone. It takes longer than the metal, and pouring more acid on top does not make a single cell dissolve faster.',
  paintArea: { x: 536, y: 120, w: 128, h: 180 },
  shapes: [
    { kind: 'rect', mat: 'wall', x: 520, y: 200, w: 8, h: 360 },
    { kind: 'rect', mat: 'wall', x: 672, y: 200, w: 8, h: 360 },
    { kind: 'rect', mat: 'stone', x: 528, y: 340, w: 144, h: 8 },
    { kind: 'rect', mat: 'metal', x: 528, y: 430, w: 144, h: 8 },
    { kind: 'rect', mat: 'wall', x: 520, y: 560, w: 160, h: 8 },
  ],
  palette: { acid: 6000 },
  goals: [{ type: 'reach', zone: { x: 528, y: 500, w: 144, h: 60 }, mat: 'acid' }],
  stars: [2500, 4000],
  solution: [hold(0, 'acid', 6, 600, 240, 260)],
}
