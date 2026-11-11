import { describe, it, expect } from 'vitest'
import {
  failMessage, rejectMessage, runButton, hudParts, trayVerbs, usageOf, showMovesFor, autoplayMark, resultLines, HudKey, hudKey, clearKind,
} from './view'
import { SpillController } from '../play/controller'
import { POT_LEVEL, GATE_LEVEL } from '../play/fixtures'
import type { PlayState } from '../play/controller'
import type { RunResult } from '../play/attempt'
import type { LevelDef } from '../level/define'

const DIG = { verb: 'dig' as const, tx: 18, ty: 15, tx2: 18, ty2: 17 }
const ctl = (l: LevelDef = POT_LEVEL) => new SpillController(l, { now: () => 0 })

function cleared(): SpillController {
  const c = ctl()
  c.act(DIG)
  c.run()
  c.advance(3000)
  return c
}

describe('메시지 슬롯 문구', () => {
  it('실패: 남은 타깃 수', () => {
    expect(failMessage('stalled', 1)).toBe('1 target left')
    expect(failMessage('sourcesStopped', 2)).toBe('2 targets left')
    expect(failMessage('timeout', 1)).toBe('Out of time · 1 target left')
    expect(failMessage('bad', 1)).toBe('It reached the skull pot')
    expect(failMessage('crate', 0)).toBe('The crate broke')
  })
  it('정체로 끝났는데 아직 닫힌 게이트가 있으면 게이트를 더 빨리 열라고 알려 준다', () => {
    expect(failMessage('stalled', 1, 1)).toBe('Everything settled · open the gate sooner')
    expect(failMessage('stalled', 1, 2)).toBe('Everything settled · open the gates sooner')
    expect(failMessage('sourcesStopped', 1, 1)).toBe('Everything settled · open the gate sooner')
    expect(failMessage('stalled', 1, 0)).toBe('1 target left')
    expect(failMessage('bad', 1, 1)).toBe('It reached the skull pot')
  })
  it('PlayState는 닫힌 탭 가능 게이트 수를 담는다', () => {
    const c = ctl(GATE_LEVEL)
    expect(c.getState().gatesClosed).toBe(2)
    c.run()
    c.act({ verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' })
    expect(c.getState().gatesClosed).toBe(1)
  })
  it('거부 사유', () => {
    expect(rejectMessage('illegal', 'dig')).toBe('Dig through dirt')
    expect(rejectMessage('illegal', 'drop')).toBe('Needs an empty spot')
    expect(rejectMessage('maxLen', 'dig')).toBe('Too long')
    expect(rejectMessage('charges', 'drop')).toBe('No charges left')
    expect(rejectMessage('phase', 'trigger')).toBe('Run first, then tap the gate')
    expect(rejectMessage('limit', 'dig')).toBe('Move limit reached')
    expect(rejectMessage('gate', 'trigger')).toBe('That gate is already open')
  })
})

describe('트레이 Run 버튼', () => {
  it('단계별', () => {
    expect(runButton('cleared', true, true)).toEqual({ label: '↺ TRY IT', action: 'retry' })
    expect(runButton('setup', true)).toEqual({ label: '▶ RUN', action: 'run' })
    expect(runButton('run', true)).toEqual({ label: '⏸ PAUSE', action: 'pause' })
    expect(runButton('paused', true)).toEqual({ label: '▶ RESUME', action: 'resume' })
    expect(runButton('failed', true)).toEqual({ label: '↺ RETRY', action: 'retry' })
    expect(runButton('cleared', true)).toEqual({ label: 'NEXT ▶', action: 'next' })
    expect(runButton('cleared', false)).toEqual({ label: '↺ RETRY', action: 'retry' })
  })
})

describe('HUD "N move(s) · par P / T.Ts" — 초과 항목만 빨강', () => {
  it('Setup', () => {
    const s = ctl().getState()
    expect(hudParts(s)).toEqual({ moves: '0 moves', par: 'par 1 / 6.0s', movesOver: false, timeOver: false })
  })
  it('좁은 화면은 짧은 표기(수/par수 · par초) — 레벨명이 잘리지 않게', () => {
    const s = ctl().getState()
    expect(hudParts(s, true)).toEqual({ moves: '0/1', par: '6.0s', movesOver: false, timeOver: false })
    expect(hudParts(new SpillController({ ...POT_LEVEL, par: undefined }, { now: () => 0 }).getState(), true).moves).toBe('0 moves')
  })
  it('수 초과', () => {
    const c = ctl()
    c.act(DIG)
    c.act({ verb: 'dig', tx: 10, ty: 15, tx2: 10, ty2: 17 })
    const h = hudParts(c.getState())
    expect(h.moves).toBe('2 moves')
    expect(h.movesOver).toBe(true)
    expect(h.timeOver).toBe(false)
  })
  it('시간 초과', () => {
    const c = ctl()
    c.act(DIG)
    c.run()
    c.advance(361)
    expect(hudParts(c.getState()).timeOver || c.phase !== 'run').toBe(true)
  })
  it('par 없는 레벨', () => {
    const s = new SpillController({ ...POT_LEVEL, par: undefined }, { now: () => 0 }).getState()
    expect(hudParts(s)).toEqual({ moves: '0 moves', par: null, movesOver: false, timeOver: false })
  })
  it('1-1·1-2는 수/Par 숨김, 1-3부터 표시', () => {
    expect(showMovesFor('1-1')).toBe(false)
    expect(showMovesFor('1-2')).toBe(false)
    expect(showMovesFor('1-3')).toBe(true)
    expect(showMovesFor('2-1')).toBe(true)
  })
  it('HUD 갱신 키는 0.1초 단위·수·단계만 바뀔 때 바뀐다', () => {
    const c = ctl()
    c.act(DIG)
    c.run()
    const k0: HudKey = hudKey(c.getState())
    c.advance(7)
    expect(hudKey(c.getState())).not.toBe(k0)
    const k1 = hudKey(c.getState())
    expect(hudKey(c.getState())).toBe(k1)
  })
})

describe('트레이 동사', () => {
  it('Dig만', () => {
    expect(trayVerbs(POT_LEVEL, { drops: 0, lines: 0 })).toEqual([{ verb: 'dig', label: 'Dig', icon: '⛏', left: null }])
  })
  it('Trigger는 모드가 아니라 안내 칩', () => {
    const v = trayVerbs(GATE_LEVEL, { drops: 0, lines: 0 })
    expect(v.find((x) => x.verb === 'trigger')).toEqual({ verb: 'trigger', label: 'Gate', icon: '⚡', left: 2 })
  })
  it('Drop·Line 남은 충전 수', () => {
    const l: LevelDef = { ...POT_LEVEL, verbs: { drop: { kind: 'spark', charges: 2 }, line: { mat: 'fuse', maxLen: 6, charges: 1 } } }
    expect(trayVerbs(l, { drops: 1, lines: 1 })).toEqual([
      { verb: 'drop', label: 'Spark', icon: '✦', left: 1 },
      { verb: 'line', label: 'Fuse', icon: '━', left: 0 },
    ])
  })
  it('usageOf는 setup+run 액션에서 센다', () => {
    const s = { setup: [{ verb: 'drop' }, { verb: 'dig' }], run: [{ verb: 'line' }, { verb: 'trigger', arg: 'g1' }] } as unknown as PlayState
    expect(usageOf(s)).toEqual({ drops: 1, lines: 1, triggered: ['g1'] })
  })
})

describe('autoplay 표시(body.dataset.autoplay)', () => {
  it('cleared:<stars>:<moves>:<ticks>', () => {
    const c = cleared()
    const r = c.getState().result!
    expect(r.outcome).toBe('cleared')
    expect(autoplayMark(r, POT_LEVEL)).toMatch(/^cleared:[123]:1:\d+$/)
  })
  it('실패는 failed:<reason>:<moves>:<ticks>', () => {
    const r = { outcome: 'failed', reason: 'stalled', moves: 0, ticks: 95 } as RunResult
    expect(autoplayMark(r, POT_LEVEL)).toBe('failed:stalled:0:95')
  })
})

describe('결과 카드 문구', () => {
  it('par 달성', () => {
    const r = { outcome: 'cleared', moves: 1, ticks: 300, gems: 1, gemTotal: 1 } as RunResult
    expect(resultLines(r, POT_LEVEL)).toEqual({ stat: '1 move · 5.0s', tip: null })
  })
  it('시간 초과면 경로 바꾸기 권유', () => {
    const r = { outcome: 'cleared', moves: 1, ticks: 400, gems: 0, gemTotal: 1 } as RunResult
    expect(resultLines(r, POT_LEVEL)).toEqual({ stat: '1 move · 6.7s', tip: 'par 6.0s — 0.7s to find. Try another path' })
  })
  it('젬을 먹고 par를 놓치면 젬 별 저장을 먼저 알린다', () => {
    const t = { outcome: 'cleared', moves: 1, ticks: 400, gems: 1, gemTotal: 1 } as RunResult
    expect(resultLines(t, POT_LEVEL).tip).toBe('Gem star saved — par is 6.0s, chase it in a fresh run')
  })
  it('수 초과', () => {
    const r = { outcome: 'cleared', moves: 3, ticks: 300, gems: 0, gemTotal: 1 } as RunResult
    expect(resultLines(r, POT_LEVEL).tip).toBe('par is 1 move — try fewer')
    const g = { ...r, gems: 1 } as RunResult
    expect(resultLines(g, POT_LEVEL).tip).toBe('Gem star saved — par is 1 move, chase it in a fresh run')
  })
  it('젬 놓침', () => {
    const r = { outcome: 'cleared', moves: 1, ticks: 300, gems: 0, gemTotal: 1 } as RunResult
    expect(resultLines(r, POT_LEVEL).tip).toBe('Missed a gem')
  })
})

describe('clearKind (풀 연출은 첫 클리어와 기록 갱신 때만)', () => {
  it('첫 클리어·신기록은 풀, 나머지는 축약', () => {
    expect(clearKind({ firstClear: true, newBest: true })).toBe('full')
    expect(clearKind({ firstClear: false, newBest: true })).toBe('full')
    expect(clearKind({ firstClear: false, newBest: false })).toBe('short')
  })
})
