import { describe, it, expect } from 'vitest'
import { noteFirstTry } from './discovery'

describe('noteFirstTry (세션 스코프 재료 발견)', () => {
  it('처음 쓰는 재료는 메시지를 돌려주고 tried에 추가한다', () => {
    const tried = new Set<string>()
    expect(noteFirstTry(tried, 'sand', 'Sand', 5)).toBe('New: Sand (1/5 tried)')
    expect(tried.has('sand')).toBe(true)
  })

  it('이미 써본 재료는 null(중복 토스트 없음)', () => {
    const tried = new Set<string>(['sand'])
    expect(noteFirstTry(tried, 'sand', 'Sand', 5)).toBeNull()
  })

  it('empty(지우개)는 절대 발견으로 안 친다', () => {
    const tried = new Set<string>()
    expect(noteFirstTry(tried, 'empty', 'Empty', 5)).toBeNull()
    expect(tried.size).toBe(0)
  })

  it('카운트가 재료마다 누적된다', () => {
    const tried = new Set<string>()
    expect(noteFirstTry(tried, 'sand', 'Sand', 3)).toBe('New: Sand (1/3 tried)')
    expect(noteFirstTry(tried, 'water', 'Water', 3)).toBe('New: Water (2/3 tried)')
    expect(noteFirstTry(tried, 'water', 'Water', 3)).toBeNull() // 두 번째는 중복
  })

  it('마지막 재료를 다 써보면 완료 메시지로 바뀐다', () => {
    const tried = new Set<string>(['sand', 'water'])
    expect(noteFirstTry(tried, 'lava', 'Lava', 3)).toBe('New: Lava — every material tried!')
  })
})
