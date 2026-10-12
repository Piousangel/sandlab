export interface FxOpts {
  reduced: boolean
  muted: boolean
}

export interface LatchPlan {
  flashMs: number
  flashAlpha: number
  shakePx: number
  particles: number
}

export interface ClearPlan extends LatchPlan {
  slowmoRate: number
  slowmoMs: number
  zoom: number
  zoomMs: number
  cardDelayMs: number
  starGapMs: number
  totalMs: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  color: string
}

export const MUTED_BOOST = 1.5
const GRAVITY = 0.00018
const SHAKE_MS = 220

function tune<T extends LatchPlan>(p: T, o: FxOpts): T {
  const boost = o.muted ? MUTED_BOOST : 1
  return {
    ...p,
    flashAlpha: p.flashAlpha * boost * (o.reduced ? 0.5 : 1),
    particles: Math.round(p.particles * boost),
    shakePx: o.reduced ? 0 : p.shakePx,
  }
}

export function latchPlan(o: FxOpts): LatchPlan {
  return tune({ flashMs: 60, flashAlpha: 0.22, shakePx: 2, particles: 16 }, o)
}

export function clearPlan(kind: 'full' | 'short', o: FxOpts): ClearPlan {
  const base: ClearPlan =
    kind === 'full'
      ? { flashMs: 120, flashAlpha: 0.42, shakePx: 3, particles: 40, slowmoRate: 0.25, slowmoMs: 600, zoom: 0.06, zoomMs: 600, cardDelayMs: 600, starGapMs: 250, totalMs: 2200 }
      : { flashMs: 120, flashAlpha: 0.3, shakePx: 0, particles: 20, slowmoRate: 1, slowmoMs: 0, zoom: 0, zoomMs: 0, cardDelayMs: 150, starGapMs: 0, totalMs: 600 }
  const p = tune(base, o)
  if (o.reduced) {
    p.slowmoRate = 1
    p.slowmoMs = 0
    p.zoom = 0
    p.zoomMs = 0
    if (kind === 'full') p.cardDelayMs = 200
  }
  return p
}

interface Flash {
  t0: number
  ms: number
  alpha: number
  color: string
}

export class Fx {
  particles: Particle[] = []
  private t = 0
  private seed: number
  private flashes: Flash[] = []
  private shakeAt = -1
  private shakeAmp = 0
  private slowUntil = -1
  private slowRate = 1
  private zoomAt = -1
  private zoomMs = 0
  private zoomAmt = 0
  private zx = 0
  private zy = 0

  constructor(seed = 1) {
    this.seed = seed >>> 0 || 1
  }

  private rand(): number {
    let s = this.seed
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    this.seed = s >>> 0
    return this.seed / 4294967296
  }

  get now(): number {
    return this.t
  }

  get busy(): boolean {
    return this.particles.length > 0 || this.flashAlpha() > 0 || this.shakeActive() || this.timeScale() !== 1 || this.zoom().k !== 1
  }

  reset(): void {
    this.particles = []
    this.flashes = []
    this.shakeAt = -1
    this.shakeAmp = 0
    this.slowUntil = -1
    this.slowRate = 1
    this.zoomAt = -1
    this.zoomAmt = 0
  }

  skip(): void {
    this.slowUntil = -1
    this.slowRate = 1
    this.zoomAt = -1
    this.zoomAmt = 0
  }

