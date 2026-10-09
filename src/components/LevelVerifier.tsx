'use client'

/**
 * /play/verify — 실제 WebGPU에서 모든 레벨을 일괄 검증한다(헤드리스엔 WebGPU가 없어 자동화 불가).
 * 레벨마다 ① 모범답안 재생 → 클리어해야 함 ② 붓질 없이 방치 → 클리어되면 안 됨.
 * 결과는 표 + window.__verify(JSON)로 노출 — claude-in-chrome가 읽는다.
 */
import { useEffect, useRef, useState } from 'react'
import { SandEngine } from '@/lib/sand/engine'
import { PRESETS, buildIndex } from '@/lib/sand/materials'
import { LEVELS as BASE_LEVELS } from '@/lib/challenge/levels'
import { DAILY_POOL } from '@/lib/challenge/daily'

// ?set=daily — 데일리 변형 풀 검증
const LEVELS = typeof location !== 'undefined' && new URLSearchParams(location.search).get('set') === 'daily' ? DAILY_POOL : BASE_LEVELS
import { buildGrid, GRID_W, GRID_H } from '@/lib/challenge/grid'
import { judge, initialCounts } from '@/lib/challenge/judge'
import { ClearTracker, starsFor } from '@/lib/challenge/clear'
import { InkLedger } from '@/lib/challenge/ink'
import { brushAt } from '@/lib/challenge/replay'
import { canPaintAt, areaFor } from '@/lib/challenge/area'
import type { Level } from '@/lib/challenge/types'

const MAX_TICKS = 3600
const CHECK_EVERY = 30 // ≈ 0.5초(60Hz) — 플레이어 판정 주기와 같은 간격
const STEPS_PER_FRAME = 8

interface Row {
  id: string
  solved: boolean | null
  clearTick: number | null
  ink: number | null
  overBudget: boolean | null
  stars: number | null
  idleCleared: boolean | null
}

const IDX = buildIndex(PRESETS)
// 탭이 가려져도 멈추지 않는 양보(rAF·setTimeout은 백그라운드에서 멈추거나 1초로 제한된다).
const yieldTask = () =>
  new Promise<void>((r) => {
    const ch = new MessageChannel()
    ch.port1.onmessage = () => r()
    ch.port2.postMessage(0)
  })

async function run(eng: SandEngine, level: Level, withSolution: boolean, maxTicks = MAX_TICKS) {
  const grid = buildGrid(level)
  const init = initialCounts(grid, level)
  const tracker = new ClearTracker()
  const ink = new InkLedger(level.palette)
  eng.upload(grid)
  eng.resetTick()
  eng.resetInk()
  eng.onTick = (t) => {
    const b = withSolution ? brushAt(level.solution, t, IDX) : null
    const slug = b ? PRESETS[b.mat].slug : ''
    if (b && canPaintAt(areaFor(level, slug), b.x, b.y, b.r) && !ink.spent(slug)) {
      eng.brush.x = b.x
      eng.brush.y = b.y
      eng.brush.r = b.r
      eng.inkCap = level.palette[slug]
      eng.brush.mat = b.mat
    } else {
      eng.brush.mat = 0xffffffff
    }
  }
  let next = CHECK_EVERY
  let clearTick: number | null = null
  while (eng.currentTick < maxTicks) {
    eng.advance()
    await eng.settle()
    await yieldTask()
    if (eng.currentTick < next) continue
    next = eng.currentTick + CHECK_EVERY
    const tick = eng.currentTick
    const [cells, counts] = await Promise.all([eng.readback(), eng.readInk()])
    ink.update(counts)
    if (tracker.push(judge(cells, level, init, tick))) {
      clearTick = tick
      break
    }
  }
  eng.onTick = undefined
  eng.brush.mat = 0xffffffff
  ink.update(await eng.readInk())
  const overBudget = Object.keys(level.palette).some((m) => ink.used(m) > level.palette[m])
  return { cleared: clearTick !== null, clearTick, ink: ink.total(), overBudget }
}

