'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import type { LevelDef } from '@/lib/spill/level/define'
import type { ParsedLevel } from '@/lib/spill/level/parse'
import { LEVELS } from '@/lib/spill/levels'
import { SpillController, type PlayState, type Speed } from '@/lib/spill/play/controller'
import { pointerToTile, snapLine, type TileLine } from '@/lib/spill/play/input'
import { formatSecs } from '@/lib/spill/play/score'
import { SpillRenderer } from '@/lib/spill/render/canvas'
import { H, TILE, W } from '@/lib/spill/sim/grid'
import { blankLevel, devFromActions, joinLevel, levelSource, splitLevel, withDev, withPar } from '@/lib/spill/editor/editor'
import { formatReport, localRunner, verifyLevel, type VerifyReport } from '@/lib/spill/verify/verify'

const CELL = 2
const CW = W * CELL
const CH = H * CELL

const btn = (on = false): CSSProperties => ({
  minHeight: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #2a3344', background: on ? '#f5a623' : '#141a24',
  color: on ? '#07090D' : '#eef1f6', fontWeight: 600, fontSize: 13, cursor: 'pointer',
})
const area: CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#0b0f16', color: '#dfe6f0', border: '1px solid #2a3344', borderRadius: 8,
  fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, lineHeight: 1.25, padding: 8, whiteSpace: 'pre', overflow: 'auto',
}
const panel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }

function drawOverlay(cv: HTMLCanvasElement, p: ParsedLevel, st: PlayState | null, ghost: TileLine | null): void {
  const ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, CW, CH)
  ctx.lineWidth = 2
  ctx.font = '11px ui-monospace, monospace'
  p.targets.forEach((t, k) => {
    const v = st?.targets[k]
    ctx.strokeStyle = t.kind === 'bad' ? '#ff5d5d' : v?.latched ? '#7ddc7d' : '#f5f5f5'
    ctx.strokeRect(t.x * CELL, t.y * CELL, t.w * CELL, t.h * CELL)
    ctx.fillStyle = ctx.strokeStyle
    ctx.fillText(`${t.id} ${v ? v.progress : 0}/${v ? v.need : t.kind === 'protect' ? t.holdTicks : t.need}`, t.x * CELL + 2, t.y * CELL - 3)
  })
  p.gems.forEach((g, k) => {
    ctx.strokeStyle = st?.gems[k] ? '#7ddc7d' : '#ffd84d'
    ctx.setLineDash([4, 3])
    ctx.strokeRect(g.x * CELL, g.y * CELL, g.w * CELL, g.h * CELL)
    ctx.setLineDash([])
  })
  if (ghost) {
    ctx.fillStyle = 'rgba(245,166,35,0.45)'
    const dx = Math.sign(ghost.tx2 - ghost.tx)
    const dy = Math.sign(ghost.ty2 - ghost.ty)
    const n = Math.max(Math.abs(ghost.tx2 - ghost.tx), Math.abs(ghost.ty2 - ghost.ty))
    for (let i = 0; i <= n; i++) ctx.fillRect((ghost.tx + dx * i) * TILE * CELL, (ghost.ty + dy * i) * TILE * CELL, TILE * CELL, TILE * CELL)
  }
}

