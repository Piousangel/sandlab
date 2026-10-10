/**
 * 반응 패스 (§7.2 틱 순서 4) — 이웃 4방향, 비순서쌍마다 한 번(오른쪽·아래 이웃만 본다).
 *
 * 규칙은 (actor, other) 순서쌍으로 적고 반대 방향도 자동 등록한다. 확률은 Q16 정수.
 * 이번 틱에 반응한 셀은 moved에 REACTED 비트를 켜서 같은 틱 연쇄(스캔 방향으로 순간 전파)를 막는다.
 * dirt와 wall은 어떤 규칙에도 등장하지 않는다(불활성).
 *
 * 연소(스펙 "wood는 life 기반으로 약 2초 버팁니다"): fire/lava가 wood·plank에 붙으면 그 셀은
 * 곧장 불이 되지 않고 "타는 중"(life = BURN 틱)이 된다. burnPass가 타는 셀의 life를 깎고,
 * 위·옆(아래는 아님 — 불은 위로 번진다)으로 번지게 하고, 다 타면 불(fire)로 바꾼다.
 */
import type { Grid } from './grid'
import { H, W } from './grid'
import { BURN, INIT_LIFE, M, MAT_COUNT } from './materials'
import { hash32, q16, roll } from './rng'

export const REACTED = 2
const KEEP = 255

export interface Rule {
  a: number
  b: number
  chance: number
  /** a가 무엇이 되는가 (KEEP = 그대로) */
  aTo: number
  /** b가 무엇이 되는가 (KEEP = 그대로) */
  bTo: number
  /** b(가연 고체)를 "타는 중"으로 만든다 — 이미 타는 중이면 무시 */
  bIgnite?: boolean
  /** 성공 시 a가 empty로 소모될 확률(Q16) — 산 소모 */
  aConsume?: number
}

/** §7.2 반응표. 퍼센트 → Q16. */
export const RULES: Rule[] = [
  { a: M.water, b: M.lava, chance: q16(100), aTo: M.steam, bTo: M.stone },
  { a: M.water, b: M.fire, chance: q16(50), aTo: M.steam, bTo: M.empty },
  { a: M.fire, b: M.wood, chance: q16(8), aTo: KEEP, bTo: KEEP, bIgnite: true },
  { a: M.fire, b: M.plank, chance: q16(15), aTo: KEEP, bTo: KEEP, bIgnite: true },
  { a: M.fire, b: M.fuse, chance: q16(90), aTo: KEEP, bTo: M.fire },
  { a: M.fire, b: M.oil, chance: q16(50), aTo: KEEP, bTo: M.fire },
  { a: M.lava, b: M.wood, chance: q16(30), aTo: KEEP, bTo: KEEP, bIgnite: true },
  { a: M.lava, b: M.plank, chance: q16(30), aTo: KEEP, bTo: KEEP, bIgnite: true },
  { a: M.fire, b: M.ice, chance: q16(10), aTo: KEEP, bTo: M.water },
  { a: M.lava, b: M.ice, chance: q16(10), aTo: KEEP, bTo: M.water },
  { a: M.acid, b: M.metal, chance: q16(5), aTo: KEEP, bTo: M.smoke, aConsume: q16(25) },
  { a: M.acid, b: M.stone, chance: q16(5), aTo: KEEP, bTo: M.smoke, aConsume: q16(25) },
  { a: M.acid, b: M.wood, chance: q16(5), aTo: KEEP, bTo: M.smoke, aConsume: q16(25) },
  { a: M.acid, b: M.plank, chance: q16(5), aTo: KEEP, bTo: M.smoke, aConsume: q16(25) },
  { a: M.acid, b: M.water, chance: q16(20), aTo: M.steam, bTo: M.steam },
]

/** 타는 셀이 이웃에 번지는 확률(Q16). 위쪽 기준이고 옆은 절반. */
export const BURN_SPREAD = new Int32Array(MAT_COUNT)
BURN_SPREAD[M.wood] = q16(8)
BURN_SPREAD[M.plank] = q16(15)
/** 타는 셀 바로 위 빈칸에 불꽃(fire)이 피어오를 확률 */
export const FLAME_Q16 = q16(20)

/** (m1*MAT_COUNT + m2) → 규칙 인덱스*2 + (뒤집힘 ? 1 : 0), 없으면 -1 */
const LUT = new Int16Array(MAT_COUNT * MAT_COUNT).fill(-1)
/** 규칙에 한 번이라도 등장하는 재료 — 아니면 스캔에서 바로 건너뛴다 */
const REACTIVE = new Uint8Array(256)
RULES.forEach((r, k) => {
  LUT[r.a * MAT_COUNT + r.b] = k * 2
  LUT[r.b * MAT_COUNT + r.a] = k * 2 + 1
  REACTIVE[r.a] = 1
  REACTIVE[r.b] = 1
})

const REACT_SALT = 0x5bd1e995
/** 해시 하나에서 독립적인 두 번째 값을 뽑는다(정수 재혼합) */
const remix = (h: number) => Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0
const BURN_SALT = 0x27d4eb2f

