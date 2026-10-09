import { describe, it, expect } from 'vitest'
import { hold, drag } from './helpers'

describe('모범답안 헬퍼', () => {
  it('hold: 같은 점을 n틱', () => {
    expect(hold(10, 'water', 6, 100, 50, 3)).toEqual({ tick: 10, mat: 'water', r: 6, pts: [[100, 50], [100, 50], [100, 50]] })
  })
  it('drag: 양끝 포함 n틱 동안 직선 보간(정수 반올림)', () => {
    const s = drag(0, 'sand', 4, 0, 0, 10, 0, 6)
    expect(s.pts).toEqual([[0, 0], [2, 0], [4, 0], [6, 0], [8, 0], [10, 0]])
  })
})
