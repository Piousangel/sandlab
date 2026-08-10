import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCreatorName, setCreatorName, getCreatorId } from './creator'

describe('creator identity (localStorage)', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    })
  })

  it('한 번도 이름을 안 정했으면 name과 id 둘 다 undefined', () => {
    expect(getCreatorName()).toBeUndefined()
    expect(getCreatorId()).toBeUndefined()
  })

  it('이름을 스킵(빈 문자열)해도 다시 물어보지 않을 수 있게 빈 문자열을 저장하되, id는 안 만든다', () => {
    setCreatorName('')
    expect(getCreatorName()).toBe('') // undefined가 아님 = "이미 물어봤다"는 신호
    expect(getCreatorId()).toBeUndefined()
  })

  it('처음 이름을 지정하면 id가 새로 생기고, 이후엔 같은 id를 유지한다', () => {
    setCreatorName('Nova')
    const id1 = getCreatorId()
    expect(getCreatorName()).toBe('Nova')
    expect(id1).toBeDefined()
    expect(id1!.length).toBeGreaterThanOrEqual(6)

    setCreatorName('Nova Renamed')
    expect(getCreatorName()).toBe('Nova Renamed')
    expect(getCreatorId()).toBe(id1) // 개명해도 id는 그대로
  })

  it('localStorage가 던져도(프라이빗 모드) 예외를 밖으로 내지 않는다', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(() => setCreatorName('X')).not.toThrow()
    expect(getCreatorName()).toBeUndefined()
    expect(getCreatorId()).toBeUndefined()
  })
})
