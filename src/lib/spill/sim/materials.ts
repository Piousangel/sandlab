/**
 * 퍼즐 전용 재료 테이블 (§7.2). ID는 배열 순서로 고정 — 추가는 끝에만.
 *
 * 샌드박스 src/lib/sand/materials.ts 를 import 하지 않는다(§7.1: 샌드박스 0바이트 변경,
 * ID 공간 분리). 색과 발광값은 브랜드 일관성을 위해 샌드박스 값을 그대로 복사했다.
 * 샌드박스에 없는 재료(dirt, plank, fuse, gate, spout, vent, crate)는 여기서 새로 정했다.
 *
 * glow: 샌드박스 emissive × 100 (정수). 렌더 전용 — 시뮬은 읽지 않는다.
 * burn: 가연 고체가 불붙은 뒤 타는 틱 수(스펙 "wood는 life 기반으로 약 2초 버팁니다").
 *       life 0 = 멀쩡함, life > 0 = 타는 중(남은 틱). 0에 닿으면 불(fire)이 된다.
 */

export type Movement = 'static' | 'powder' | 'liquid' | 'gas'

export interface PuzzleMaterial {
  id: number
  slug: string
  color: string
  /** 0~9. 샌드박스와 같은 의미: 무거운 게 가벼운 걸 뚫고 내려간다. */
  density: number
  movement: Movement
  /** 소멸까지 틱 수. 0 = 영구 */
  lifetime: number
  glow: number
  burn: number
}

type Row = Omit<PuzzleMaterial, 'id'>

const ROWS: Row[] = [
  { slug: 'empty', color: '#07090D', density: 0, movement: 'gas', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'wall', color: '#525A6B', density: 9, movement: 'static', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'dirt', color: '#5C4632', density: 9, movement: 'static', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'stone', color: '#79808C', density: 8, movement: 'static', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'wood', color: '#6B4423', density: 7, movement: 'static', lifetime: 0, glow: 0, burn: 120 },
  { slug: 'plank', color: '#9A6B3A', density: 7, movement: 'static', lifetime: 0, glow: 0, burn: 100 },
  { slug: 'metal', color: '#B9C2CE', density: 9, movement: 'static', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'ice', color: '#A8E4EC', density: 4, movement: 'static', lifetime: 0, glow: 25, burn: 0 },
  { slug: 'sand', color: '#E8C87A', density: 5, movement: 'powder', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'water', color: '#2E6FD9', density: 3, movement: 'liquid', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'oil', color: '#4A3520', density: 2, movement: 'liquid', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'acid', color: '#8CFF2E', density: 3, movement: 'liquid', lifetime: 0, glow: 110, burn: 0 },
  { slug: 'lava', color: '#FF5A0A', density: 6, movement: 'liquid', lifetime: 0, glow: 260, burn: 0 },
  { slug: 'fire', color: '#FF7A18', density: 1, movement: 'gas', lifetime: 24, glow: 300, burn: 0 },
  { slug: 'steam', color: '#D6E2EA', density: 1, movement: 'gas', lifetime: 90, glow: 22, burn: 0 },
  { slug: 'smoke', color: '#4C5058', density: 1, movement: 'gas', lifetime: 60, glow: 0, burn: 0 },
  { slug: 'fuse', color: '#B0413E', density: 9, movement: 'static', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'gate', color: '#C9A227', density: 9, movement: 'static', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'spout', color: '#3B4A66', density: 9, movement: 'static', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'vent', color: '#2B3340', density: 9, movement: 'static', lifetime: 0, glow: 0, burn: 0 },
  { slug: 'crate', color: '#C08A3E', density: 9, movement: 'static', lifetime: 0, glow: 0, burn: 0 },
]

export const MATS: readonly PuzzleMaterial[] = ROWS.map((r, id) => ({ id, ...r }))

export const M = {
  empty: 0, wall: 1, dirt: 2, stone: 3, wood: 4, plank: 5, metal: 6, ice: 7, sand: 8, water: 9, oil: 10,
  acid: 11, lava: 12, fire: 13, steam: 14, smoke: 15, fuse: 16, gate: 17, spout: 18, vent: 19, crate: 20,
} as const

export type MatSlug = keyof typeof M
export const MAT_COUNT = MATS.length

const BY_SLUG = new Map(MATS.map((m) => [m.slug, m.id]))

export function matId(slug: string): number {
  const id = BY_SLUG.get(slug)
  if (id === undefined) throw new Error(`unknown puzzle material: ${slug}`)
  return id
}

const MOVE_CODE: Record<Movement, number> = { static: 0, powder: 1, liquid: 2, gas: 3 }

/** 룩업 테이블 — 핫 루프에서 객체 접근 대신 쓴다. */
export const MOVE = Uint8Array.from(MATS, (m) => MOVE_CODE[m.movement])
/** 낙하 판정 무게: 밀도×2, 빈칸=3 (샌드박스 weightOf와 같다 — 기체(2)는 빈칸(3)보다 가벼워 뜬다). */
export const WEIGHT = Uint8Array.from(MATS, (m) => (m.id === 0 ? 3 : m.density * 2))
export const LIFETIME = Uint8Array.from(MATS, (m) => m.lifetime)
/** 새로 생긴 셀의 life 초기값: 기체는 수명, 나머지는 0(가연 고체는 멀쩡한 상태). */
export const INIT_LIFE = Uint8Array.from(MATS, (m) => m.lifetime)
/** 불붙은 가연 고체의 연소 틱 수 */
export const BURN = Uint8Array.from(MATS, (m) => m.burn)

export const MV_STATIC = 0
export const MV_POWDER = 1
export const MV_LIQUID = 2
export const MV_GAS = 3

export const isStatic = (m: number) => MOVE[m] === MV_STATIC
export const isLiquid = (m: number) => MOVE[m] === MV_LIQUID
export const isGas = (m: number) => m !== M.empty && MOVE[m] === MV_GAS
export const weightOf = (m: number) => WEIGHT[m]
