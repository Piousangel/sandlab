import { useEffect, useRef, useState } from 'react'
import { SandEngine, WebGPUUnsupported } from '../../src/lib/sand/engine'
import { PRESETS, buildIndex } from '../../src/lib/sand/materials'

const W = 1200
const H = 600

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<SandEngine | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [lost, setLost] = useState(false)
  const [ready, setReady] = useState(false)
  const idx = useRef(buildIndex(PRESETS))
  const [sel, setSel] = useState('sand')
  const [radius, setRadius] = useState(6)
  const [erasing, setErasing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const PAINTABLE = PRESETS.filter((m) => m.slug !== 'empty')

  useEffect(() => {
    const eng = engineRef.current
    if (eng) eng.brush.r = radius
  }, [radius, ready])

  const toGrid = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * W),
      y: Math.floor(((e.clientY - r.top) / r.height) * H),
    }
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const eng = engineRef.current
    if (!eng) return
    const { x, y } = toGrid(e)
    eng.brush.x = x
    eng.brush.y = y
    const isErase = erasing || e.button === 2
    eng.brush.mat = isErase ? 0 : (idx.current.get(sel) ?? 0)
    if (!hasDrawn) setHasDrawn(true)
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current
    if (!eng || eng.brush.mat === 0xffffffff) return
    const { x, y } = toGrid(e)
    eng.brush.x = x
    eng.brush.y = y
  }

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current
    if (eng) eng.brush.mat = 0xffffffff
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false

    const eng = new SandEngine({ canvas, width: W, height: H, materials: PRESETS })
    eng.onLost = () => {
      if (!disposed) setLost(true)
    }
    eng
      .init()
      .then(() => {
        if (disposed) return
        engineRef.current = eng
        eng.start()
        setReady(true)
      })
      .catch((e) => {
        if (!disposed) setErr(e instanceof WebGPUUnsupported ? e.message : String(e))
      })

    return () => {
      disposed = true
      eng.destroy()
      engineRef.current = null
    }
  }, [])

  if (lost) {
    return (
      <div style={S.errWrap}>
        <div style={S.errCard}>
          <h2 style={{ margin: '0 0 10px', fontSize: 19 }}>The GPU was interrupted</h2>
          <p style={{ margin: '0 0 16px', opacity: 0.72, fontSize: 14, lineHeight: 1.55 }}>
            Reload to pick up where the sandbox left off.
          </p>
          <button onClick={() => location.reload()} style={S.reloadBtn}>
            Reload
          </button>
        </div>
      </div>
    )
  }

  if (err) {
    return (
      <div style={S.errWrap}>
        <div style={S.errCard}>
          <h2 style={{ margin: '0 0 10px', fontSize: 19 }}>This browser can&apos;t run the sandbox</h2>
          <p style={{ margin: 0, opacity: 0.72, fontSize: 14, lineHeight: 1.55 }}>{err}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={S.root}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={S.canvas}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
      />
      {!ready && <div style={S.loading}>Loading…</div>}
      {ready && !hasDrawn && <div style={S.onboard}>Click and drag to pour sand</div>}
      <div style={S.dock}>
        <div style={S.chips}>
          {PAINTABLE.map((m) => {
            const on = sel === m.slug
            return (
              <button
                key={m.slug}
                onClick={() => { setSel(m.slug); setErasing(false) }}
                title={m.name}
                aria-pressed={!erasing && on}
                style={{
                  ...S.chip,
                  background: m.color,
                  transform: on ? 'scale(1.3)' : 'scale(1)',
                  boxShadow: on ? `0 0 0 2px #0b0e13, 0 0 0 3.5px #fff` : 'inset 0 0 0 1px #ffffff22',
                }}
              />
            )
          })}
        </div>
        <label style={S.sizeWrap}>
          <input type="range" min={1} max={24} value={radius} onChange={(e) => setRadius(+e.target.value)} style={S.range} />
        </label>
        <button
          style={{ ...S.ghost, ...(erasing ? S.ghostActive : null) }}
          onClick={() => setErasing((v) => !v)}
          aria-pressed={erasing}
        >
          Erase
        </button>
        <button style={S.ghost} onClick={() => engineRef.current?.clear()}>
          Clear
        </button>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  root: { position: 'fixed', inset: 0, background: '#07090d' },
  canvas: { width: '100%', height: '100%', display: 'block', touchAction: 'none' },
  loading: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#eef1f6', opacity: 0.6, fontFamily: 'system-ui', fontSize: 14,
  },
  errWrap: { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090d' },
  errCard: { maxWidth: 360, padding: 24, color: '#eef1f6', fontFamily: 'system-ui', textAlign: 'center' },
  reloadBtn: { background: '#f5a623', border: 'none', borderRadius: 7, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' },
  onboard: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    color: '#eef1f6', opacity: 0.55, fontSize: 14, fontFamily: 'system-ui', pointerEvents: 'none',
  },
  dock: {
    position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 10,
    flexWrap: 'wrap', padding: '10px 14px', background: 'rgba(11,14,19,0.85)', backdropFilter: 'blur(6px)',
  },
  chips: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  chip: { width: 19, height: 19, borderRadius: '50%', border: 'none', cursor: 'pointer' },
  sizeWrap: { display: 'flex', alignItems: 'center' },
  range: { width: 90 },
  ghost: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: '#eef1f6',
    borderRadius: 7, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'system-ui',
  },
  ghostActive: { background: 'rgba(255,255,255,0.14)' },
}
