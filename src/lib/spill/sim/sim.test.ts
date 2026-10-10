import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Sim } from './sim'
import { tilePath } from './actions'
import { M } from './materials'
import { W, H } from './grid'
import { defineLevel, type LevelDef } from '../level/define'
import { MapCanvas } from '../level/mapcanvas'

const LEGEND = {
  '.': 'empty', '#': 'wall', d: 'dirt', s: 'sand', w: 'water', o: 'oil', l: 'lava', i: 'ice', a: 'acid',
  f: 'fire', t: 'steam', p: 'plank', u: 'fuse', W: 'wood', v: 'vent', m: 'metal', G: 'gate:g1', S: 'spout:s1',
}

/** 바닥·벽이 있는 빈 상자 맵 + 그리기 콜백 */
function level(draw: (c: MapCanvas) => void, extra: Partial<LevelDef> = {}): LevelDef {
  const c = new MapCanvas()
  c.box(0, 0, 80, 120, '#')
  draw(c)
  return defineLevel({
    id: 't', v: 1, world: 0, name: 't', salt: 7, legend: LEGEND, map: c.toString(), targets: [],
    spouts: { s1: { mat: 'water', rate: 2, total: 50 } }, ...extra,
  })
}

function run(sim: Sim, n: number) {
  for (let i = 0; i < n; i++) sim.step()
}

describe('Sim 이동 (Margolus + 확산)', () => {
  it('반응 없는 재료만 있으면 질량이 보존된다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(10, 10, 20, 10, 's').rect(40, 20, 20, 15, 'w').rect(30, 60, 10, 10, 'o')))
    const before = [sim.count(M.sand), sim.count(M.water), sim.count(M.oil)]
    run(sim, 400)
    expect([sim.count(M.sand), sim.count(M.water), sim.count(M.oil)]).toEqual(before)
  })

  it('모래는 떨어져 바닥에 쌓인다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(30, 10, 10, 5, 's')))
    run(sim, 400)
    // 바닥 벽(행 238-239) 바로 위 행에 모래가 있다
    let onFloor = 0
    for (let x = 0; x < W; x++) if (sim.grid.mat[237 * W + x] === M.sand) onFloor++
    expect(onFloor).toBeGreaterThan(10)
    expect(sim.count(M.sand)).toBe(10 * 5 * 4)
  })

  it('기체(증기)는 떠오른다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(30, 100, 10, 5, 't')))
    const meanY = () => {
      let s = 0, n = 0
      for (let i = 0; i < W * H; i++) if (sim.grid.mat[i] === M.steam) { s += (i / W) | 0; n++ }
      return s / n
    }
    const y0 = meanY()
    run(sim, 30)
    expect(meanY()).toBeLessThan(y0 - 15)
  })

  it('물은 가라앉은 모래 위로 올라온다(치환)', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(30, 90, 6, 10, 'w').rect(30, 80, 6, 10, 's')))
    run(sim, 600)
    let sandBelow = 0
    for (let x = 60; x < 72; x++) if (sim.grid.mat[236 * W + x] === M.sand) sandBelow++
    expect(sandBelow).toBeGreaterThan(6)
  })

  it('평평한 바닥에서 물 앞머리가 1초(60틱)에 40셀 이상 간다 (§7.2 목표 1)', () => {
    const sim = new Sim()
    // 왼쪽 벽에 기댄 물기둥, 오른쪽은 평평한 바닥
    sim.load(level((c) => c.rect(1, 60, 8, 59, 'w')))
    const front = () => {
      let fx = 0
      for (let y = 220; y < 238; y++) for (let x = 0; x < W; x++) if (sim.grid.mat[y * W + x] === M.water && x > fx) fx = x
      return fx
    }
    const x0 = front()
    run(sim, 60)
    expect(front() - x0).toBeGreaterThanOrEqual(40)
  })
})

