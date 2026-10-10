/**
 * Margolus 2×2 패스 (§7.2 틱 순서 2). 오프셋은 tick&1로 (0,0)↔(1,1) 교대.
 *
 * 의미론은 샌드박스 SIM_WGSL simulate()를 따른다: 세로 가라앉기 → 대각선(flip 무작위 순서)
 * → 액체 좌우 50% 교환. 무게는 밀도×2, 빈칸=3이라 기체는 빈칸과 자리를 바꾸며 떠오른다.
 * 퍼즐 추가분: 위가 막힌 기체는 아래 행에서 좌우로 50% 흘러 천장 vent를 찾아간다.
 * 퍼즐 추가분(리뷰 S0 #3): 액체 좌우 교환은 위에서 눌리거나(PUSH) 관성(life >> 2)이 남은
 * 액체만 한다. 아니면 바닥의 물방울이 무작위 걸음으로 영원히 움직인다(spread.ts 참고).
 * 격자 밖은 벽으로 친다(OOB). 반응·수명은 여기서 하지 않는다(react.ts, sim.ts).
 */
import type { Grid } from './grid'
import { H, W } from './grid'
import { LIQ_MOM_SHIFT, MATS, M, MV_GAS, MV_LIQUID, MV_STATIC, PUSH } from './materials'
import { hash32 } from './rng'

const OOB = 255
const MOBILE = new Uint8Array(256)
const WEIGHT = new Uint8Array(256)
const DENS = new Uint8Array(256)
const LIQ = new Uint8Array(256)
const GAS = new Uint8Array(256)
for (const m of MATS) {
  const mv = m.movement === 'static' ? MV_STATIC : m.movement === 'liquid' ? MV_LIQUID : m.movement === 'gas' ? MV_GAS : 1
  MOBILE[m.id] = mv === MV_STATIC ? 0 : 1
  WEIGHT[m.id] = m.id === M.empty ? 3 : m.density * 2
  DENS[m.id] = m.density
  LIQ[m.id] = mv === MV_LIQUID ? 1 : 0
  GAS[m.id] = mv === MV_GAS && m.id !== M.empty ? 1 : 0
}

/** 무거운 이동 셀이 가벼운 이동 셀 위에 있으면 가라앉는다. */
export function sinks(top: number, bottom: number): boolean {
  return MOBILE[top] === 1 && MOBILE[bottom] === 1 && WEIGHT[top] > WEIGHT[bottom]
}

