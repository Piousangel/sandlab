import { describe, it, expect } from 'vitest'
import { Fx, clearPlan, latchPlan, MUTED_BOOST } from './fx'

const plain = { reduced: false, muted: false }
const muted = { reduced: false, muted: true }
const reduced = { reduced: true, muted: false }

describe('latchPlan (§3.4 타깃 래치마다)', () => {
  it('플래시 60ms, 흔들림 2px, 파티클', () => {
    const p = latchPlan(plain)
    expect(p.flashMs).toBe(60)
    expect(p.shakePx).toBe(2)
    expect(p.particles).toBeGreaterThan(0)
  })
  it('음소거면 플래시와 파티클 1.5배', () => {
    const a = latchPlan(plain)
    const b = latchPlan(muted)
    expect(MUTED_BOOST).toBe(1.5)
    expect(b.flashAlpha).toBeCloseTo(a.flashAlpha * 1.5, 9)
    expect(b.particles).toBe(Math.round(a.particles * 1.5))
  })
  it('reduced-motion이면 흔들림 0, 플래시 약하게', () => {
    const a = latchPlan(plain)
    const r = latchPlan(reduced)
    expect(r.shakePx).toBe(0)
    expect(r.flashAlpha).toBeLessThan(a.flashAlpha)
  })
})

describe('clearPlan (§3.4 풀/축약)', () => {
  it('풀: 렌더 전용 0.25x 슬로모 0.6s, 줌 6%, 플래시 120ms, 흔들림 3px, 카드 t=0.6, 별 250ms 간격, 약 2.2초', () => {
    const p = clearPlan('full', plain)
    expect(p.slowmoRate).toBe(0.25)
    expect(p.slowmoMs).toBe(600)
    expect(p.zoom).toBeCloseTo(0.06, 9)
    expect(p.flashMs).toBe(120)
    expect(p.shakePx).toBe(3)
    expect(p.cardDelayMs).toBe(600)
    expect(p.starGapMs).toBe(250)
    expect(p.totalMs).toBeGreaterThanOrEqual(2000)
    expect(p.totalMs).toBeLessThanOrEqual(2400)
  })
  it('축약: 0.6초, 슬로모·줌 없음, 카드 바로', () => {
    const p = clearPlan('short', plain)
    expect(p.totalMs).toBeLessThanOrEqual(600)
    expect(p.slowmoMs).toBe(0)
    expect(p.zoom).toBe(0)
    expect(p.cardDelayMs).toBeLessThan(600)
    expect(p.flashMs).toBeGreaterThan(0)
  })
  it('reduced-motion: 줌·슬로모·흔들림 끔, 플래시 약하게, 카드는 남김', () => {
    const f = clearPlan('full', plain)
    const p = clearPlan('full', reduced)
    expect(p.zoom).toBe(0)
    expect(p.slowmoMs).toBe(0)
    expect(p.slowmoRate).toBe(1)
    expect(p.shakePx).toBe(0)
    expect(p.flashAlpha).toBeLessThan(f.flashAlpha)
    expect(p.cardDelayMs).toBeGreaterThanOrEqual(0)
  })
  it('음소거면 시각 강화', () => {
    expect(clearPlan('full', muted).flashAlpha).toBeCloseTo(clearPlan('full', plain).flashAlpha * 1.5, 9)
    expect(clearPlan('short', muted).particles).toBe(Math.round(clearPlan('short', plain).particles * 1.5))
  })
})

describe('Fx 상태', () => {
  it('래치하면 플래시·흔들림·파티클이 생기고 시간이 지나면 사라진다', () => {
    const fx = new Fx(7)
    fx.latch(50, 60, '#2e6fd9', plain)
    expect(fx.flashAlpha()).toBeGreaterThan(0)
    expect(fx.particles.length).toBe(latchPlan(plain).particles)
    expect(fx.busy).toBe(true)
    fx.step(30)
    const s = fx.shake()
    expect(Math.abs(s.x) + Math.abs(s.y)).toBeGreaterThan(0)
    fx.step(5000)
    expect(fx.flashAlpha()).toBe(0)
    expect(fx.particles.length).toBe(0)
    expect(fx.shake()).toEqual({ x: 0, y: 0 })
    expect(fx.busy).toBe(false)
  })
  it('흔들림 진폭은 계획값을 넘지 않는다', () => {
    const fx = new Fx(1)
    fx.clear('full', 10, 10, plain)
    for (let t = 0; t < 400; t += 7) {
      fx.step(7)
      const s = fx.shake()
      expect(Math.abs(s.x)).toBeLessThanOrEqual(3 + 1e-9)
      expect(Math.abs(s.y)).toBeLessThanOrEqual(3 + 1e-9)
    }
  })
  it('풀 클리어: 슬로모 동안 timeScale 0.25, 이후 1. 줌은 타깃 중심으로', () => {
    const fx = new Fx(2)
    fx.clear('full', 80, 200, plain)
    expect(fx.timeScale()).toBe(0.25)
    const z = fx.zoom()
    expect(z.k).toBeGreaterThan(1)
    expect(z.k).toBeLessThanOrEqual(1.06 + 1e-9)
    expect(z.cx).toBe(80)
    expect(z.cy).toBe(200)
    fx.step(601)
    expect(fx.timeScale()).toBe(1)
  })
  it('reduced-motion 풀 클리어: 줌 1, 흔들림 0, timeScale 1', () => {
    const fx = new Fx(2)
    fx.clear('full', 80, 200, reduced)
    expect(fx.zoom().k).toBe(1)
    expect(fx.timeScale()).toBe(1)
    fx.step(20)
    expect(fx.shake()).toEqual({ x: 0, y: 0 })
  })
  it('같은 시드 → 같은 파티클', () => {
    const a = new Fx(9)
    const b = new Fx(9)
    a.gem(10, 10, plain)
    b.gem(10, 10, plain)
    a.step(16)
    b.step(16)
    expect(a.particles).toEqual(b.particles)
  })
  it('skip은 슬로모·줌을 즉시 끝낸다(탭하면 스킵)', () => {
    const fx = new Fx(3)
    fx.clear('full', 1, 1, plain)
    fx.skip()
    expect(fx.timeScale()).toBe(1)
    expect(fx.zoom().k).toBe(1)
  })
  it('reset은 전부 지운다', () => {
    const fx = new Fx(3)
    fx.fail(plain)
    fx.reset()
    expect(fx.busy).toBe(false)
  })
})