describe('Sim 반응 (§7.2 반응표)', () => {
  it('물 + 용암 → 돌 + 증기 (확률 1.0)', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(20, 117, 10, 2, 'l').rect(20, 115, 10, 2, 'w')))
    run(sim, 3)
    expect(sim.count(M.stone)).toBeGreaterThan(0)
    expect(sim.count(M.steam)).toBeGreaterThan(0)
  })

  it('얼음은 물을 얼리지 않는다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(20, 100, 10, 19, 'i').rect(30, 100, 10, 19, 'w')))
    const w0 = sim.count(M.water)
    run(sim, 600)
    expect(sim.count(M.water)).toBe(w0)
  })

  it('dirt와 wall은 산에 불활성', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(20, 110, 40, 9, 'd').rect(20, 100, 40, 10, 'a')))
    const d0 = sim.count(M.dirt)
    const a0 = sim.count(M.acid)
    run(sim, 600)
    expect(sim.count(M.dirt)).toBe(d0)
    expect(sim.count(M.acid)).toBe(a0)
  })

  it('산은 금속을 먹고 연기를 낸다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(20, 110, 40, 9, 'm').rect(20, 100, 40, 10, 'a')))
    const m0 = sim.count(M.metal)
    run(sim, 300)
    expect(sim.count(M.metal)).toBeLessThan(m0)
  })

  it('불은 수명 24틱 뒤 사라진다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(30, 50, 4, 4, 'f')))
    run(sim, 23)
    expect(sim.count(M.fire)).toBeGreaterThan(0)
    run(sim, 2)
    expect(sim.count(M.fire)).toBe(0)
  })

  it('불이 plank에 붙으면 "타는 중"(life>0)이 됐다가 불이 된다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(10, 60, 10, 2, 'p').rect(14, 62, 2, 2, 'f')))
    const p0 = sim.count(M.plank)
    run(sim, 20)
    let burning = 0
    for (let i = 0; i < W * H; i++) if (sim.grid.mat[i] === M.plank && sim.grid.life[i] > 0) burning++
    expect(burning).toBeGreaterThan(0)
    run(sim, 400)
    expect(sim.count(M.plank)).toBeLessThan(p0)
  })

  it('물은 타는 plank를 끄지 않는다(물 받친 나무문이 타서 뚫려야 한다)', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(10, 60, 10, 2, 'p').rect(10, 50, 10, 10, 'w').rect(9, 48, 1, 14, '#').rect(20, 48, 1, 14, '#').rect(14, 62, 2, 2, 'f')))
    const p0 = sim.count(M.plank)
    run(sim, 400)
    expect(sim.count(M.plank)).toBeLessThan(p0)
  })

  it('fuse는 불을 빠르게 전파한다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(10, 100, 40, 2, 'u').rect(10, 102, 2, 2, 'f')))
    run(sim, 60)
    expect(sim.count(M.fuse)).toBeLessThan(40 * 2 * 4 / 2)
  })

  it('fuse 줄은 불씨가 위로 떠나도 끝까지 탄다 (salt 16개)', () => {
    // 리뷰 #1: 불(기체)이 떠오르면 전선이 끊겨 중간에 꺼졌다(salt 43%).
    const fails: number[] = []
    for (let salt = 0; salt < 16; salt++) {
      const sim = new Sim()
      sim.load({ ...level((c) => c.rect(5, 100, 70, 2, 'u').rect(5, 102, 2, 2, 'f')), salt })
      run(sim, 300)
      if (sim.count(M.fuse) > 0) fails.push(salt)
    }
    expect(fails).toEqual([])
  })

  it('세로 fuse는 아래로도 탄다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(40, 20, 2, 80, 'u').rect(40, 18, 2, 2, 'f')))
    run(sim, 400)
    expect(sim.count(M.fuse)).toBe(0)
  })

  it('타는 fuse는 life>0 상태로 남았다가 불이 된다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(10, 100, 40, 2, 'u').rect(10, 102, 2, 2, 'f')))
    let sawBurning = false
    for (let t = 0; t < 30 && !sawBurning; t++) {
      sim.step()
      for (let i = 0; i < W * H; i++) if (sim.grid.mat[i] === M.fuse && sim.grid.life[i] > 0) { sawBurning = true; break }
    }
    expect(sawBurning).toBe(true)
  })

  it('vent는 닿은 기체를 지운다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(1, 1, 78, 1, 'v').rect(30, 3, 10, 4, 't')))
    run(sim, 30)
    expect(sim.count(M.steam)).toBe(0)
  })
})

