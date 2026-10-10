/**
 * 반응 패스 (§7.2 틱 순서 4) — 이웃 4방향, 비순서쌍마다 한 번(오른쪽·아래 이웃만 본다).
 *
 * 규칙은 (actor, other) 순서쌍으로 적고 반대 방향도 자동 등록한다. 확률은 Q16 정수.
 * 이번 틱에 반응한 셀은 moved에 REACTED 비트를 켜서 같은 틱 연쇄(스캔 방향으로 순간 전파)를 막는다.
 * hp 규칙: 가연 고체(wood/plank)는 성공할 때마다 life(hp)를 1 깎고 1 이하에서 불이 된다.
 * dirt와 wall은 어떤 규칙에도 등장하지 않는다(불활성).
 */
import type { Grid } from './grid'
import { H, W } from './grid'
import { INIT_LIFE, M, MAT_COUNT } from './materials'
import { hash32, q16, roll } from './rng'

export const REACTED = 2
const KEEP = 255

export interface Rule {
  a: number
  b: number
  chance: number
  /** a가 무엇이 되는가 (KEEP = 그대로) */
  aTo: number
  /** b가 무엇이 되는가 */
  bTo: number
  /** b가 hp를 가진 가연 고체면 hp를 깎다가 0에서 bTo */
  bHp?: boolean
  /** 성공 시 a가 empty로 소모될 확률(Q16) — 산 소모 */
  aConsume?: number
}

/** §7.2 반응표. 퍼센트 → Q16. 스펙 값에서 바꾼 상수는 벤치 튜닝 결과다. */
export const RULES: Rule[] = [
  { a: M.water, b: M.lava, chance: q16(100), aTo: M.steam, bTo: M.stone },
  { a: M.water, b: M.fire, chance: q16(50), aTo: M.steam, bTo: M.empty },
  { a: M.fire, b: M.wood, chance: q16(8), aTo: KEEP, bTo: M.fire, bHp: true },
  { a: M.fire, b: M.plank, chance: q16(15), aTo: KEEP, bTo: M.fire, bHp: true },
  { a: M.fire, b: M.fuse, chance: q16(90), aTo: KEEP, bTo: M.fire },
  { a: M.fire, b: M.oil, chance: q16(50), aTo: KEEP, bTo: M.fire },
  { a: M.lava, b: M.wood, chance: q16(30), aTo: KEEP, bTo: M.fire, bHp: true },
  { a: M.lava, b: M.plank, chance: q16(30), aTo: KEEP, bTo: M.fire, bHp: true },
  { a: M.fire, b: M.ice, chance: q16(10), aTo: KEEP, bTo: M.water },
  { a: M.lava, b: M.ice, chance: q16(10), aTo: KEEP, bTo: M.water },
  { a: M.acid, b: M.metal, chance: q16(5), aTo: KEEP, bTo: M.smoke, aConsume: q16(25) },
  { a: M.acid, b: M.stone, chance: q16(5), aTo: KEEP, bTo: M.smoke, aConsume: q16(25) },
  { a: M.acid, b: M.wood, chance: q16(5), aTo: KEEP, bTo: M.smoke, aConsume: q16(25) },
  { a: M.acid, b: M.plank, chance: q16(5), aTo: KEEP, bTo: M.smoke, aConsume: q16(25) },
  { a: M.acid, b: M.water, chance: q16(20), aTo: M.steam, bTo: M.steam },
]

/** (m1*MAT_COUNT + m2) → 규칙 인덱스*2 + (뒤집힘 ? 1 : 0), 없으면 -1 */
const LUT = new Int16Array(MAT_COUNT * MAT_COUNT).fill(-1)
RULES.forEach((r, k) => {
  LUT[r.a * MAT_COUNT + r.b] = k * 2
  LUT[r.b * MAT_COUNT + r.a] = k * 2 + 1
})

const REACT_SALT = 0x5bd1e995

function apply(g: Grid, ia: number, ib: number, r: Rule, h: number): void {
  const { mat, life, moved } = g
  let changed = false
  if (r.bHp && life[ib] > 1) {
    life[ib]--
  } else {
    if (r.bTo !== KEEP) { mat[ib] = r.bTo; life[ib] = INIT_LIFE[r.bTo]; changed = true }
  }
  if (r.aTo !== KEEP) { mat[ia] = r.aTo; life[ia] = INIT_LIFE[r.aTo]; changed = true }
  else if (r.aConsume && roll(h >>> 16, r.aConsume)) { mat[ia] = M.empty; life[ia] = 0; changed = true }
  if (changed) { moved[ia] |= REACTED; moved[ib] |= REACTED }
}

/** 반환값 = 반응 성공 횟수 */
export function reactPass(g: Grid, tick: number, salt: number): number {
  const { mat, moved } = g
  let n = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const m = mat[i]
      if (m === M.empty || (moved[i] & REACTED) !== 0) continue
      const base = m * MAT_COUNT
      // 오른쪽, 아래 이웃 (각 비순서쌍은 한 번만 본다)
      for (let dir = 0; dir < 2; dir++) {
        if (dir === 0 ? x + 1 >= W : y + 1 >= H) continue
        const j = dir === 0 ? i + 1 : i + W
        if ((moved[j] & REACTED) !== 0 || (moved[i] & REACTED) !== 0) continue
        const code = LUT[base + mat[j]]
        if (code < 0) continue
        const r = RULES[code >> 1]
        const h = hash32(x, y * 2 + dir, tick, salt ^ REACT_SALT)
        if (!roll(h, r.chance)) continue
        if (code & 1) apply(g, j, i, r, h)
        else apply(g, i, j, r, h)
        n++
      }
    }
  }
  return n
}
