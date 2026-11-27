/**
 * 카드 #139 — 목표 = 셀 영역(backdrop). 오답 검사:
 * 1-1 첫 프레임에서 목표 rect 밖 빈 셀이 틴트·윤곽이면 실패, rect 안 빈 셀이 배경 상수면 실패,
 * setBackdrop 없는 렌더(에디터·벤치)의 빈 셀이 상수 1색이 아니면 실패.
 */
import { describe, it, expect } from 'vitest'
import { bakeBackdrop, backdropTintHex, isBackdropTarget, paintCells, PALETTE, PLAIN_BACKDROP } from './canvas'
import { skipTargetStroke } from './overlay'
import { SpillController } from '../play/controller'
import { W, H } from '../sim/grid'
import { M, MATS } from '../sim/materials'
import { PAIRS } from '../../../../scripts/check-contrast.mjs'
import firstDrop from '../levels/w1/first-drop'
import twoPots from '../levels/w1/two-pots'

const EMPTY = PALETTE[M.empty][0]

function frame(level: typeof firstDrop, withBackdrop: boolean) {
  const ctl = new SpillController(level)
  const out = new Uint32Array(W * H)
  paintCells(ctl.sim.grid, out, 0, withBackdrop ? bakeBackdrop(ctl.level.targets) : undefined)
  return { ctl, out }
}

describe('backdrop — 목표 = 셀 영역', () => {
  for (const [name, level] of [['1-1 First Drop', firstDrop], ['1-3 Two Pots', twoPots]] as const) {
    it(`${name}: 틴트·윤곽은 목표 rect 안 빈 셀에만, rect 안 빈 셀은 전부 배경 상수가 아니다`, () => {
      const { ctl, out } = frame(level, true)
      const fills = ctl.level.targets.filter(isBackdropTarget)
      expect(fills.length).toBeGreaterThan(0)
      const inside = (x: number, y: number) => fills.some((t) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h)
      const mat = ctl.sim.grid.mat
      let inEmpty = 0
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x
        if (mat[i] !== M.empty) continue
        if (inside(x, y)) { inEmpty++; expect(out[i]).not.toBe(EMPTY) }
        else expect(out[i]).toBe(EMPTY)
      }
      expect(inEmpty).toBeGreaterThan(0)
    })
  }

  it('1-1: 둘레 1셀 = 윤곽(재료색), 안쪽 = 틴트, 눈금은 좌·우 안쪽 열에 3개씩', () => {
    const ctl = new SpillController(firstDrop)
    const bd = bakeBackdrop(ctl.level.targets)
    const t = ctl.level.targets.find(isBackdropTarget)!
    const line = bd[t.y * W + t.x]
    const tint = bd[(t.y + 2) * W + t.x + 3]
    expect(line).not.toBe(tint)
    expect(bd[(t.y + t.h - 1) * W + t.x + t.w - 1]).toBe(line)
    let ticksL = 0, ticksR = 0
    for (let y = t.y + 1; y < t.y + t.h - 1; y++) {
      if (bd[y * W + t.x + 1] === line) ticksL++
      if (bd[y * W + t.x + t.w - 2] === line) ticksR++
    }
    expect([ticksL, ticksR]).toEqual([3, 3])
  })

  it('setBackdrop 없는 렌더(에디터·벤치)는 빈 셀 상수 1색 그대로', () => {
    const { out, ctl } = frame(firstDrop, false)
    for (let i = 0; i < W * H; i++) if (ctl.sim.grid.mat[i] === M.empty) expect(out[i]).toBe(EMPTY)
    expect(bakeBackdrop([])).toBe(PLAIN_BACKDROP)
    expect(bakeBackdrop([{ x: 0, y: 0, w: 8, h: 8, kind: 'bad', mat: M.water }])).toBe(PLAIN_BACKDROP)
  })

  it('덮개: backdrop이 켜진 물 채우기 목표만 점선 생략, 해골·채움 완료·backdrop 꺼짐은 그대로', () => {
    const fill = { kind: 'fill' as const, mat: M.water, latched: false }
    expect(skipTargetStroke(fill, true)).toBe(true)
    expect(skipTargetStroke(fill, false)).toBe(false)
    expect(skipTargetStroke({ ...fill, latched: true }, true)).toBe(false)
    expect(skipTargetStroke({ ...fill, kind: 'bad' }, true)).toBe(false)
  })

  it('대비 검사(check-contrast PAIRS)가 지금 윤곽·틴트·배경 색을 그대로 잰다', () => {
    const line = MATS[M.water].color.toUpperCase()
    const tint = backdropTintHex(M.water)
    const bg = MATS[M.empty].color.toUpperCase()
    const has = (fg: string, b: string) => PAIRS.some(([f, g, min]) => String(f).toUpperCase() === fg && String(g).toUpperCase() === b && Number(min) >= 3)
    expect(has(line, tint)).toBe(true)
    expect(has(line, bg)).toBe(true)
  })
})
