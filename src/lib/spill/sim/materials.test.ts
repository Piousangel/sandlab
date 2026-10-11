import { describe, it, expect } from 'vitest'
import { MATS, M, matId, isGas, isLiquid, isStatic, weightOf } from './materials'

describe('퍼즐 재료 테이블 (§7.2 ID 고정)', () => {
  it('ID 순서가 스펙과 정확히 같다 — 추가는 끝에만', () => {
    expect(MATS.map((m) => m.slug)).toEqual([
      'empty', 'wall', 'dirt', 'stone', 'wood', 'plank', 'metal', 'ice', 'sand', 'water', 'oil',
      'acid', 'lava', 'fire', 'steam', 'smoke', 'fuse', 'gate', 'spout', 'vent', 'crate',
    ])
    MATS.forEach((m, i) => expect(m.id).toBe(i))
  })

  it('M 상수와 matId가 일치한다', () => {
    expect(M.water).toBe(9)
    expect(M.crate).toBe(20)
    expect(matId('lava')).toBe(12)
    expect(() => matId('plasma')).toThrow()
  })

  it('샌드박스와 같은 색·발광을 쓴다(브랜드 일관성)', () => {
    expect(MATS[M.water].color).toBe('#2E6FD9')
    expect(MATS[M.lava].color).toBe('#FF5A0A')
    expect(MATS[M.lava].glow).toBe(260)
    expect(MATS[M.fire].glow).toBe(300)
    for (const m of MATS) expect(m.color).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('수명은 §7.2 재설정 값', () => {
    expect(MATS[M.fire].lifetime).toBe(24)
    expect(MATS[M.steam].lifetime).toBe(90)
    expect(MATS[M.smoke].lifetime).toBe(60)
  })

  it('movement 분류', () => {
    expect(isStatic(M.fuse)).toBe(true)
    expect(isStatic(M.gate)).toBe(true)
    expect(isLiquid(M.oil)).toBe(true)
    expect(isGas(M.steam)).toBe(true)
    expect(isGas(M.empty)).toBe(false)
  })

  it('무게: 빈칸은 기체와 가장 가벼운 액체 사이(기체가 떠오른다)', () => {
    expect(weightOf(M.steam)).toBeLessThan(weightOf(M.empty))
    expect(weightOf(M.empty)).toBeLessThan(weightOf(M.oil))
    expect(weightOf(M.oil)).toBeLessThan(weightOf(M.water))
    expect(weightOf(M.water)).toBeLessThan(weightOf(M.sand))
    expect(weightOf(M.sand)).toBeLessThan(weightOf(M.lava))
  })
})
