import { describe, it, expect } from 'vitest'
import { PRESETS } from '@/lib/sand/materials'
import { guideMaterials, materialBySlug, reactionsOf, chanceLabel } from './reactions'

describe('guideMaterials', () => {
  it('empty를 제외한 모든 재료를 PRESETS 순서로 돌려준다', () => {
    const slugs = guideMaterials().map((m) => m.slug)
    expect(slugs).not.toContain('empty')
    expect(slugs).toEqual(PRESETS.filter((m) => m.slug !== 'empty').map((m) => m.slug))
  })
  it('materialBySlug는 empty와 없는 slug에 undefined', () => {
    expect(materialBySlug('empty')).toBeUndefined()
    expect(materialBySlug('nope')).toBeUndefined()
    expect(materialBySlug('lava')?.name).toBe('Lava')
  })
})

describe('reactionsOf', () => {
  it('자기 반응표의 반응은 undergoes에 나온다 (물 + 용암, 둘 다 바뀜)', () => {
    const { undergoes } = reactionsOf('water')
    const lava = undergoes.find((r) => r.partner === 'lava')
    expect(lava).toBeDefined()
    expect(lava!.chance).toBe(0.7)
    expect(lava!.text).toBe('Touching Lava: turns into Steam, and the Lava turns into Stone.')
  })
  it('다른 재료 반응표에 적힌 반응은 상대 페이지 causes에 나온다 (용암 페이지에 물 반응)', () => {
    const { causes } = reactionsOf('lava')
    const water = causes.find((r) => r.partner === 'water')
    expect(water).toBeDefined()
    expect(water!.text).toBe('Touching Water: the Water turns into Steam, and this Lava turns into Stone.')
  })
  it('바뀌지 않는 쪽은 문장에서 빠진다 (군더더기 "stays X" 금지)', () => {
    // salt: { with: 'water', become: 'empty', other: 'water' } → 소금만 사라짐
    expect(reactionsOf('salt').undergoes.find((r) => r.partner === 'water')!.text).toBe('Touching Water: dissolves away.')
    expect(reactionsOf('water').causes.find((r) => r.partner === 'salt')!.text).toBe('Touching Salt: the Salt dissolves away.')
    // acid: { with: 'metal', become: 'self', other: 'empty' } → 산은 그대로, 금속만 사라짐
    expect(reactionsOf('acid').undergoes.find((r) => r.partner === 'metal')!.text).toBe('Touching Metal: dissolves the Metal.')
    expect(reactionsOf('metal').causes.find((r) => r.partner === 'acid')!.text).toBe('Touching Acid: this Metal dissolves away.')
    // wood: { with: 'fire', become: 'fire', other: 'fire' } → 나무만 불이 됨
    expect(reactionsOf('wood').undergoes.find((r) => r.partner === 'fire')!.text).toBe('Touching Fire: turns into Fire.')
    expect(reactionsOf('fire').causes.find((r) => r.partner === 'wood')!.text).toBe('Touching Wood: the Wood turns into Fire.')
    // ice: { with: 'water', become: 'self', other: 'self' } → 얼음이 물을 얼린다(번짐)
    expect(reactionsOf('ice').undergoes.find((r) => r.partner === 'water')!.text).toBe('Touching Water: turns the Water into Ice.')
    expect(reactionsOf('water').causes.find((r) => r.partner === 'ice')!.text).toBe('Touching Ice: this Water turns into Ice.')
    for (const m of guideMaterials()) {
      const { causes, undergoes } = reactionsOf(m.slug)
      for (const r of [...causes, ...undergoes]) {
        expect(r.text).not.toMatch(/\bself\b|\bempty\b|Empty|\bstays\b/)
      }
    }
  })
  it('모든 반응이 정확히 두 번(undergoes 1 + causes 1) 나온다', () => {
    const total = PRESETS.reduce((n, m) => n + m.reactions.length, 0)
    let u = 0
    let c = 0
    for (const m of guideMaterials()) {
      const r = reactionsOf(m.slug)
      u += r.undergoes.length
      c += r.causes.length
    }
    expect(u).toBe(total)
    expect(c).toBe(total)
  })
  it('반응 없는 재료는 빈 배열', () => {
    expect(reactionsOf('wall')).toEqual({ causes: [], undergoes: [] })
  })
})

describe('chanceLabel', () => {
  it('확률 구간을 말로 바꾼다', () => {
    expect(chanceLabel(0.9)).toBe('almost instant')
    expect(chanceLabel(0.5)).toBe('fast')
    expect(chanceLabel(0.2)).toBe('steady')
    expect(chanceLabel(0.05)).toBe('slow')
    expect(chanceLabel(0.01)).toBe('very slow')
  })
})