/** 한 틱의 Margolus 패스. 반환값 = 자리를 바꾼 셀 수(이동량, 실패 판정용). */
export function margolus(g: Grid, tick: number, salt: number): number {
  const { mat, life, moved } = g
  // 다른 모듈에서 온 상수·함수는 지역 별칭으로 — 번들러가 CJS 게터로 감싸면 핫 루프에서 느려진다
  const _W = W, _H = H, _hash32 = hash32, _M = M, _PUSH = PUSH, SHIFT = LIQ_MOM_SHIFT
  const o = tick & 1
  let movedCells = 0
  for (let by = -o; by < _H; by += 2) {
    const topIn = by >= 0
    const botIn = by + 1 < _H
    for (let bx = -o; bx < _W; bx += 2) {
      const leftIn = bx >= 0
      const rightIn = bx + 1 < _W
      const ia = topIn && leftIn ? by * _W + bx : -1
      const ib = topIn && rightIn ? by * _W + bx + 1 : -1
      const ic = botIn && leftIn ? (by + 1) * _W + bx : -1
      const id = botIn && rightIn ? (by + 1) * _W + bx + 1 : -1
      let a = ia >= 0 ? mat[ia] : OOB
      let b = ib >= 0 ? mat[ib] : OOB
      let c = ic >= 0 ? mat[ic] : OOB
      let d = id >= 0 ? mat[id] : OOB
      // 빠른 건너뛰기: 전부 빈칸이거나 전부 움직이지 않는 블록
      if ((a | b | c | d) === 0) continue
      if (MOBILE[a] + MOBILE[b] + MOBILE[c] + MOBILE[d] === 0) continue
      // 움직일 수 있는 게 빈칸뿐이면(정적 + 빈칸) 아무 일도 없다
      if ((MOBILE[a] === 0 || a === 0) && (MOBILE[b] === 0 || b === 0) && (MOBILE[c] === 0 || c === 0) && (MOBILE[d] === 0 || d === 0)) continue

      let la = ia >= 0 ? life[ia] : 0
      let lb = ib >= 0 ? life[ib] : 0
      let lc = ic >= 0 ? life[ic] : 0
      let ld = id >= 0 ? life[id] : 0
      let mv = 0
      let t = 0
      const h = _hash32(bx >> 1, by >> 1, tick, salt)

      // 세로
      if (sinks(a, c)) { t = a; a = c; c = t; t = la; la = lc; lc = t; mv |= 5 }
      if (sinks(b, d)) { t = b; b = d; d = t; t = lb; lb = ld; ld = t; mv |= 10 }

      // 대각선 — 순서는 동전 던지기(샌드박스 flip)
      if (h & 1) {
        if (sinks(a, d) && !sinks(a, c)) { t = a; a = d; d = t; t = la; la = ld; ld = t; mv |= 9 }
        if (sinks(b, c) && !sinks(b, d)) { t = b; b = c; c = t; t = lb; lb = lc; lc = t; mv |= 6 }
      } else {
        if (sinks(b, c) && !sinks(b, d)) { t = b; b = c; c = t; t = lb; lb = lc; lc = t; mv |= 6 }
        if (sinks(a, d) && !sinks(a, c)) { t = a; a = d; d = t; t = la; la = ld; ld = t; mv |= 9 }
      }

      // 액체 좌우 (샌드박스와 같은 조건, 50%)
      if (a !== OOB && b !== OOB && (LIQ[a] | LIQ[b]) !== 0) {
        // 위 행 셀의 압력: 블록 바로 위 행(by-1)을 읽는다
        const upA = by > 0 && _PUSH[mat[ia - _W]] !== 0
        const upB = by > 0 && _PUSH[mat[ib - _W]] !== 0
        if (LIQ[a] && !sinks(a, c) && DENS[a] > DENS[b] && MOBILE[b] && (upA || la >> SHIFT !== 0)) {
          if (h & 2) { t = a; a = b; b = t; t = la; la = lb; lb = t; mv |= 3 }
        } else if (LIQ[b] && !sinks(b, d) && DENS[b] > DENS[a] && MOBILE[a] && (upB || lb >> SHIFT !== 0)) {
          if (h & 4) { t = a; a = b; b = t; t = la; la = lb; lb = t; mv |= 3 }
        }
      }
      if (c !== OOB && d !== OOB) {
        if (LIQ[c] && DENS[c] > DENS[d] && MOBILE[d] && (_PUSH[a] !== 0 || lc >> SHIFT !== 0)) {
          if (h & 8) { t = c; c = d; d = t; t = lc; lc = ld; ld = t; mv |= 12 }
        } else if (LIQ[d] && DENS[d] > DENS[c] && MOBILE[c] && (_PUSH[b] !== 0 || ld >> SHIFT !== 0)) {
          if (h & 16) { t = c; c = d; d = t; t = lc; lc = ld; ld = t; mv |= 12 }
        } else if (GAS[c] && d === _M.empty && !sinks(a, c)) {
          // 퍼즐 추가: 위가 막힌 기체는 옆으로 샌다
          if (h & 32) { t = c; c = d; d = t; t = lc; lc = ld; ld = t; mv |= 12 }
        } else if (GAS[d] && c === _M.empty && !sinks(b, d)) {
          if (h & 64) { t = c; c = d; d = t; t = lc; lc = ld; ld = t; mv |= 12 }
        }
      }

      if (mv === 0) continue
      if (mv & 1) { mat[ia] = a; life[ia] = la; moved[ia] = 1; movedCells++ }
      if (mv & 2) { mat[ib] = b; life[ib] = lb; moved[ib] = 1; movedCells++ }
      if (mv & 4) { mat[ic] = c; life[ic] = lc; moved[ic] = 1; movedCells++ }
      if (mv & 8) { mat[id] = d; life[id] = ld; moved[id] = 1; movedCells++ }
    }
  }
  return movedCells
}