function apply(g: Grid, ia: number, ib: number, r: Rule, h: number): boolean {
  const { mat, life, moved } = g
  let changed = false
  if (r.bIgnite) {
    if (life[ib] === 0) { life[ib] = BURN[mat[ib]]; changed = true }
  } else if (r.bTo !== KEEP) {
    mat[ib] = r.bTo
    life[ib] = INIT_LIFE[r.bTo]
    changed = true
  }
  if (r.aTo !== KEEP) { mat[ia] = r.aTo; life[ia] = INIT_LIFE[r.aTo]; changed = true }
  else if (changed && r.aConsume && roll(h >>> 16, r.aConsume)) { mat[ia] = M.empty; life[ia] = 0 }
  if (changed) { moved[ia] |= REACTED; moved[ib] |= REACTED }
  return changed
}

/** 반환값 = 반응 성공 횟수 */
export function reactPass(g: Grid, tick: number, salt: number): number {
  const { mat, moved } = g
  // 다른 모듈에서 온 상수·함수는 지역 별칭으로 — 번들러가 CJS 게터로 감싸면 핫 루프에서 느려진다
  const _W = W, _H = H, _hash32 = hash32, _roll = roll, _M = M
  let n = 0
  for (let y = 0; y < _H; y++) {
    const row = y * _W
    for (let x = 0; x < _W; x++) {
      const i = row + x
      const m = mat[i]
      if (REACTIVE[m] === 0 || (moved[i] & REACTED) !== 0) continue
      const base = m * MAT_COUNT
      for (let dir = 0; dir < 2; dir++) {
        let j: number
        if (dir === 0) { if (x + 1 >= _W) continue; j = i + 1 } else { if (y + 1 >= _H) continue; j = i + _W }
        const code = LUT[base + mat[j]]
        if (code < 0 || (moved[j] & REACTED) !== 0) continue
        const r = RULES[code >> 1]
        const h = _hash32(x, y * 2 + dir, tick, salt ^ REACT_SALT)
        if (!_roll(h, r.chance)) continue
        if (code & 1 ? apply(g, j, i, r, h) : apply(g, i, j, r, h)) n++
        if ((moved[i] & REACTED) !== 0) break
      }
    }
  }
  return n
}

const Q_FUSE = q16(90)
const Q_OIL = q16(50)
const Q_ICE = q16(10)
const FIRE_LIFE = INIT_LIFE[M.fire]

function burnInto(g: Grid, j: number, chanceQ16: number, h: number): void {
  const { mat, life, moved } = g
  const t = mat[j]
  const burn = BURN[t]
  if (burn !== 0) {
    if (life[j] === 0 && roll(h, chanceQ16 === 0 ? BURN_SPREAD[t] : chanceQ16)) { life[j] = burn; moved[j] |= REACTED }
  } else if (t === M.fuse) {
    if (roll(h, Q_FUSE)) { mat[j] = M.fire; life[j] = FIRE_LIFE; moved[j] |= REACTED }
  } else if (t === M.oil) {
    if (roll(h, Q_OIL)) { mat[j] = M.fire; life[j] = FIRE_LIFE; moved[j] |= REACTED }
  } else if (t === M.ice) {
    if (roll(h, Q_ICE)) { mat[j] = M.water; life[j] = 0; moved[j] |= REACTED }
  }
}

/** 타는 가연 고체 처리. 반환값 = 타는 셀 수(활동량) */
export function burnPass(g: Grid, tick: number, salt: number): number {
  const { mat, life, moved } = g
  // 다른 모듈에서 온 상수·함수는 지역 별칭으로 — 번들러가 CJS 게터로 감싸면 핫 루프에서 느려진다
  const _W = W, _H = H, _hash32 = hash32, _roll = roll, _BURN = BURN, _INIT_LIFE = INIT_LIFE, _M = M
  let n = 0
  for (let y = 0; y < _H; y++) {
    const row = y * _W
    for (let x = 0; x < _W; x++) {
      const i = row + x
      const m = mat[i]
      if (_BURN[m] === 0 || life[i] === 0 || (moved[i] & REACTED) !== 0) continue
      n++
      if (life[i] <= 1) { mat[i] = _M.fire; life[i] = _INIT_LIFE[_M.fire]; continue }
      life[i]--
      const h = _hash32(x, y, tick, salt ^ BURN_SALT)
      const h2 = remix(h)
      const h3 = remix(h2)
      // 위
      if (y > 0) {
        const j = i - _W
        if (mat[j] === _M.empty) {
          if (_roll(h >>> 16, FLAME_Q16)) { mat[j] = _M.fire; life[j] = _INIT_LIFE[_M.fire]; moved[j] |= REACTED }
        } else burnInto(g, j, 0, h)
      }
      // 옆 (위쪽 확률의 절반)
      if (x > 0 && _BURN[mat[i - 1]] !== 0) burnInto(g, i - 1, BURN_SPREAD[mat[i - 1]] >> 1, h2)
      else if (x > 0) burnInto(g, i - 1, 0, h2)
      if (x + 1 < _W && _BURN[mat[i + 1]] !== 0) burnInto(g, i + 1, BURN_SPREAD[mat[i + 1]] >> 1, h3)
      else if (x + 1 < _W) burnInto(g, i + 1, 0, h3)
    }
  }
  return n
}
