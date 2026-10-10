/**
 * 수평 확산 패스 (§7.2 틱 순서 3) — 퍼즐 전용 물리.
 *
 * 샌드박스는 액체 수평 흐름이 매우 느려서(인계서 "실측 물리 제약") 수로 퍼즐이 성립하지 않는다.
 * 아래로 못 떨어지는 액체 셀은 방향 d = ((y + tick) & 1) ? +1 : -1 로 행을 스캔하면서
 * 빈칸(또는 더 가벼운 기체)으로 최대 SPREAD[mat]셀 이동한다. 이동한 셀은 moved 표시로
 * 같은 틱에 다시 움직이지 않는다. 절벽(아래가 빔)을 만나면 그 칸에서 멈춰 다음 틱에 떨어진다.
 *
 * 관성(스펙 보완): 방향을 틱마다 번갈면 앞머리 셀이 오른쪽으로 갔다가 다음 틱에 제자리로
 * 돌아와 앞머리가 거의 안 나간다(S0 측정 27셀/s). 그래서 확산에 성공한 액체 셀은 life 칸
 * 아래 2비트에 방향(1=+1, 2=-1)을 기억하고, 막힐 때까지 그 방향으로 계속 간다. 기억이 없으면 d를
 * 쓴다. 액체는 수명이 없어 life 칸을 이 용도로 쓸 수 있다.
 * 같은 행에서 이미 움직인 셀(moved)로는 들어가지 않는다 — 기체가 한 틱에 두 번 밀리지 않게.
 *
 * 추가 낙하(스펙 보완): Margolus만으로는 액체 줄기가 틱당 1셀, 밀도 1/2로 떨어져
 * 1타일(4셀) 구멍 유량이 약 90셀/s에 그친다(냄비 400셀 4.5초, 목표 3초 미달).
 * 그래서 이번 틱에 아직 안 움직인 물·기름·산은 아래가 비면 한 칸 더 떨어진다.
 * 행을 아래에서 위로 훑으므로 연속 줄기는 통째로 한 칸 내려간다.
 *
 * 압력·관성(리뷰 S0 #3): 방향만 기억하면 넓은 바닥의 물방울·얇은 막이 영원히 미끄러져
 * §4.2 실패 판정 (a)가 성립하지 않는다. 그래서 life = (관성 << 2) | 방향으로 쓰고,
 * 위에서 눌리는(PUSH) 셀과 방금 떨어진 셀만 관성을 LIQ_MOM_MAX로 채운다. 압력 없는 셀은
 * 이 패스를 지날 때마다 관성을 1 잃고(막혀도), 0이면 옆으로 가지 않는다.
 */
import type { Grid } from './grid'
import { H, W } from './grid'
import { LIQ_DIR_MASK, LIQ_MOM_MAX, LIQ_MOM_SHIFT, M, MATS, PUSH } from './materials'
import { sinks } from './step'

/** 틱당 최대 수평 이동 셀 수. 0 = 확산 안 함. S0 벤치로 튜닝(스펙 초기값: 1). */
export const SPREAD = new Uint8Array(MATS.length)
SPREAD[M.water] = 2
SPREAD[M.oil] = 2
SPREAD[M.acid] = 2
SPREAD[M.lava] = 1 // 짝수 틱에만

/**
 * 압력 전달 거리(셀): 위에서 눌린 액체가 옆이 같은 액체로 막혀 있으면 그 액체를 지나 같은 행의
 * 첫 빈칸까지 이만큼 찾아 옮긴다(리뷰 S0 #3·#4). 이게 없으면 물더미가 45° 비탈로 남아
 * 몸통 앞머리가 16~22셀/s에 그치고 20초가 지나도 비탈을 타고 계속 흘러내린다.
 */
export const PRESS = new Uint8Array(MATS.length)
PRESS[M.water] = 8
PRESS[M.oil] = 8
PRESS[M.acid] = 8

