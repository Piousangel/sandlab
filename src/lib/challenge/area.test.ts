import { describe, it, expect } from 'vitest'
import { canPaintAt, areaFor } from './area'

const area = { x: 100, y: 50, w: 200, h: 100 }

describe('canPaintAt', () => {
  it('브러시 원 전체가 영역 안일 때만 허용', () => {
    expect(canPaintAt(area, 200, 100, 10)).toBe(true)
    expect(canPaintAt(area, 105, 100, 5)).toBe(true) // 왼쪽 끝에 딱 붙음
    expect(canPaintAt(area, 104, 100, 5)).toBe(false)
    expect(canPaintAt(area, 200, 145, 5)).toBe(false) // 아래 경계 넘음(y+h=150 미포함)
    expect(canPaintAt(area, 200, 144, 5)).toBe(true)
  })
})

describe('areaFor', () => {
  it('재료별 영역이 있으면 그것, 없으면 기본 paintArea', () => {
    const l = { paintArea: area, areaFor: { fire: { x: 0, y: 0, w: 10, h: 10 } } }
    expect(areaFor(l, 'fire')).toEqual({ x: 0, y: 0, w: 10, h: 10 })
    expect(areaFor(l, 'oil')).toBe(area)
    expect(areaFor({ paintArea: area }, 'oil')).toBe(area)
  })
})
