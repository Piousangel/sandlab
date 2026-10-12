import { MapCanvas } from '../level/mapcanvas'

export const W1_LEGEND: Record<string, string> = {
  '.': 'empty', '#': 'wall', d: 'dirt', s: 'sand', w: 'water',
  G: 'gate:g1', H: 'gate:g2', S: 'spout:s1', T: 'spout:s2',
}

export class TileCanvas {
  constructor(readonly c: MapCanvas = new MapCanvas()) {}

  tile(tx: number, ty: number, tw: number, th: number, ch: string): this {
    this.c.rect(tx * 2, ty * 2, tw * 2, th * 2, ch)
    return this
  }

  chars(x: number, y: number, w: number, h: number, ch: string): this {
    this.c.rect(x, y, w, h, ch)
    return this
  }

  toString(): string {
    return this.c.toString()
  }
}

export function frame(draw: (c: TileCanvas) => void): string {
  const c = new TileCanvas()
  c.c.box(0, 0, 80, 120, '#', 2)
  draw(c)
  return c.toString()
}
