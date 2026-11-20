import { describe, expect, it, vi } from 'vitest'
import { claimFirstStroke, DEVICE_KEY, DEVICE_RE, deviceId, firstStrokeValue, HOME_LANDING_KEY } from './measure'

function mem(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init))
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }
}

describe('deviceId — 익명 기기 id(북극성)', () => {
  it('처음엔 만들어 저장하고, 다음부터 같은 값을 돌려준다', () => {
    const s = mem()
    const a = deviceId(s)
    expect(a).toMatch(DEVICE_RE)
    expect(s.m.get(DEVICE_KEY)).toBe(a)
    expect(deviceId(s)).toBe(a)
  })
  it('저장된 값이 형식 밖이면 새로 만든다(손상·옛 값이 AE로 새지 않게)', () => {
    const s = mem({ [DEVICE_KEY]: 'not ok!' })
    const a = deviceId(s)
    expect(a).not.toBe('not ok!')
    expect(a).toMatch(DEVICE_RE)
  })
  it('randomUUID가 없어도 서버 형식을 지킨다', () => {
    const orig = crypto.randomUUID
    vi.stubGlobal('crypto', { ...crypto, randomUUID: undefined })
    try {
      expect(deviceId(mem())).toMatch(DEVICE_RE)
    } finally {
      vi.unstubAllGlobals()
    }
    expect(crypto.randomUUID).toBe(orig)
  })
  it('저장소가 없거나 던지면 빈 문자열', () => {
    expect(deviceId(null)).toBe('')
    const boom = { getItem: () => { throw new Error('blocked') }, setItem: () => {} }
    expect(deviceId(boom)).toBe('')
  })
})

describe('claimFirstStroke — 탭당 첫 획 1회', () => {
  it('세션에서 한 번만 true', () => {
    const s = mem()
    expect(claimFirstStroke(s, '', false)).toBe(true)
    expect(claimFirstStroke(s, '', false)).toBe(false)
  })
  it('자동 검증(autoplay·webdriver)은 세지 않고 표시도 남기지 않는다', () => {
    const s = mem()
    expect(claimFirstStroke(s, '?autoplay=1', false)).toBe(false)
    expect(claimFirstStroke(s, '', true)).toBe(false)
    expect(s.m.size).toBe(0)
  })
  it('저장소 없음·차단이면 보내지 않는다(같은 탭 중복 전송 방지)', () => {
    expect(claimFirstStroke(null, '', false)).toBe(false)
    const boom = { getItem: () => { throw new Error('blocked') }, setItem: () => {} }
    expect(claimFirstStroke(boom, '', false)).toBe(false)
  })
})

describe('firstStrokeValue — 첫 붓기율 분자는 홈 landing 세션만', () => {
  it('홈 landing 표시가 있으면 1, 없으면 0', () => {
    expect(firstStrokeValue(mem({ [HOME_LANDING_KEY]: '1' }))).toBe(1)
    expect(firstStrokeValue(mem())).toBe(0)
    expect(firstStrokeValue(null)).toBe(0)
    expect(firstStrokeValue({ getItem: () => { throw new Error('blocked') } })).toBe(0)
  })
})
