interface ParamLike {
  value: number
  setValueAtTime(v: number, t: number): unknown
  linearRampToValueAtTime?(v: number, t: number): unknown
  exponentialRampToValueAtTime(v: number, t: number): unknown
}

interface NodeLike {
  connect(dst: unknown): unknown
}

interface OscLike extends NodeLike {
  type: string
  frequency: ParamLike
  start(t: number): void
  stop(t: number): void
}

interface GainLike extends NodeLike {
  gain: ParamLike
}

export interface AudioCtxLike {
  state: string
  currentTime: number
  destination: unknown
  resume(): Promise<void>
  createOscillator(): OscLike
  createGain(): GainLike
}

export interface PrefStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const SOUND_KEY = 'spill.v1.sound'
const BASE_HZ = 523.25
const PENTA = [0, 2, 4, 7, 9]

export function ladderFreq(step: number): number {
  const s = Number.isFinite(step) && step > 0 ? Math.floor(step) : 0
  const oct = Math.floor(s / PENTA.length)
  const semis = oct * 12 + PENTA[s % PENTA.length]
  return BASE_HZ * 2 ** (semis / 12)
}

function defaultCreate(): AudioCtxLike | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: new () => AudioCtxLike; webkitAudioContext?: new () => AudioCtxLike }
  const C = w.AudioContext ?? w.webkitAudioContext
  return C ? new C() : null
}

function defaultStorage(): PrefStorage | null {
  try {
    return (globalThis as { localStorage?: PrefStorage }).localStorage ?? null
  } catch {
    return null
  }
}

export function loadSoundPref(storage: PrefStorage | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

export function saveSoundPref(on: boolean, storage: PrefStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(SOUND_KEY, on ? '1' : '0')
  } catch {
    return
  }
}

export class SpillAudio {
  private ctx: AudioCtxLike | null = null
  private tried = false
  enabled = true

  constructor(private create: () => AudioCtxLike | null = defaultCreate) {}

  get muted(): boolean {
    return !this.enabled || !this.ctx || this.ctx.state !== 'running'
  }

  unlock(): void {
    if (!this.enabled) return
    if (!this.tried) {
      this.tried = true
      try {
        this.ctx = this.create()
      } catch {
        this.ctx = null
      }
    }
    const c = this.ctx
    if (c && c.state === 'suspended') {
      try {
        c.resume().catch(() => undefined)
      } catch {
        return
      }
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on
    if (on) this.unlock()
  }

  private tone(freq: number, dur: number, type: string, vol: number, delay = 0): void {
    const c = this.ctx
    if (!this.enabled || !c || c.state !== 'running') return
    try {
      const t = c.currentTime + delay
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = type
      o.frequency.value = freq
      o.frequency.setValueAtTime(freq, t)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g)
      g.connect(c.destination)
      o.start(t)
      o.stop(t + dur + 0.02)
    } catch {
      return
    }
  }

  tap(): void {
    this.tone(880, 0.04, 'triangle', 0.05)
  }

  reject(): void {
    this.tone(150, 0.09, 'square', 0.04)
  }

  latch(step: number): void {
    const f = ladderFreq(step + 2)
    this.tone(f, 0.22, 'triangle', 0.16)
    this.tone(f * 2, 0.12, 'sine', 0.05, 0.01)
  }

  gem(): void {
    this.tone(ladderFreq(9), 0.09, 'sine', 0.09)
    this.tone(ladderFreq(11), 0.14, 'sine', 0.08, 0.07)
  }

  star(i: number): void {
    this.tone(ladderFreq(5 + i * 2), 0.2, 'triangle', 0.13)
  }

  clear(): void {
    const top = 12
    this.tone(ladderFreq(top - 4), 0.14, 'triangle', 0.13)
    this.tone(ladderFreq(top - 2), 0.14, 'triangle', 0.13, 0.08)
    this.tone(ladderFreq(top), 0.5, 'triangle', 0.18, 0.16)
    this.tone(ladderFreq(top) / 2, 0.5, 'sine', 0.08, 0.16)
  }

  fail(): void {
    this.tone(220, 0.18, 'sawtooth', 0.05)
    this.tone(165, 0.3, 'sawtooth', 0.05, 0.12)
  }
}
