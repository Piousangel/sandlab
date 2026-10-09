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
  it('자기 반응표의 반응은 undergoes에 나온다 (물 + 용암)', () => {
    const { undergoes } = reactionsOf('water')
    const lava = undergoes.find((r) => r.partner === 'lava')
    expect(lava).toBeDefined()
    expect(lava!.chance).toBe(0.7)
    expect(lava!.text).toBe('Touching Lava: turns into Steam; the Lava turns into Stone.')
  })
  it('다른 재료 반응표에 적힌 반응은 상대 페이지 causes에 나온다 (용암 페이지에 물 반응)', () => {
    const { causes } = reactionsOf('lava')
    const water = causes.find((r) => r.partner === 'water')
    expect(water).toBeDefined()
    expect(water!.text).toBe('Touching Water: the Water turns into Steam; this Lava turns into Stone.')
  })
  it("'self'/'empty' 센티넬은 사람 문장으로 바뀐다", () => {
    // salt: { with: 'water', become: 'empty', other: 'water' } → 소금은 사라지고 물은 그대로
    const salt = reactionsOf('salt').undergoes.find((r) => r.partner === 'water')!
    expect(salt.text).toBe('Touching Water: dissolves away; the Water stays Water.')
    // acid: { with: 'metal', become: 'self', other: 'empty' }
    const acid = reactionsOf('acid').undergoes.find((r) => r.partner === 'metal')!
    expect(acid.text).toBe('Touching Metal: stays Acid; the Metal dissolves away.')
    // wood: { with: 'fire', become: 'fire', other: 'self' } → 이웃 불이 나무가 됨(셰이더 의미 그대로)
    const wood = reactionsOf('wood').undergoes.find((r) => r.partner === 'fire')!
    expect(wood.text).toBe('Touching Fire: turns into Fire; the Fire turns into Wood.')
    for (const m of guideMaterials()) {
      const { causes, undergoes } = reactionsOf(m.slug)
      for (const r of [...causes, ...undergoes]) {
        expect(r.text).not.toMatch(/\bself\b|\bempty\b|Empty/)
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
