import { describe, it, expect } from 'vitest'
import { transformLevel, xRange } from './transform'
import { LEVELS } from '../levels'
import { buildGrid, GRID_W } from '../grid'

const fill = LEVELS.find((l) => l.id === 'fill-cup')!

describe('transformLevel', () => {
  it('dx=0, mirror=false는 같은 격자', () => {
    const t = transformLevel(fill, { dx: 0, mirror: false }, 'x')
    expect(buildGrid(t)).toEqual(buildGrid(fill))
  })
  it('반전 두 번 = 원래', () => {
    const once = transformLevel(fill, { dx: 0, mirror: true }, 'x')
    const twice = transformLevel(once, { dx: 0, mirror: true }, 'x')
    expect(buildGrid(twice)).toEqual(buildGrid(fill))
    expect(twice.goals).toEqual(fill.goals)
    expect(twice.solution).toEqual(fill.solution)
  })
  it('반전은 격자를 좌우로 뒤집는다(셀 단위)', () => {
    const g = buildGrid(fill)
    const m = buildGrid(transformLevel(fill, { dx: 0, mirror: true }, 'x'))
    for (let y = 370; y < 570; y += 7) for (let x = 0; x < GRID_W; x += 13) expect(m[y * GRID_W + (GRID_W - 1 - x)]).toBe(g[y * GRID_W + x])
  })
  it('dx 이동: 모든 좌표가 같이 움직인다', () => {
    const t = transformLevel(fill, { dx: 100, mirror: false }, 'x')
    expect(t.paintArea.x).toBe(fill.paintArea.x + 100)
    expect(t.solution[0].pts[0][0]).toBe(fill.solution[0].pts[0][0] + 100)
    const z = t.goals[0] as { zone: { x: number } }
    expect(z.zone.x).toBe((fill.goals[0] as { zone: { x: number } }).zone.x + 100)
  })
  it('id를 바꾸고, xRange는 격자를 벗어나지 않는 dx 범위', () => {
    expect(transformLevel(fill, { dx: 0, mirror: false }, 'd-001').id).toBe('d-001')
    const [lo, hi] = xRange(fill)
    expect(lo).toBeLessThanOrEqual(0)
    expect(hi).toBeGreaterThanOrEqual(0)
  })
})
