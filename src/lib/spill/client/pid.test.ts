import { describe, it, expect } from 'vitest'
import { getPid, isPid, PID_KEY } from './pid'

const mem = () => {
  const m = new Map<string, string>()
  return { m, s: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
}

describe('pid (128bit 랜덤)', () => {
  it('32자리 hex를 만들고 저장, 다음엔 같은 값', () => {
    const { m, s } = mem()
    const a = getPid(s)
    expect(isPid(a)).toBe(true)
    expect(m.get(PID_KEY)).toBe(a)
    expect(getPid(s)).toBe(a)
  })
  it('손상된 값은 새로 만든다', () => {
    const { m, s } = mem()
    m.set(PID_KEY, 'garbage')
    expect(isPid(getPid(s))).toBe(true)
    expect(m.get(PID_KEY)).not.toBe('garbage')
  })
  it('저장소가 throw해도 pid는 돌려준다', () => {
    const bad = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } }
    expect(isPid(getPid(bad))).toBe(true)
    expect(isPid(getPid(null))).toBe(true)
  })
  it('isPid', () => {
    expect(isPid('0123456789abcdef0123456789abcdef')).toBe(true)
    expect(isPid('0123456789ABCDEF0123456789abcdef')).toBe(false)
    expect(isPid('abc')).toBe(false)
    expect(isPid(5)).toBe(false)
  })
})
