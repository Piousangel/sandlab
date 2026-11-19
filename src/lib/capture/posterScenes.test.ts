import { describe, expect, it } from 'vitest'
import { PRESETS } from '../sand/materials'
import {
  POSTER_SLUGS, TUBE_W, TUBE_H, FILL_ROWS, STRIP_FRAMES, ATLAS_COLS,
  sceneFor, initialCells, brushAt, stripTicks, atlasLayout,
} from './posterScenes'

describe('posterScenes', () => {
  it('covers every non-empty sandbox material exactly once', () => {
    expect(POSTER_SLUGS).toEqual(PRESETS.slice(1).map((m) => m.slug))
    expect(new Set(POSTER_SLUGS).size).toBe(POSTER_SLUGS.length)
  })

  it('maps movement to scene kind', () => {
    for (const m of PRESETS.slice(1)) {
      const k = sceneFor(m.slug).kind
      expect(k).toBe(m.movement === 'static' ? 'block' : m.movement === 'gas' ? 'rise' : 'pour')
    }
    expect(() => sceneFor('empty')).toThrow()
    expect(() => sceneFor('nope')).toThrow()
  })

  it('block scenes fill about FILL_ROWS rows of the right material, deterministically', () => {
    const s = sceneFor('stone')
    const a = initialCells(s)
    expect(a).toEqual(initialCells(s))
    const id = PRESETS.findIndex((m) => m.slug === 'stone')
    const n = a.reduce((k, c) => k + (c === id ? 1 : 0), 0)
    expect(n / TUBE_W).toBeGreaterThan(FILL_ROWS - 3)
    expect(n / TUBE_W).toBeLessThan(FILL_ROWS + 3)
    expect(a.every((c) => c === 0 || c === id)).toBe(true)
  })

  it('pour/rise scenes start empty and emit only inside the tube until emitUntil', () => {
    for (const slug of POSTER_SLUGS) {
      const s = sceneFor(slug)
      if (s.kind === 'block') continue
      expect(initialCells(s).every((c) => c === 0)).toBe(true)
      expect(s.emitUntil).toBeLessThanOrEqual(s.ticks)
      for (let t = 0; t < s.ticks; t += 7) {
        const b = brushAt(s, t)
        if (t >= s.emitUntil) { expect(b.mat).toBe(0xffffffff); continue }
        expect(b.x - b.r).toBeGreaterThanOrEqual(0)
        expect(b.x + b.r).toBeLessThan(TUBE_W)
        expect(b.y - b.r).toBeGreaterThanOrEqual(0)
        expect(b.y + b.r).toBeLessThan(TUBE_H)
      }
    }
  })

  it('strip ticks are strictly increasing and end on the poster frame (every non-block scene)', () => {
    // 하네스는 틱을 Set으로 찾으므로 중복 틱 = 빈 프레임(리뷰 11-19: 고체 6종 스트립이 비어 있던 원인).
    for (const slug of POSTER_SLUGS) {
      const s = sceneFor(slug)
      if (s.kind === 'block') continue
      const t = stripTicks(s)
      expect(t).toHaveLength(STRIP_FRAMES)
      expect(new Set(t).size).toBe(STRIP_FRAMES)
      expect(t[t.length - 1]).toBe(s.ticks)
      for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1])
    }
  })

  it('atlas layout tiles do not overlap and fit the sheet', () => {
    const L = atlasLayout()
    const tiles = Object.values(L.tiles)
    expect(tiles).toHaveLength(POSTER_SLUGS.length)
    expect(L.width).toBe(ATLAS_COLS * L.tile.w)
    const keys = new Set(tiles.map((t) => `${t.x},${t.y}`))
    expect(keys.size).toBe(tiles.length)
    for (const t of tiles) {
      expect(t.x + t.w).toBeLessThanOrEqual(L.width)
      expect(t.y + t.h).toBeLessThanOrEqual(L.height)
    }
  })
})
