import { describe, it, expect } from 'vitest'
import { brushAt } from './replay'
import { buildIndex, PRESETS } from '@/lib/sand/materials'
import type { Stroke } from './types'

const idx = buildIndex(PRESETS)
const sol: Stroke[] = [
  { tick: 10, mat: 'water', r: 6, pts: [[100, 50], [110, 50], [120, 50]] },
  { tick: 11, mat: 'sand', r: 4, pts: [[5, 5]] },
]

describe('brushAt', () => {
  it('획 범위 밖은 null', () => {
    expect(brushAt(sol, 9, idx)).toBeNull()
    expect(brushAt(sol, 13, idx)).toBeNull()
  })
  it('범위 안이면 그 틱의 점·재료·반지름', () => {
    expect(brushAt(sol, 10, idx)).toEqual({ x: 100, y: 50, r: 6, mat: idx.get('water') })
    expect(brushAt(sol, 12, idx)).toEqual({ x: 120, y: 50, r: 6, mat: idx.get('water') })
  })
  it('겹치면 먼저 정의된 획', () => {
    expect(brushAt(sol, 11, idx)!.mat).toBe(idx.get('water'))
  })
})