describe('Sim spout·액션', () => {
  it('spout는 rate/틱으로 아래 빈칸에 방출하고 total에서 멈춘다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(30, 10, 4, 1, 'S')))
    sim.step()
    expect(sim.count(M.water)).toBe(2)
    expect(sim.spoutRemaining(0)).toBe(48)
    run(sim, 100)
    expect(sim.count(M.water)).toBe(50)
    expect(sim.spoutRemaining(0)).toBe(0)
  })

  it('기체 spout는 위로 방출한다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(30, 60, 4, 1, 'S'), { spouts: { s1: { mat: 'steam', rate: 2, total: 10 } } }))
    sim.step()
    let above = 0
    for (let x = 60; x < 68; x++) if (sim.grid.mat[119 * W + x] === M.steam) above++
    expect(above).toBe(2)
  })

  it('tilePath는 8방향 직선으로 스냅한다', () => {
    expect(tilePath(0, 0, 3, 1)).toEqual([[0, 0], [1, 0], [2, 0], [3, 0]])
    expect(tilePath(0, 0, 2, 3)).toEqual([[0, 0], [1, 1], [2, 2], [3, 3]])
    expect(tilePath(5, 5, 5, 2)).toEqual([[5, 5], [5, 4], [5, 3], [5, 2]])
  })

  it('Trigger는 해당 gate 셀을 지운다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(20, 50, 10, 2, 'G')))
    expect(sim.count(M.gate)).toBe(80)
    sim.apply({ verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: 'g1' })
    expect(sim.count(M.gate)).toBe(0)
  })

  it('Dig는 경로 타일 안 dirt만 지운다', () => {
    const sim = new Sim()
    sim.load(level((c) => c.rect(20, 40, 20, 20, 'd').rect(20, 44, 2, 2, 'm')))
    const d0 = sim.count(M.dirt)
    // 타일 (10,20)→(10,29) 세로 10타일 = 160셀, 그중 금속 2×2문자(=1타일) 16셀은 남는다
    sim.apply({ verb: 'dig', tx: 10, ty: 20, tx2: 10, ty2: 29 })
    expect(d0 - sim.count(M.dirt)).toBe(16 * 9)
    expect(sim.count(M.metal)).toBe(16)
  })

  it('Drop spark는 1×1타일 빈 셀에만 불을 놓는다', () => {
    const sim = new Sim()
    sim.load(level(() => {}))
    sim.apply({ verb: 'drop', tx: 10, ty: 10, tx2: 10, ty2: 10, arg: 'spark' })
    expect(sim.count(M.fire)).toBe(16)
  })

  it('Line plank는 8방향 직선으로 1타일 폭을 놓는다', () => {
    const sim = new Sim()
    sim.load(level(() => {}))
    sim.apply({ verb: 'line', tx: 5, ty: 10, tx2: 9, ty2: 14, arg: 'plank' })
    expect(sim.count(M.plank)).toBe(5 * 16)
  })
})

describe('결정성 (§7.2)', () => {
  const lv = () => level((c) => c.rect(10, 10, 20, 10, 's').rect(40, 20, 20, 15, 'w').rect(20, 110, 30, 2, 'l').rect(50, 60, 4, 1, 'S').rect(10, 80, 30, 2, 'p').rect(12, 82, 2, 2, 'f'))

  it('같은 레벨 + 같은 액션 → N틱 후 같은 해시', () => {
    const a = new Sim(), b = new Sim()
    for (const s of [a, b]) {
      s.load(lv())
      s.apply({ verb: 'drop', tx: 30, ty: 40, tx2: 30, ty2: 40, arg: 'spark' })
      run(s, 300)
    }
    expect(a.hash()).toBe(b.hash())
    expect(a.snapshot().mat).toEqual(b.snapshot().mat)
  })

  it('load 후 다시 load하면 같은 결과(상태 누수 없음)', () => {
    const a = new Sim()
    a.load(lv()); run(a, 200)
    const h1 = a.hash()
    a.load(lv()); run(a, 200)
    expect(a.hash()).toBe(h1)
  })

  it('salt가 다르면 다른 결과', () => {
    const a = new Sim(), b = new Sim()
    a.load(lv()); b.load({ ...lv(), salt: 8 })
    run(a, 200); run(b, 200)
    expect(a.hash()).not.toBe(b.hash())
  })

  it('해시 스냅샷 — 물리 규칙이 바뀌면 의도적으로 갱신한다', () => {
    const a = new Sim()
    a.load(lv())
    run(a, 240)
    expect(a.hash()).toMatchInlineSnapshot(`"0b6d78fb"`)
  })

  it('sim 디렉터리에 Math.random/Date/performance/부동소수 함수가 없다', () => {
    const dir = __dirname
    const banned = /Math\.random|Date\.|new Date|performance\.|Math\.(floor|round|ceil|sqrt|pow|sin|cos|exp|log)/
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue
      const src = readFileSync(join(dir, f), 'utf8')
      expect(banned.test(src), f).toBe(false)
    }
  })
})