/** 확산 패스에서 한 칸 더 떨어지는 액체 */
export const FALL = new Uint8Array(MATS.length)
FALL[M.water] = 1
FALL[M.oil] = 1
FALL[M.acid] = 1

const OPEN = new Uint8Array(256)
OPEN[M.empty] = 1
OPEN[M.fire] = 1
OPEN[M.steam] = 1
OPEN[M.smoke] = 1

export function spreadPass(g: Grid, tick: number): number {
  const { mat, life, moved } = g
  // 다른 모듈에서 온 상수·함수는 지역 별칭으로 — 번들러가 CJS 게터로 감싸면 핫 루프에서 느려진다
  const _W = W, _H = H, _sinks = sinks, _M = M, _PUSH = PUSH, PRESS_SCAN = PRESS
  const SHIFT = LIQ_MOM_SHIFT, DIR = LIQ_DIR_MASK, MOM_MAX = LIQ_MOM_MAX, MOM_FULL = LIQ_MOM_MAX << LIQ_MOM_SHIFT
  let movedCells = 0
  for (let y = _H - 1; y >= 0; y--) {
    const d = (y + tick) & 1 ? 1 : -1
    const row = y * _W
    const hasBelow = y + 1 < _H
    for (let k = 0; k < _W; k++) {
      const x = d > 0 ? k : _W - 1 - k
      const i = row + x
      const m = mat[i]
      const n = SPREAD[m]
      if (n === 0 || moved[i] !== 0) continue
      if (hasBelow && _sinks(m, mat[i + _W])) {
        if (FALL[m] !== 0 && OPEN[mat[i + _W]] !== 0) {
          const b = i + _W
          mat[i] = mat[b]
          mat[b] = m
          const tl = life[i]
          life[i] = life[b]
          life[b] = (MOM_FULL | (tl & DIR)) // 떨어진 액체는 관성을 채운다
          moved[b] = 1
          moved[i] = 1
          movedCells++
        }
        continue
      }
      if (m === _M.lava && (tick & 1) !== 0) continue
      const mem = life[i]
      const pressed = y > 0 && _PUSH[mat[i - _W]] !== 0
      let mom = mem >> SHIFT
      if (pressed) mom = MOM_MAX
      else if (mom === 0) {
        if (mem !== 0) life[i] = 0
        continue // 압력도 관성도 없으면 제자리
      } else mom--
      const md = mem & DIR
      const dir = md === 1 ? 1 : md === 2 ? -1 : d
      let j = i
      let nx = x
      for (let s = 0; s < n; s++) {
        nx += dir
        if (nx < 0 || nx >= _W) break
        const jj = row + nx
        if (OPEN[mat[jj]] === 0 || moved[jj] !== 0) break
        j = jj
        if (hasBelow && _sinks(m, mat[jj + _W])) break // 절벽: 여기서 멈추고 다음 틱에 떨어진다
      }
      if (j === i && pressed && PRESS_SCAN[m] !== 0) {
        // 압력 전달: 같은 액체를 지나 같은 행의 첫 빈칸을 찾으면 그리로 옮긴다(물기둥이 바닥으로 무너짐)
        let px = x
        const lim = PRESS_SCAN[m]
        for (let s = 0; s < lim; s++) {
          px += dir
          if (px < 0 || px >= _W) break
          const jj = row + px
          const q = mat[jj]
          if (q === m) continue
          if (OPEN[q] !== 0 && moved[jj] === 0) j = jj
          break
        }
      }
      if (j === i) {
        life[i] = mom << SHIFT // 막힘: 방향을 잃는다(관성은 위에서 이미 깎였다)
        continue
      }
      const tm = mat[j]
      const tl = life[j]
      mat[j] = m
      life[j] = (mom << SHIFT) | (dir > 0 ? 1 : 2)
      mat[i] = tm
      life[i] = tl
      moved[j] = 1
      moved[i] = 1
      movedCells++
    }
  }
  return movedCells
}