export default function LevelVerifier() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rows, setRows] = useState<Row[]>(
    LEVELS.map((l) => ({ id: l.id, solved: null, clearTick: null, ink: null, overBudget: null, stars: null, idleCleared: null })),
  )
  const [status, setStatus] = useState('starting…')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    const eng = new SandEngine({ canvas, width: GRID_W, height: GRID_H, materials: PRESETS })
    ;(async () => {
      try {
        await eng.init()
      } catch (e) {
        setStatus(`WebGPU init failed: ${String(e)}`)
        return
      }
      eng.paintEmptyOnly = true
      eng.stepsPerFrame = STEPS_PER_FRAME
      // start()(rAF 루프)는 쓰지 않는다 — run()이 advance()로 직접 진행한다.
      // 디버그: ?only=<id>&mode=solution|idle&ticks=N — 한 레벨·한 모드만 돌리고 마지막 화면을 남긴다.
      const q = new URLSearchParams(location.search)
      const only = q.get('only')
      if (only) {
        const level = LEVELS.find((l) => l.id === only)
        if (!level) return setStatus(`no level ${only}`)
        const mode = q.get('mode') ?? 'solution'
        const r = await run(eng, level, mode === 'solution', Number(q.get('ticks') ?? MAX_TICKS))
        const cells = await eng.readback()
        const census: Record<string, number> = {}
        for (const c of cells) {
          const slug = PRESETS[c & 0xffff]?.slug ?? `#${c & 0xffff}`
          if (slug !== 'empty') census[slug] = (census[slug] ?? 0) + 1
        }
        ;(window as unknown as { __verify: unknown }).__verify = { debug: true, ...r, tick: eng.currentTick, census }
        return setStatus(`debug ${only}/${mode}: cleared=${r.cleared} tick=${eng.currentTick} ink=${r.ink}`)
      }
      const out: Row[] = []
      for (const level of LEVELS) {
        if (disposed) return
        setStatus(`${level.id}: solution`)
        const s = await run(eng, level, true)
        setStatus(`${level.id}: idle`)
        const idle = await run(eng, level, false)
        const row: Row = {
          id: level.id,
          solved: s.cleared,
          clearTick: s.clearTick,
          ink: s.ink,
          overBudget: s.overBudget,
          stars: s.cleared ? starsFor(s.ink, level.stars) : null,
          idleCleared: idle.cleared,
        }
        out.push(row)
        setRows((prev) => prev.map((r) => (r.id === level.id ? row : r)))
      }
      const allPass = out.every((r) => r.solved && !r.idleCleared && !r.overBudget && r.stars === 3)
      ;(window as unknown as { __verify: unknown }).__verify = { allPass, rows: out }
      setStatus(allPass ? 'ALL PASS' : 'FAILURES — see table')
    })()
    return () => {
      disposed = true
      eng.destroy()
    }
  }, [])

  const cell = { padding: '4px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' } as const
  const mark = (v: boolean | null, good: boolean) => (v === null ? '…' : v === good ? '✅' : '❌')
  return (
    <main style={{ padding: 20, color: '#eef1f6', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
      <h1 style={{ fontSize: 18 }}>Level verifier — {status}</h1>
      <p style={{ opacity: 0.6 }}>
        solution must clear within {MAX_TICKS} ticks with ink ≤ 3★ limit and within budget; idle (no strokes) must not clear.
      </p>
      <table style={{ borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            {['level', 'solution', 'clear tick', 'ink', '3★ limit', 'stars', 'budget', 'idle'].map((h) => (
              <th key={h} style={{ ...cell, textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const l = LEVELS.find((x) => x.id === r.id)!
            return (
              <tr key={r.id}>
                <td style={cell}>{r.id}</td>
                <td style={cell}>{mark(r.solved, true)}</td>
                <td style={cell}>{r.clearTick ?? '—'}</td>
                <td style={cell}>{r.ink ?? '—'}</td>
                <td style={cell}>{l.stars[0]}</td>
                <td style={cell}>{r.stars ?? '—'}</td>
                <td style={cell}>{mark(r.overBudget, false)}</td>
                <td style={cell}>{mark(r.idleCleared, false)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <canvas ref={canvasRef} width={GRID_W} height={GRID_H} style={{ width: 600, height: 300, borderRadius: 6 }} />
    </main>
  )
}
