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
      <canvas ref={canvasRef} width={W} height={H} style={S.canvas} onContextMenu={(e) => e.preventDefault()} />
      {!ready && <div style={S.loading}>Loading…</div>}
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
}
