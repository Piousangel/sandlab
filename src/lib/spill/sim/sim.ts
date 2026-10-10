/**
 * Sim — 퍼즐 시뮬 진입점 (§7.2, §7.7). load / apply / step / snapshot / hash.
 *
 * 틱 순서: (1) 액션은 apply()가 틱 경계에서 즉시 적용 (2) Margolus (3) 수평 확산
 * (4) 반응·연소 (5) 수명 감소 (6) spout 방출·vent 소거 (7) 센서는 호출자가 Sensors.update로.
 * 같은 레벨 + 같은 액션 + 같은 틱 → 비트 단위로 같은 격자(Node·브라우저 공통).
 */
import type { LevelDef } from '../level/define'
import { parseLevel, type ParsedLevel } from '../level/parse'
import { applyAction, type Action } from './actions'
import { H, N, W, createGrid, setCell, type Grid } from './grid'
import { LIFETIME, M, MOVE, MV_GAS } from './materials'
import { burnPass, reactPass } from './react'
import { spreadPass } from './spread'
import { margolus } from './step'

export type { Action } from './actions'

export interface Snapshot {
  tick: number
  mat: Uint8Array
  life: Uint8Array
  spoutLeft: Int32Array
}

interface SpoutState {
  mat: number
  rate: number
  /** 방출 대상 셀(스파웃 바로 아래, 기체면 바로 위) 목록 — 인덱스 오름차순 */
  outs: Int32Array
}

const GASLIKE = new Uint8Array(256)
for (let m = 0; m < MOVE.length; m++) GASLIKE[m] = m !== M.empty && MOVE[m] === MV_GAS ? 1 : 0

export class Sim {
  readonly grid: Grid = createGrid()
  tick = 0
  salt = 0
  level: ParsedLevel | null = null
  /** 마지막 step()에서 움직인 셀 수(Margolus + 확산) — 실패 판정 (a)용 */
  lastMoved = 0
  lastReactions = 0
  /** 지금 타고 있는 가연 고체 셀 수 */
  lastBurning = 0
  private spouts: SpoutState[] = []
  private spoutLeft = new Int32Array(0)
  private vents = new Int32Array(0)

  load(def: LevelDef | ParsedLevel): void {
    const p = 'def' in def && 'mat' in def ? (def as ParsedLevel) : parseLevel(def as LevelDef)
    this.level = p
    this.grid.mat.set(p.mat)
    this.grid.life.set(p.life)
    this.grid.moved.fill(0)
    this.tick = 0
    this.salt = p.def.salt
    this.lastMoved = 0
    this.lastReactions = 0
    const outs: number[][] = p.spouts.map(() => [])
    const vents: number[] = []
    for (let i = 0; i < N; i++) {
      const m = p.mat[i]
      if (m === M.vent) vents.push(i)
      if (m !== M.spout) continue
      const k = p.life[i] - 1
      const s = p.spouts[k]
      const o = GASLIKE[s.mat] ? i - W : i + W
      if (o >= 0 && o < N && p.mat[o] !== M.spout) outs[k].push(o)
    }
    this.spouts = p.spouts.map((s, k) => ({ mat: s.mat, rate: s.rate, outs: Int32Array.from(outs[k]) }))
    this.spoutLeft = Int32Array.from(p.spouts, (s) => s.total)
    this.vents = Int32Array.from(vents)
  }

  /** 틱 경계에서 즉시 적용. 반환값 = 바뀐 셀 수 */
  apply(a: Action): number {
    if (!this.level) throw new Error('Sim.apply before load')
    return applyAction(this.grid, a, this.level.gates)
  }

  spoutRemaining(k: number): number {
    return this.spoutLeft[k] ?? 0
  }

  get spoutTotalLeft(): number {
    let s = 0
    for (let k = 0; k < this.spoutLeft.length; k++) s += this.spoutLeft[k]
    return s
  }

  step(): void {
    const g = this.grid
    const t = this.tick
    g.moved.fill(0)
    let moved = margolus(g, t, this.salt)
    moved += spreadPass(g, t)
    this.lastReactions = reactPass(g, t, this.salt)
    this.lastBurning = burnPass(g, t, this.salt)
    this.age()
    this.emit(t)
    this.vent()
    this.lastMoved = moved
    this.tick = t + 1
  }

  private age(): void {
    const { mat, life } = this.grid
    const lifetime = LIFETIME
    const n = N // 지역 별칭: 모듈 간 import가 CJS 게터로 감싸지면 루프 조건이 느려진다
    for (let i = 0; i < n; i++) {
      const m = mat[i]
      if (m === 0 || lifetime[m] === 0) continue
      if (life[i] <= 1) { mat[i] = 0; life[i] = 0 } else life[i]--
    }
  }

  private emit(t: number): void {
    const g = this.grid
    for (let k = 0; k < this.spouts.length; k++) {
      const s = this.spouts[k]
      const n = s.outs.length
      if (n === 0) continue
      let left = this.spoutLeft[k]
      let budget = s.rate
      // 시작 위치를 틱마다 돌려 출구 셀에 고르게 나눠 준다
      const start = t % n
      for (let q = 0; q < n && budget > 0 && left > 0; q++) {
        const i = s.outs[(start + q) % n]
        if (g.mat[i] !== M.empty) continue
        setCell(g, i, s.mat)
        budget--
        left--
      }
      this.spoutLeft[k] = left
    }
  }

  private vent(): void {
    const { mat, life } = this.grid
    for (let k = 0; k < this.vents.length; k++) {
      const i = this.vents[k]
      if (mat[i] !== M.vent) continue
      const x = i % W
      const y = (i - x) / W
      if (y > 0 && GASLIKE[mat[i - W]]) { mat[i - W] = M.empty; life[i - W] = 0 }
      if (y + 1 < H && GASLIKE[mat[i + W]]) { mat[i + W] = M.empty; life[i + W] = 0 }
      if (x > 0 && GASLIKE[mat[i - 1]]) { mat[i - 1] = M.empty; life[i - 1] = 0 }
      if (x + 1 < W && GASLIKE[mat[i + 1]]) { mat[i + 1] = M.empty; life[i + 1] = 0 }
    }
  }

  count(m: number): number {
    const a = this.grid.mat
    let n = 0
    for (let i = 0; i < N; i++) if (a[i] === m) n++
    return n
  }

  snapshot(): Snapshot {
    return { tick: this.tick, mat: this.grid.mat.slice(), life: this.grid.life.slice(), spoutLeft: this.spoutLeft.slice() }
  }

  restore(s: Snapshot): void {
    this.grid.mat.set(s.mat)
    this.grid.life.set(s.life)
    this.spoutLeft = s.spoutLeft.slice()
    this.tick = s.tick
  }

  /** FNV-1a32(tick, mat, life, spout 잔량) → 8자리 hex */
  hash(): string {
    let h = 0x811c9dc5
    const mixByte = (b: number) => { h ^= b & 0xff; h = Math.imul(h, 0x01000193) }
    const mix32 = (v: number) => { mixByte(v); mixByte(v >>> 8); mixByte(v >>> 16); mixByte(v >>> 24) }
    mix32(this.tick)
    const { mat, life } = this.grid
    for (let i = 0; i < N; i++) { h ^= mat[i]; h = Math.imul(h, 0x01000193) }
    for (let i = 0; i < N; i++) { h ^= life[i]; h = Math.imul(h, 0x01000193) }
    for (let k = 0; k < this.spoutLeft.length; k++) mix32(this.spoutLeft[k])
    return (h >>> 0).toString(16).padStart(8, '0')
  }
}
