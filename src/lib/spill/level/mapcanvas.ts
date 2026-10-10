/** 레벨 맵 텍스트(80×120자, 문자 1개 = 2×2셀)를 코드로 그리는 도우미. 벤치·생성기용. */
import { MAP_COLS, MAP_ROWS } from './parse'

export class MapCanvas {
  private rows: string[][]
  constructor(fill = '.') {
    this.rows = Array.from({ length: MAP_ROWS }, () => Array<string>(MAP_COLS).fill(fill))
  }
  /** 문자 좌표(x, y)에 w×h 사각형. 범위 밖은 잘린다. */
  rect(x: number, y: number, w: number, h: number, ch: string): this {
    for (let yy = Math.max(0, y); yy < Math.min(MAP_ROWS, y + h); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(MAP_COLS, x + w); xx++) this.rows[yy][xx] = ch
    return this
  }
  /** 문자 좌표 기준 속 빈 상자(두께 t). */
  box(x: number, y: number, w: number, h: number, ch: string, t = 1): this {
    this.rect(x, y, w, t, ch).rect(x, y + h - t, w, t, ch)
    this.rect(x, y, t, h, ch).rect(x + w - t, y, t, h, ch)
    return this
  }
  toString(): string {
    return this.rows.map((r) => r.join('')).join('\n')
  }
}
