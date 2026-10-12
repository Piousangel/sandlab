import { describe, it, expect } from 'vitest'
import { vibrate, haptic, HAPTICS } from './haptics'

describe('haptics', () => {
  it('navigator.vibrate가 있으면 쓴다', () => {
    const calls: unknown[] = []
    const nav = { vibrate: (p: number | number[]) => { calls.push(p); return true } }
    expect(vibrate(30, nav)).toBe(true)
    expect(calls).toEqual([30])
  })
  it('없거나 throw하면 false', () => {
    expect(vibrate(30, {})).toBe(false)
    expect(vibrate(30, null)).toBe(false)
    expect(vibrate(30, { vibrate: () => { throw new Error('x') } })).toBe(false)
  })
  it('클리어는 vibrate(30)', () => {
    expect(HAPTICS.clear).toBe(30)
    const calls: unknown[] = []
    haptic('clear', { vibrate: (p: number | number[]) => { calls.push(p); return true } })
    expect(calls).toEqual([30])
  })
  it('꺼져 있으면 진동하지 않는다', () => {
    const calls: unknown[] = []
    haptic('latch', { vibrate: (p: number | number[]) => { calls.push(p); return true } }, false)
    expect(calls).toEqual([])
  })
})
