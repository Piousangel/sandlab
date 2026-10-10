'use client'

/**
 * /spill/bench — S0 엔진 스파이크 실기기 벤치(§7.3 S0 게이트, §9 S0).
 * 벤치 레벨을 1x/2x/4x로 라이브 재생하며 ms/tick·FPS를 보여 주고,
 * "Run all"은 7개 물리 목표치와 부하 틱 비용을 브라우저에서 재고 Node와 같은 해시를 낸다.
 *
 * 시뮬·루프는 React state 밖(ref)에 두고, React는 HUD 숫자만 250ms마다 받는다(§7.3).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Sim } from '@/lib/spill/sim/sim'
import { SpillRenderer, computeScale } from '@/lib/spill/render/canvas'
import {
  BENCH_CASES, STRESS_LEVEL, applyDue, createRunner, ffCap, runStress,
  type BenchCase, type BenchResult, type CaseRun, type Observer,
} from '@/lib/spill/bench/cases'

const HARD_CAP = 2700
const FRAME_BUDGET_MS = 12
const STRESS_ID = 'stress'

const STRESS_CASE: BenchCase = {
  id: STRESS_ID,
  title: 'Stress (perf only)',
  goal: 'half-full grid, everything moving',
  level: STRESS_LEVEL,
  actions: [],
  maxTicks: HARD_CAP,
  observe: () => ({ onTick: () => false, result: () => ({ pass: true, summary: 'perf only' }) }),
}
const ALL = [...BENCH_CASES, STRESS_CASE]

interface Hud {
  tick: number
  msTick: number
  fps: number
  result: BenchResult | null
  doneAt: number
}

interface AllReport {
  runs: CaseRun[]
  stressMs: number
  avgMs: number
  running: boolean
  current: string
}

const btn = (active = false): React.CSSProperties => ({
  minWidth: 44, minHeight: 44, padding: '0 14px', borderRadius: 10, border: '1px solid #2a3140',
  background: active ? '#f5a623' : '#141a24', color: active ? '#07090D' : '#eef1f6', fontWeight: 700,
  fontSize: 15, cursor: 'pointer',
})

export default function SpillBench() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const simRef = useRef<Sim | null>(null)
  const rendererRef = useRef<SpillRenderer | null>(null)
  const obsRef = useRef<Observer | null>(null)
  const caseRef = useRef<BenchCase>(ALL[0])
  const runningRef = useRef(true)
  const speedRef = useRef(1)
  const resultRef = useRef<{ result: BenchResult | null; doneAt: number }>({ result: null, doneAt: -1 })

  const [caseId, setCaseId] = useState(ALL[0].id)
  const [speed, setSpeed] = useState(1)
  const [running, setRunning] = useState(true)
  const [glow, setGlow] = useState(true)
  const [hud, setHud] = useState<Hud>({ tick: 0, msTick: 0, fps: 0, result: null, doneAt: -1 })
  const [cssSize, setCssSize] = useState({ w: 160, h: 240, dpc: 1 })
  const [all, setAll] = useState<AllReport | null>(null)
  const [ua, setUa] = useState('')
  const [copied, setCopied] = useState(false)

  const loadCase = useCallback((c: BenchCase) => {
    const sim = simRef.current
    if (!sim) return
    caseRef.current = c
    sim.load(c.level)
    obsRef.current = c.observe()
    resultRef.current = { result: null, doneAt: -1 }
    runningRef.current = true
    setRunning(true)
  }, [])

  // 크기: §3 정수 DPR 배율
  useEffect(() => {
    const fit = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const dpr = window.devicePixelRatio || 1
      const s = computeScale(wrap.clientWidth, Math.max(240, window.innerHeight - 260), dpr)
      setCssSize({ w: s.cssW, h: s.cssH, dpc: s.devicePerCell })
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // 루프: 누산기 고정 틱(60/s × 배속), 프레임 예산 12ms를 넘으면 틱을 버리지 않고 느리게 돈다.
  useEffect(() => {
    setUa(navigator.userAgent)
    const canvas = canvasRef.current
    if (!canvas) return
    const sim = new Sim()
    simRef.current = sim
    rendererRef.current = new SpillRenderer(canvas)
    loadCase(caseRef.current)

    let raf = 0
    let last = performance.now()
    let acc = 0
    let tickMs = 0
    let tickN = 0
    let frames = 0
    let fpsT0 = last
    let fps = 0
    let hudT = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(100, now - last)
      last = now
      if (runningRef.current) {
        acc += (dt * 60 * speedRef.current) / 1000
        const f0 = performance.now()
        while (acc >= 1) {
          if (sim.tick >= HARD_CAP) { runningRef.current = false; setRunning(false); break }
          const c = caseRef.current
          applyDue(c, sim)
          const t0 = performance.now()
          sim.step()
          tickMs += performance.now() - t0
          tickN++
          acc -= 1
          const obs = obsRef.current
          if (obs && !resultRef.current.result && (obs.onTick(sim) || sim.tick >= c.maxTicks)) {
            resultRef.current = { result: obs.result(sim), doneAt: sim.tick }
          }
          if (performance.now() - f0 > FRAME_BUDGET_MS) { acc = 0; break }
        }
      }
      rendererRef.current?.draw(sim.grid, sim.tick)
      frames++
      if (now - fpsT0 >= 1000) { fps = (frames * 1000) / (now - fpsT0); frames = 0; fpsT0 = now }
      if (now - hudT > 250) {
        hudT = now
        setHud({
          tick: sim.tick, msTick: tickN ? tickMs / tickN : 0, fps,
          result: resultRef.current.result, doneAt: resultRef.current.doneAt,
        })
        tickMs = 0
        tickN = 0
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [loadCase])

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { if (rendererRef.current) rendererRef.current.glowOn = glow }, [glow])

  const pick = (id: string) => {
    setCaseId(id)
    const c = ALL.find((x) => x.id === id)
    if (c) loadCase(c)
  }

  const toggle = () => {
    runningRef.current = !runningRef.current
    setRunning(runningRef.current)
  }

  // Run all: 케이스마다 120틱씩 나눠 돌려 UI를 막지 않는다. 라이브 루프는 멈춘다.
  const runAll = async () => {
    runningRef.current = false
    setRunning(false)
    const sim = new Sim()
    const now = () => performance.now()
    const runs: CaseRun[] = []
    setAll({ runs: [], stressMs: 0, avgMs: 0, running: true, current: BENCH_CASES[0].title })
    for (const c of BENCH_CASES) {
      setAll((a) => a && { ...a, current: c.title })
      const r = createRunner(c, sim, now)
      while (!r.advance(120)) await new Promise((res) => setTimeout(res, 0))
      runs.push(r.finish())
      setAll((a) => a && { ...a, runs: [...runs] })
      await new Promise((res) => setTimeout(res, 0))
    }
    setAll((a) => a && { ...a, current: 'Stress (perf)' })
    await new Promise((res) => setTimeout(res, 0))
    runStress(sim, now, 60)
    const stressMs = runStress(sim, now, 300)
    const ticks = runs.reduce((s, r) => s + r.ticks, 0)
    const avgMs = runs.reduce((s, r) => s + r.msPerTick * r.ticks, 0) / Math.max(1, ticks)
    setAll({ runs, stressMs, avgMs, running: false, current: '' })
  }

  const report = () => {
    if (!all) return ''
    const lines = [
      `Sandlab Spill S0 bench (browser)`,
      `UA: ${ua}`,
      `DPR ${typeof window !== 'undefined' ? window.devicePixelRatio : '?'} · cell ${cssSize.dpc} device px`,
      ...all.runs.map((r) => `${r.result.pass ? 'PASS' : 'FAIL'} ${r.title} — ${r.result.summary} · ${r.msPerTick.toFixed(3)} ms/tick · hash ${r.hash}`),
      `avg ${all.avgMs.toFixed(3)} ms/tick · stress ${all.stressMs.toFixed(3)} ms/tick · FF cap ${ffCap(all.stressMs)}x`,
      `${all.runs.filter((r) => r.result.pass).length}/${all.runs.length} PASS`,
    ]
    return lines.join('\n')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const cur = ALL.find((c) => c.id === caseId) ?? ALL[0]
  const passCount = all ? all.runs.filter((r) => r.result.pass).length : 0

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '12px 16px 40px', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 18, margin: '0 0 4px' }}>Spill engine bench (S0)</h1>
      <p style={{ margin: '0 0 10px', fontSize: 13, opacity: 0.7 }}>
        CPU puzzle sim · 160×240 · 60 ticks/s · dev page (noindex)
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <select
          value={caseId}
          onChange={(e) => pick(e.target.value)}
          aria-label="Bench level"
          style={{ ...btn(), flex: '1 1 180px', fontWeight: 600 }}
        >
          {ALL.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        {[1, 2, 4].map((s) => (
          <button key={s} type="button" style={btn(speed === s)} onClick={() => setSpeed(s)}>{s}x</button>
        ))}
        <button type="button" style={btn()} onClick={toggle} aria-label={running ? 'Pause' : 'Play'}>{running ? '⏸' : '▶'}</button>
        <button type="button" style={btn()} onClick={() => loadCase(cur)} aria-label="Restart">↺</button>
        <button type="button" style={btn(glow)} onClick={() => setGlow((g) => !g)}>glow</button>
      </div>

      <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', margin: '0 0 8px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span>tick {hud.tick}</span>
        <span style={{ color: hud.msTick > 4 ? '#ff6b6b' : hud.msTick > 2 ? '#f5a623' : '#7ddc7d' }}>{hud.msTick.toFixed(2)} ms/tick</span>
        <span>{hud.fps.toFixed(0)} fps</span>
        <span>{speed}x</span>
      </div>

      <div ref={wrapRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={160}
          height={240}
          style={{ width: cssSize.w, height: cssSize.h, imageRendering: 'pixelated', background: '#07090D', borderRadius: 4 }}
        />
      </div>

      <p style={{ fontSize: 13, margin: '8px 0 0', opacity: 0.85 }}>
        <b>Goal:</b> {cur.goal}
        {hud.result && (
          <>
            <br />
            <b style={{ color: hud.result.pass ? '#7ddc7d' : '#ff6b6b' }}>{hud.result.pass ? 'PASS' : 'FAIL'}</b>{' '}
            {hud.result.summary}{hud.result.detail ? ` — ${hud.result.detail}` : ''} (tick {hud.doneAt})
          </>
        )}
      </p>

      <section style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" style={btn(true)} onClick={runAll} disabled={all?.running}>
            {all?.running ? `Running… ${all.current}` : 'Run all 7 targets'}
          </button>
          {all && !all.running && (
            <button type="button" style={btn()} onClick={copy}>{copied ? 'Copied' : 'Copy report'}</button>
          )}
        </div>
        {all && (
          <div style={{ marginTop: 12, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              {all.runs.map((r) => (
                <li key={r.id} style={{ borderLeft: `3px solid ${r.result.pass ? '#7ddc7d' : '#ff6b6b'}`, paddingLeft: 10 }}>
                  <b>{r.result.pass ? 'PASS' : 'FAIL'}</b> {r.title} — {r.result.summary}
                  <div style={{ opacity: 0.7 }}>
                    {r.result.detail ? `${r.result.detail} · ` : ''}{r.ticks} ticks · {r.msPerTick.toFixed(3)} ms/tick · hash {r.hash}
                  </div>
                </li>
              ))}
            </ol>
            {!all.running && (
              <p style={{ margin: '12px 0 0' }}>
                <b>{passCount}/{all.runs.length} PASS</b> · avg {all.avgMs.toFixed(3)} ms/tick · stress {all.stressMs.toFixed(3)} ms/tick ·
                FF cap {ffCap(all.stressMs)}x · S0 gate (1x ≤ 4 ms):{' '}
                <b style={{ color: all.stressMs <= 4 ? '#7ddc7d' : '#ff6b6b' }}>{all.stressMs <= 4 ? 'OK' : 'OVER'}</b>
              </p>
            )}
            <p style={{ margin: '8px 0 0', opacity: 0.5, wordBreak: 'break-all' }}>{ua}</p>
          </div>
        )}
      </section>
    </main>
  )
}
