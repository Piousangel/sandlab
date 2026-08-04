import { describe, it, expect } from 'vitest'
import { noteFirstTry, buildSuggestionPairs, pickSuggestion } from './discovery'

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

describe('buildSuggestionPairs (materials.ts reactions에서 파생)', () => {
  const mats = [
    { slug: 'water', name: 'Water', reactions: [] },
    { slug: 'lava', name: 'Lava', reactions: [{ with: 'water' }] },
    { slug: 'ice', name: 'Ice', reactions: [{ with: 'lava' }, { with: 'empty' }] },
    { slug: 'wall', name: 'Wall', reactions: [] },
  ]

  it('반응이 있는 쌍만, 중복 없이(양방향 합치기) 뽑는다', () => {
    const pairs = buildSuggestionPairs(mats)
    const keys = pairs.map((p) => [p.a, p.b].sort().join('|')).sort()
    expect(keys).toEqual(['ice|lava', 'lava|water'])
  })

  it("empty나 자기자신과의 반응은 제안쌍에서 뺀다", () => {
    const pairs = buildSuggestionPairs(mats)
    expect(pairs.some((p) => p.a === 'empty' || p.b === 'empty')).toBe(false)
  })

  it('상대 물질이 존재하지 않으면(테이블 불일치) 조용히 건너뛴다', () => {
    const broken = [{ slug: 'x', name: 'X', reactions: [{ with: 'ghost' }] }]
    expect(buildSuggestionPairs(broken)).toEqual([])
  })
})

describe('pickSuggestion (유휴 넛지)', () => {
  const pairs = buildSuggestionPairs([
    { slug: 'water', name: 'Water', reactions: [] },
    { slug: 'lava', name: 'Lava', reactions: [{ with: 'water' }] },
  ])

  it('둘 다 안 써본 쌍이면 제안한다', () => {
    expect(pickSuggestion(pairs, new Set(), () => 0)).toBe('Try Lava on Water')
  })

  it('한쪽만 써봤어도 아직 제안한다(조합 자체는 미완)', () => {
    expect(pickSuggestion(pairs, new Set(['lava']), () => 0)).toBe('Try Lava on Water')
  })

  it('둘 다 써봤으면 더 이상 넛지할 게 없다(null)', () => {
    expect(pickSuggestion(pairs, new Set(['lava', 'water']), () => 0)).toBeNull()
  })

  it('빈 쌍 목록이면 null', () => {
    expect(pickSuggestion([], new Set())).toBeNull()
  })
})
