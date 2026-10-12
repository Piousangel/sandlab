import { describe, it, expect } from 'vitest'
import { SpillAudio, ladderFreq, loadSoundPref, saveSoundPref, SOUND_KEY, type AudioCtxLike } from './audio'

class FakeCtx implements AudioCtxLike {
  state: 'suspended' | 'running' | 'closed' = 'suspended'
  currentTime = 0
  destination = {}
  resumes = 0
  tones: { freq: number; type: string; start: number; stop: number }[] = []
  resume() {
    this.resumes++
    this.state = 'running'
    return Promise.resolve()
  }
  createOscillator() {
    const self = this
    const o = {
      type: 'sine',
      frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() { return o },
      start(t: number) { self.tones.push({ freq: o.frequency.value, type: o.type, start: t, stop: -1 }) },
      stop(t: number) { self.tones[self.tones.length - 1].stop = t },
    }
    return o
  }
  createGain() {
    const g = {
      gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() { return g },
    }
    return g
  }
}

describe('ladderFreq (피치 사다리)', () => {
  it('단계가 오를수록 음이 높다', () => {
    for (let s = 0; s < 10; s++) expect(ladderFreq(s + 1)).toBeGreaterThan(ladderFreq(s))
  })
  it('음수·NaN은 바닥음', () => {
    expect(ladderFreq(-3)).toBe(ladderFreq(0))
    expect(ladderFreq(Number.NaN)).toBe(ladderFreq(0))
  })
  it('한 옥타브 위는 두 배', () => {
    expect(ladderFreq(5)).toBeCloseTo(ladderFreq(0) * 2, 6)
  })
})

describe('SpillAudio', () => {
  it('첫 탭(unlock)에서 컨텍스트를 만들고 resume한다 — 한 번만 만든다', () => {
    let made = 0
    const ctx = new FakeCtx()
    const a = new SpillAudio(() => { made++; return ctx })
    expect(made).toBe(0)
    expect(a.muted).toBe(true)
    a.unlock()
    a.unlock()
    expect(made).toBe(1)
    expect(ctx.resumes).toBeGreaterThanOrEqual(1)
    expect(a.muted).toBe(false)
  })
  it('래치 소리는 사다리를 오른다', () => {
    const ctx = new FakeCtx()
    const a = new SpillAudio(() => ctx)
    a.unlock()
    a.latch(0)
    a.latch(1)
    a.latch(2)
    const f = ctx.tones.filter((t) => t.type === 'triangle').map((t) => t.freq)
    expect(f[0]).toBeLessThan(f[1])
    expect(f[1]).toBeLessThan(f[2])
    expect(ctx.tones.every((t) => t.stop > t.start)).toBe(true)
  })
  it('클리어는 최고음, 별은 각자 소리', () => {
    const ctx = new FakeCtx()
    const a = new SpillAudio(() => ctx)
    a.unlock()
    a.latch(3)
    const top = Math.max(...ctx.tones.map((t) => t.freq))
    ctx.tones = []
    a.clear()
    expect(Math.max(...ctx.tones.map((t) => t.freq))).toBeGreaterThan(top)
    ctx.tones = []
    a.star(0)
    a.star(1)
    a.star(2)
    expect(ctx.tones.length).toBeGreaterThanOrEqual(3)
  })
  it('꺼 두면 소리를 만들지 않고 muted', () => {
    const ctx = new FakeCtx()
    const a = new SpillAudio(() => ctx)
    a.unlock()
    a.setEnabled(false)
    a.latch(1)
    a.clear()
    a.fail()
    a.tap()
    expect(ctx.tones.length).toBe(0)
    expect(a.muted).toBe(true)
  })
  it('컨텍스트가 suspended면 muted(시각 강화 신호)', () => {
    const ctx = new FakeCtx()
    ctx.resume = () => Promise.resolve()
    const a = new SpillAudio(() => ctx)
    a.unlock()
    expect(a.muted).toBe(true)
  })
  it('AudioContext가 없는 환경에서도 안 터진다', () => {
    const a = new SpillAudio(() => null)
    a.unlock()
    a.latch(1)
    a.clear()
    expect(a.muted).toBe(true)
  })
  it('생성자가 throw해도 안 터진다', () => {
    const a = new SpillAudio(() => { throw new Error('nope') })
    expect(() => a.unlock()).not.toThrow()
    expect(a.muted).toBe(true)
  })
})

describe('사운드 토글 저장', () => {
  it('기본은 켜짐, 저장한 값을 읽는다', () => {
    const m = new Map<string, string>()
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
    expect(loadSoundPref(s)).toBe(true)
    saveSoundPref(false, s)
    expect(m.get(SOUND_KEY)).toBe('0')
    expect(loadSoundPref(s)).toBe(false)
  })
  it('저장소가 throw하거나 없으면 켜짐', () => {
    const bad = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } }
    expect(loadSoundPref(bad)).toBe(true)
    expect(() => saveSoundPref(false, bad)).not.toThrow()
    expect(loadSoundPref(null)).toBe(true)
  })
})
