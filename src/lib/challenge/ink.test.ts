import { describe, it, expect } from 'vitest'
import { InkLedger } from './ink'
import { buildIndex, PRESETS } from '@/lib/sand/materials'

const idx = buildIndex(PRESETS)
const counts = (m: Record<string, number>) => {
  const c = new Uint32Array(64)
  for (const [slug, n] of Object.entries(m)) c[idx.get(slug)!] = n
  return c
}

// 잉크 = GPU paint 패스가 실제로 채운 셀 수(재료별 atomic 카운터). 제자리에 계속 붓는 것도 비용이 든다.
describe('InkLedger', () => {
  it('처음엔 전부 0, left = 예산', () => {
    const l = new InkLedger({ water: 500, sand: 200 })
    expect(l.used('water')).toBe(0)
    expect(l.left('sand')).toBe(200)
    expect(l.total()).toBe(0)
  })
  it('GPU 카운터를 재료별로 반영', () => {
    const l = new InkLedger({ water: 500, sand: 200 })
    l.update(counts({ water: 120, sand: 30 }))
    expect(l.used('water')).toBe(120)
    expect(l.left('water')).toBe(380)
    expect(l.total()).toBe(150)
  })
  it('팔레트 밖 재료(예: 레벨 반응으로 생긴 것)는 잉크로 치지 않는다', () => {
    const l = new InkLedger({ water: 500 })
    l.update(counts({ water: 10, lava: 999 }))
    expect(l.total()).toBe(10)
  })
  it('left는 0 아래로 안 가고, spent는 예산 소진 여부', () => {
    const l = new InkLedger({ water: 100 })
    l.update(counts({ water: 140 }))
    expect(l.left('water')).toBe(0)
    expect(l.spent('water')).toBe(true)
    expect(l.used('water')).toBe(140) // 실제 사용량은 숨기지 않는다(소진 감지 지연만큼 초과 가능)
  })
  it('카운터가 줄어든 값(늦게 도착한 이전 readback)은 무시', () => {
    const l = new InkLedger({ water: 100 })
    l.update(counts({ water: 50 }))
    l.update(counts({ water: 20 }))
    expect(l.used('water')).toBe(50)
  })
  it('reset은 0으로', () => {
    const l = new InkLedger({ water: 100 })
    l.update(counts({ water: 50 }))
    l.reset()
    expect(l.used('water')).toBe(0)
  })
})
