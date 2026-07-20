/**
 * 물질 테이블 — 단일 진실 공급원(SSOT).
 *
 * 이 파일의 구조가 곧 로컬 LLM이 채우는 표의 구조다.
 * (scratchpad/element_test2.py 의 SCHEMA 와 필드가 1:1로 대응해야 한다.
 *  거기서 qwen2.5:1.5b 가 best-of-5 92%, 5/5 케이스 통과로 검증된 스키마다.)
 *
 * 모델은 코드를 쓰지 않는다. 이 표만 채운다.
 * 셰이더는 고정이고 이 표를 룩업할 뿐이라, 임의 코드 실행 위험이 없고
 * 검증이 기계적으로 가능하다.
 */

export type Movement = 'static' | 'powder' | 'liquid' | 'gas'

export const MOVEMENT_ID: Record<Movement, number> = {
  static: 0,
  powder: 1,
  liquid: 2,
  gas: 3,
}

export interface Reaction {
  /** 이 물질이 닿았을 때 반응할 상대 물질 slug */
  with: string
  /** 틱당 반응 확률 0..1 */
  chance: number
  /** 이 셀이 무엇이 되는가. 'self' = 그대로 */
  become: string
  /** 이웃 셀이 무엇이 되는가. 'self' = 이 물질이 됨, 'empty' = 사라짐 */
  other: string
}

export interface Material {
  slug: string
  name: string
  /** #RRGGBB */
  color: string
  /** 0(가벼움)~9(무거움). 무거운 게 가벼운 걸 뚫고 내려간다(swap). */
  density: number
  movement: Movement
  /** 소멸까지 틱 수. null = 영구 */
  lifetime: number | null
  /**
   * 발광 강도 0..3. 이 값이 이 시뮬의 '싸구려 느낌'을 가르는 단일 최대 변수다.
   * 불/용암이 스스로 빛나지 않으면 주황색 흙처럼 보인다.
   * 렌더 셰이더가 이웃을 샘플링해 빛을 누적한다(가짜 블룸, 추가 패스 없음).
   */
  emissive: number
  reactions: Reaction[]
}

/**
 * 프리셋 원소.
 * 첫 방문자는 이것만으로 논다 — 다운로드 0MB.
 * AI 원소 생성은 여기 위에 얹히는 옵션이다("설치 없음" 약속을 지키는 핵심).
 */
export const PRESETS: Material[] = [
  { slug: 'empty', name: 'Empty', color: '#07090D', density: 0, movement: 'gas', lifetime: null, emissive: 0, reactions: [] },

  // ── 고정 ──
  { slug: 'wall',  name: 'Wall',  color: '#525A6B', density: 9, movement: 'static', lifetime: null, emissive: 0, reactions: [] },
  { slug: 'stone', name: 'Stone', color: '#79808C', density: 8, movement: 'static', lifetime: null, emissive: 0, reactions: [] },
  { slug: 'metal', name: 'Metal', color: '#B9C2CE', density: 9, movement: 'static', lifetime: null, emissive: 0, reactions: [] },
  {
    slug: 'wood', name: 'Wood', color: '#6B4423', density: 7, movement: 'static', lifetime: null, emissive: 0,
    reactions: [{ with: 'fire', chance: 0.12, become: 'fire', other: 'self' }],
  },
  {
    slug: 'plant', name: 'Plant', color: '#43B04A', density: 6, movement: 'static', lifetime: null, emissive: 0,
    reactions: [
      { with: 'fire',  chance: 0.35, become: 'fire',  other: 'self' },
      { with: 'water', chance: 0.02, become: 'self',  other: 'plant' }, // 물 타고 자람
    ],
  },
  {
    slug: 'ice', name: 'Ice', color: '#A8E4EC', density: 4, movement: 'static', lifetime: null, emissive: 0.25,
    reactions: [
      { with: 'water', chance: 0.04, become: 'self',  other: 'self' },  // 물을 얼림
      { with: 'fire',  chance: 0.6,  become: 'water', other: 'steam' }, // 녹음
      { with: 'lava',  chance: 0.9,  become: 'water', other: 'stone' },
    ],
  },

  // ── 가루 ──
  { slug: 'sand', name: 'Sand', color: '#E8C87A', density: 5, movement: 'powder', lifetime: null, emissive: 0, reactions: [] },
  {
    slug: 'salt', name: 'Salt', color: '#F2F4F7', density: 5, movement: 'powder', lifetime: null, emissive: 0,
    reactions: [{ with: 'water', chance: 0.08, become: 'empty', other: 'water' }], // 녹아 없어짐
  },
  { slug: 'ash', name: 'Ash', color: '#5E5A57', density: 4, movement: 'powder', lifetime: null, emissive: 0, reactions: [] },
  {
    slug: 'gunpowder', name: 'Gunpowder', color: '#2E3033', density: 5, movement: 'powder', lifetime: null, emissive: 0,
    reactions: [
      { with: 'fire', chance: 0.85, become: 'fire', other: 'fire' },
      { with: 'lava', chance: 0.85, become: 'fire', other: 'fire' },
    ],
  },
  {
    slug: 'seed', name: 'Seed', color: '#B4D96A', density: 4, movement: 'powder', lifetime: null, emissive: 0,
    reactions: [{ with: 'water', chance: 0.06, become: 'plant', other: 'empty' }],
  },

  // ── 액체 ──
  {
    slug: 'water', name: 'Water', color: '#2E6FD9', density: 3, movement: 'liquid', lifetime: null, emissive: 0,
    reactions: [
      { with: 'fire', chance: 0.9, become: 'steam', other: 'steam' },
      { with: 'lava', chance: 0.7, become: 'steam', other: 'stone' },
    ],
  },
  {
    slug: 'oil', name: 'Oil', color: '#4A3520', density: 2, movement: 'liquid', lifetime: null, emissive: 0,
    reactions: [
      { with: 'fire', chance: 0.5, become: 'fire', other: 'self' },
      { with: 'lava', chance: 0.8, become: 'fire', other: 'self' },
    ],
  },
  {
    slug: 'acid', name: 'Acid', color: '#8CFF2E', density: 3, movement: 'liquid', lifetime: null, emissive: 1.1,
    reactions: [
      { with: 'metal', chance: 0.25, become: 'self', other: 'empty' },
      { with: 'stone', chance: 0.15, become: 'self', other: 'empty' },
      { with: 'wood',  chance: 0.3,  become: 'self', other: 'empty' },
      { with: 'water', chance: 0.5,  become: 'steam', other: 'steam' },
    ],
  },
  {
    slug: 'lava', name: 'Lava', color: '#FF5A0A', density: 6, movement: 'liquid', lifetime: null, emissive: 2.6,
    reactions: [
      { with: 'wood',  chance: 0.4, become: 'self', other: 'fire' },
      { with: 'plant', chance: 0.6, become: 'self', other: 'fire' },
      { with: 'oil',   chance: 0.7, become: 'self', other: 'fire' },
      { with: 'ice',   chance: 0.9, become: 'stone', other: 'water' },
    ],
  },

  // ── 기체 ──
  {
    slug: 'fire', name: 'Fire', color: '#FF7A18', density: 1, movement: 'gas', lifetime: 45, emissive: 3.0,
    reactions: [
      { with: 'wood',  chance: 0.15, become: 'self', other: 'fire' },
      { with: 'oil',   chance: 0.5,  become: 'self', other: 'fire' },
      { with: 'plant', chance: 0.3,  become: 'self', other: 'fire' },
    ],
  },
  { slug: 'steam', name: 'Steam', color: '#D6E2EA', density: 1, movement: 'gas', lifetime: 160, emissive: 0.22, reactions: [] },
  { slug: 'smoke', name: 'Smoke',   color: '#4C5058', density: 1, movement: 'gas', lifetime: 120, emissive: 0, reactions: [] },
]