export default function SpillEditor() {
  const [source, setSource] = useState<string>(LEVELS[0]?.id ?? 'blank')
  const initial = splitLevel(LEVELS[0] ?? blankLevel())
  const [meta, setMeta] = useState(initial.meta)
  const [map, setMap] = useState(initial.map)
  const [state, setState] = useState<PlayState | null>(null)
  const [speed, setSpeedState] = useState<Speed>(1)
  const [report, setReport] = useState<VerifyReport | null>(null)
  const [progress, setProgress] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [limit, setLimit] = useState(300)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const ctrlRef = useRef<SpillController | null>(null)
  const rendererRef = useRef<SpillRenderer | null>(null)
  const dragRef = useRef<{ fx: number; fy: number } | null>(null)
  const ghostRef = useRef<TileLine | null>(null)

  const joined = useMemo(() => joinLevel(meta, map), [meta, map])
  const def: LevelDef | null = joined.ok ? joined.def : null
  const parsed: ParsedLevel | null = joined.ok ? joined.parsed : null

  const redraw = useCallback(() => {
    const c = ctrlRef.current
    if (!c || !parsed) return
    rendererRef.current?.draw(c.sim.grid, c.sim.tick)
    if (overlayRef.current) drawOverlay(overlayRef.current, parsed, c.getState(), ghostRef.current)
  }, [parsed])

  useEffect(() => {
    if (!canvasRef.current) return
    rendererRef.current = new SpillRenderer(canvasRef.current)
  }, [])

  useEffect(() => {
    if (!parsed) return
    const c = new SpillController(parsed)
    ctrlRef.current = c
    setState(c.getState())
    const off = c.subscribe((s) => setState(s))
    redraw()
    return () => { off(); if (ctrlRef.current === c) ctrlRef.current = null }
  }, [parsed, redraw])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const c = ctrlRef.current
      if (c) {
        c.frame(now - last)
        redraw()
      }
      last = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [redraw])

  const load = (id: string) => {
    setSource(id)
    const d = id === 'blank' ? blankLevel() : LEVELS.find((l) => l.id === id)
    if (!d) return
    const s = splitLevel(d)
    setMeta(s.meta)
    setMap(s.map)
    setReport(null)
  }

  const setDef = (d: LevelDef) => {
    setMeta(splitLevel(d).meta)
    setReport(null)
  }

  const tileAt = (e: RPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return pointerToTile(e.clientX, e.clientY, { left: r.left, top: r.top, width: r.width, height: r.height })
  }
  const maxLen = def?.verbs?.dig?.maxLen ?? 0
  const onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!maxLen) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = tileAt(e)
    const t = dragRef.current
    ghostRef.current = snapLine(t.fx, t.fy, t.fx, t.fy, maxLen)
  }
  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current
    if (!d) return
    const t = tileAt(e)
    ghostRef.current = snapLine(d.fx, d.fy, t.fx, t.fy, maxLen)
  }
  const onUp = () => {
    const g = ghostRef.current
    dragRef.current = null
    ghostRef.current = null
    if (g && ctrlRef.current) ctrlRef.current.act({ verb: 'dig', ...g })
  }

  const c = ctrlRef.current
  const recorded = state ? [...state.setup, ...state.run] : []
  const gates = def?.verbs?.trigger ?? []

  const runVerify = async () => {
    if (!def) return
    setBusy(true)
    setReport(null)
    setProgress('starting…')
    const run = localRunner({ yieldEvery: 3, onProgress: (done) => setProgress(`${done} sims`) })
    try {
      setReport(await verifyLevel(def, run, { solverLimit: limit }))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const exported = def ? levelSource(def) : ''

  return (
    <main style={{ minHeight: '100dvh', background: '#07090D', color: '#eef1f6', padding: '12px 16px 40px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 18, margin: '0 0 4px' }}>Spill level editor (dev)</h1>
      <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.7 }}>
        Map: 80×120 chars, one char = 2×2 cells; tiles are 2×2 chars. Drag on the preview to Dig, use the gate buttons while running, then save the run as the dev solution and verify.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <select value={source} onChange={(e) => load(e.target.value)} style={{ ...btn(), minWidth: 180 }}>
          {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.id} {l.name}</option>)}
          <option value="blank">blank level</option>
        </select>
        {!joined.ok && <span style={{ color: '#ff6b6b', fontSize: 13 }}>{joined.error}</span>}
        {joined.ok && <span style={{ color: '#7ddc7d', fontSize: 13 }}>parsed · {parsed!.gates.length} gates · {parsed!.spouts.length} spouts</span>}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ ...panel, flex: '0 0 auto' }}>
          <div style={{ position: 'relative', width: CW, height: CH, maxWidth: '100%' }}>
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: CW, height: CH, imageRendering: 'pixelated' }} />
            <canvas ref={overlayRef} width={CW} height={CH} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              style={{ position: 'absolute', inset: 0, width: CW, height: CH, touchAction: 'none', cursor: maxLen ? 'crosshair' : 'default' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" style={btn(state?.phase === 'run')} onClick={() => { if (!c) return; if (c.phase === 'setup') c.run(); else c.togglePause() }}>
              {state?.phase === 'setup' ? '▶ Run' : state?.phase === 'run' ? '⏸' : '▶'}
            </button>
            <button type="button" style={btn()} onClick={() => c?.retry()}>↺ Retry</button>
            <button type="button" style={btn()} onClick={() => c?.undo()} disabled={!state?.canUndo}>Undo</button>
            <button type="button" style={btn()} onClick={() => c?.clearAll()}>Clear</button>
            {([1, 2, 4] as Speed[]).map((s) => (
              <button key={s} type="button" style={btn(speed === s)} onClick={() => { if (c) setSpeedState(c.setSpeed(s)) }}>{s}x</button>
            ))}
            {gates.map((g) => (
              <button key={g} type="button" style={btn(state?.triggered.includes(g))} onClick={() => c?.act({ verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: g })}>
                Trigger {g}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            {state && <>
              {state.phase} · tick {state.tick} ({formatSecs(state.tick)}) · {state.moves} moves · gems {state.gems.filter(Boolean).length}/{state.gems.length}
              {state.result && <> · <b style={{ color: state.result.outcome === 'cleared' ? '#7ddc7d' : '#ff6b6b' }}>{state.result.outcome}{state.result.reason ? ` (${state.result.reason})` : ''} at {state.result.ticks}t</b></>}
            </>}
          </div>
          <div style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', opacity: 0.85, maxWidth: CW }}>
            {JSON.stringify(devFromActions(recorded))}
          </div>
          <button type="button" style={btn()} disabled={!def || state?.result?.outcome !== 'cleared'}
            onClick={() => def && state?.result && setDef(withDev(def, devFromActions(recorded)))}>
            Save this clear as dev solution
          </button>
        </div>
        <div style={{ ...panel, flex: '1 1 360px' }}>
          <label style={{ fontSize: 13 }}>Meta (JSON, everything except map)</label>
          <textarea value={meta} onChange={(e) => setMeta(e.target.value)} spellCheck={false} style={{ ...area, height: 260 }} />
          <label style={{ fontSize: 13 }}>Map (80 × 120)</label>
          <textarea value={map} onChange={(e) => setMap(e.target.value)} spellCheck={false} style={{ ...area, height: 360 }} />
        </div>
      </div>
      <section style={{ marginTop: 16, ...panel }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Verify (same checks as pnpm spill:verify)</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
          <label>solver limit <input type="number" min={10} max={5000} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 300)} style={{ width: 80 }} /></label>
          <button type="button" style={btn()} disabled={!def || busy} onClick={runVerify}>{busy ? 'verifying…' : 'Run verify'}</button>
          <span style={{ opacity: 0.7 }}>{progress}</span>
          {report?.suggestedParSecs != null && def?.par && def.par.secs !== report.suggestedParSecs && (
            <button type="button" style={btn()} onClick={() => setDef(withPar(def, def.par!.moves, report.suggestedParSecs!))}>
              Apply par {report.suggestedParSecs}s
            </button>
          )}
        </div>
        {report && <pre style={{ ...area, color: report.pass ? '#a6f0a6' : '#ffb3b3' }}>{formatReport(report)}</pre>}
        <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>The browser runs single-threaded; use a small solver limit here and the full 5000 with pnpm spill:verify.</p>
      </section>
      <section style={{ marginTop: 16, ...panel }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Export</h2>
        <button type="button" style={{ ...btn(), alignSelf: 'flex-start' }} disabled={!def}
          onClick={() => { void navigator.clipboard?.writeText(exported).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) }, () => {}) }}>
          {copied ? 'Copied' : 'Copy level source'}
        </button>
        <textarea readOnly value={exported} style={{ ...area, height: 200 }} />
      </section>
    </main>
  )
}