  private burst(x: number, y: number, n: number, colors: readonly string[], speed: number): void {
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2
      const v = speed * (0.35 + this.rand() * 0.65)
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.6, age: 0,
        life: 420 + this.rand() * 380, size: 1 + this.rand() * 1.5, color: colors[i % colors.length],
      })
    }
  }

  private apply(p: LatchPlan, x: number, y: number, colors: readonly string[], flashColor: string, speed: number): void {
    this.flashes.push({ t0: this.t, ms: p.flashMs, alpha: p.flashAlpha, color: flashColor })
    if (p.shakePx > 0) {
      this.shakeAt = this.t
      this.shakeAmp = Math.max(p.shakePx, this.shakeActive() ? this.shakeAmp : 0)
    }
    this.burst(x, y, p.particles, colors, speed)
  }

  latch(x: number, y: number, color: string, o: FxOpts): LatchPlan {
    const p = latchPlan(o)
    this.apply(p, x, y, [color, '#ffffff', '#ffe27a'], '#ffffff', 0.05)
    return p
  }

  gem(x: number, y: number, o: FxOpts): LatchPlan {
    const p = latchPlan(o)
    this.apply({ ...p, shakePx: 0 }, x, y, ['#7ff0ff', '#ffffff', '#c7a6ff'], '#bff6ff', 0.045)
    return p
  }

  clear(kind: 'full' | 'short', x: number, y: number, o: FxOpts): ClearPlan {
    const p = clearPlan(kind, o)
    this.apply(p, x, y, ['#ffe27a', '#ffffff', '#f5a623', '#7ff0ff'], '#ffffff', 0.07)
    if (p.slowmoMs > 0) {
      this.slowUntil = this.t + p.slowmoMs
      this.slowRate = p.slowmoRate
    }
    if (p.zoom > 0) {
      this.zoomAt = this.t
      this.zoomMs = p.zoomMs
      this.zoomAmt = p.zoom
      this.zx = x
      this.zy = y
    }
    return p
  }

  fail(o: FxOpts): void {
    this.flashes.push({ t0: this.t, ms: 90, alpha: 0.18 * (o.muted ? MUTED_BOOST : 1) * (o.reduced ? 0.5 : 1), color: '#ff3b30' })
  }

  step(dtMs: number): void {
    const dt = dtMs > 0 ? dtMs : 0
    this.t += dt
    const out: Particle[] = []
    for (const q of this.particles) {
      const age = q.age + dt
      if (age >= q.life) continue
      out.push({ ...q, age, x: q.x + q.vx * dt, y: q.y + q.vy * dt, vy: q.vy + GRAVITY * dt })
    }
    this.particles = out
    this.flashes = this.flashes.filter((f) => this.t - f.t0 < f.ms)
    if (this.t >= this.slowUntil) { this.slowUntil = -1; this.slowRate = 1 }
    if (this.zoomAt >= 0 && this.t - this.zoomAt >= this.zoomMs * 2) { this.zoomAt = -1; this.zoomAmt = 0 }
  }

  flashAlpha(): number {
    let a = 0
    for (const f of this.flashes) {
      const p = (this.t - f.t0) / f.ms
      if (p >= 0 && p < 1) a = Math.max(a, f.alpha * (1 - p))
    }
    return a
  }

  flashColor(): string {
    return this.flashes.length ? this.flashes[this.flashes.length - 1].color : '#ffffff'
  }

  private shakeActive(): boolean {
    return this.shakeAt >= 0 && this.t - this.shakeAt < SHAKE_MS
  }

  shake(): { x: number; y: number } {
    if (!this.shakeActive() || this.shakeAmp === 0) return { x: 0, y: 0 }
    const e = this.t - this.shakeAt
    const amp = this.shakeAmp * (1 - e / SHAKE_MS)
    return { x: amp * Math.sin(e * 0.11), y: amp * Math.cos(e * 0.083) }
  }

  zoom(): { k: number; cx: number; cy: number } {
    if (this.zoomAt < 0 || this.zoomAmt === 0) return { k: 1, cx: this.zx, cy: this.zy }
    const e = this.t - this.zoomAt
    const ms = this.zoomMs || 1
    const env = e < ms ? Math.min(1, 0.25 + e / (ms * 0.4)) : Math.max(0, 1 - (e - ms) / ms)
    return { k: 1 + this.zoomAmt * env, cx: this.zx, cy: this.zy }
  }

  timeScale(): number {
    return this.slowUntil >= 0 && this.t < this.slowUntil ? this.slowRate : 1
  }
}