/** 셰이더/URL이 참조하는 인덱스. PRESETS 순서가 곧 물질 ID다. */
export const EMPTY_ID = 0

export function buildIndex(mats: Material[]): Map<string, number> {
  const m = new Map<string, number>()
  mats.forEach((mat, i) => m.set(mat.slug, i))
  return m
}

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

/**
 * 물질 테이블 → GPU 버퍼 두 개로 평탄화.
 *
 * props[i]  = vec4<f32>(r, g, b, packed)
 *   packed = movementId + density*10 + (lifetime<0 ? 0 : lifetime)*100
 * reactions = 물질당 최대 4개, 고정 stride 로 평탄화 (GPU는 가변 길이를 싫어함)
 *   각 항목 = vec4<u32>(withId, becomeId, otherId, chanceQ)  chanceQ = chance*65535
 */
export const MAX_REACTIONS = 4
export const SELF_SENTINEL = 0xffff

export function packMaterials(mats: Material[]) {
  const idx = buildIndex(mats)
  // 물질당 vec4 2개: [0]=(r,g,b,packed), [1]=(emissive,0,0,0)
  const props = new Float32Array(mats.length * 8)
  const rx = new Uint32Array(mats.length * MAX_REACTIONS * 4)

  mats.forEach((m, i) => {
    const [r, g, b] = hexToRgb(m.color)
    props[i * 8 + 0] = r
    props[i * 8 + 1] = g
    props[i * 8 + 2] = b
    props[i * 8 + 3] =
      MOVEMENT_ID[m.movement] + m.density * 10 + (m.lifetime ?? 0) * 100
    props[i * 8 + 4] = m.emissive

    m.reactions.slice(0, MAX_REACTIONS).forEach((rr, j) => {
      const base = (i * MAX_REACTIONS + j) * 4
      const resolve = (s: string) => (s === 'self' ? SELF_SENTINEL : (idx.get(s) ?? EMPTY_ID))
      rx[base + 0] = idx.get(rr.with) ?? EMPTY_ID
      rx[base + 1] = resolve(rr.become)
      rx[base + 2] = resolve(rr.other)
      rx[base + 3] = Math.round(Math.max(0, Math.min(1, rr.chance)) * 65535)
    })
    // 빈 슬롯은 withId=EMPTY(0) + chance=0 이라 셰이더에서 자연히 무시됨
  })

  return { props, rx, count: mats.length }
}
