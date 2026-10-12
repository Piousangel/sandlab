import { describe, it, expect } from 'vitest'
import { spriteBox, badgeBox, actionTiles, ringProgress, glyphFor, pulse, gateLook, SPRITE_MIN, tileRectCss } from './overlay'

describe('spriteBox (타깃·젬 스프라이트 ≥ 24 CSS px)', () => {
  it('작은 rect도 최소 24px, 중심 유지', () => {
    const b = spriteBox({ x: 8, y: 8, w: 8, h: 8 }, 1.8)
    expect(SPRITE_MIN).toBe(24)
    expect(b.w).toBeGreaterThanOrEqual(24)
    expect(b.h).toBeGreaterThanOrEqual(24)
    expect(b.x + b.w / 2).toBeCloseTo(12 * 1.8, 9)
    expect(b.y + b.h / 2).toBeCloseTo(12 * 1.8, 9)
  })
  it('큰 rect는 rect 크기 그대로', () => {
    const b = spriteBox({ x: 0, y: 0, w: 40, h: 20 }, 2)
    expect(b).toEqual({ x: 0, y: 0, w: 80, h: 40 })
  })
})

describe('badgeBox (타깃 아이콘 배지)', () => {
  it('rect 위에 놓이고 24px 이상, 캔버스 안으로 클램프', () => {
    const b = badgeBox({ x: 60, y: 120, w: 24, h: 40 }, 2, 320, 480)
    expect(b.w).toBeGreaterThanOrEqual(24)
    expect(b.y + b.h).toBeLessThanOrEqual(120 * 2)
    const top = badgeBox({ x: 0, y: 0, w: 8, h: 8 }, 2, 320, 480)
    expect(top.x).toBeGreaterThanOrEqual(0)
    expect(top.y).toBeGreaterThanOrEqual(0)
  })
})

describe('actionTiles (고스트 타일)', () => {
  it('dig/line은 8방향 직선 경로', () => {
    expect(actionTiles({ verb: 'dig', tx: 2, ty: 3, tx2: 2, ty2: 5 })).toEqual([[2, 3], [2, 4], [2, 5]])
    expect(actionTiles({ verb: 'line', tx: 0, ty: 0, tx2: 2, ty2: 2, arg: 'fuse' })).toEqual([[0, 0], [1, 1], [2, 2]])
  })
  it('drop은 스탬프 크기(얼음 2×2)', () => {
    expect(actionTiles({ verb: 'drop', tx: 4, ty: 4, tx2: 4, ty2: 4, arg: 'spark' })).toEqual([[4, 4]])
    expect(actionTiles({ verb: 'drop', tx: 4, ty: 4, tx2: 4, ty2: 4, arg: 'ice' })).toHaveLength(4)
  })
  it('trigger는 타일 없음', () => {
    expect(actionTiles({ verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' })).toEqual([])
  })
})

describe('tileRectCss', () => {
  it('타일 → CSS px (타일 = 4셀)', () => {
    expect(tileRectCss(3, 5, 2)).toEqual({ x: 24, y: 40, w: 8, h: 8 })
  })
})

describe('ringProgress·glyph·pulse', () => {
  it('진척 비율 0..1', () => {
    expect(ringProgress({ progress: 200, need: 400, latched: false })).toBe(0.5)
    expect(ringProgress({ progress: 900, need: 400, latched: false })).toBe(1)
    expect(ringProgress({ progress: 0, need: 0, latched: false })).toBe(0)
    expect(ringProgress({ progress: 10, need: 400, latched: true })).toBe(1)
  })
  it('타깃 종류 → 아이콘', () => {
    expect(glyphFor('fill')).toBe('pot')
    expect(glyphFor('ignite')).toBe('torch')
    expect(glyphFor('reach')).toBe('bell')
    expect(glyphFor('protect')).toBe('crate')
    expect(glyphFor('bad')).toBe('skull')
  })
  it('펄스는 0..1 사이에서 주기적으로', () => {
    for (let t = 0; t < 3000; t += 37) {
      const p = pulse(t)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
    expect(pulse(0)).not.toBe(pulse(450))
  })
})

describe('gateLook (I2: 창이 열릴 때만 깜빡임)', () => {
  it('Run 중 창 이전은 흐리고 깜빡이지 않는다', () => {
    const a = gateLook('before', true, 0)
    const b = gateLook('before', true, 300)
    expect(a).toEqual(b)
    expect(a.dim).toBe(true)
  })
  it('창 안(또는 창 없음)에서만 시간에 따라 깜빡인다', () => {
    for (const w of ['open', 'always'] as const) {
      const xs = [0, 60, 120, 180].map((ms) => gateLook(w, true, ms).fill)
      expect(new Set(xs).size).toBeGreaterThan(1)
      expect(gateLook(w, true, 0).dim).toBe(false)
    }
  })
  it('창 이후와 Setup에서는 고정', () => {
    expect(gateLook('after', true, 0)).toEqual(gateLook('after', true, 200))
    expect(gateLook('open', false, 0)).toEqual(gateLook('open', false, 200))
  })
})

