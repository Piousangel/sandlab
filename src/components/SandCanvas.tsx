'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { SandEngine, WebGPUUnsupported } from '@/lib/sand/engine'
import { PRESETS, buildIndex } from '@/lib/sand/materials'
import { buildShareUrl, readShareUrl } from '@/lib/sand/urlState'

/**
 * 격자 해상도 — 16:9 고정.
 *
 * 왜 뷰포트에 맞춰 동적으로 안 잡는가:
 *   공유 URL이 격자 크기(w,h)를 담는다. 격자가 뷰포트마다 다르면 16:9 모니터에서
 *   만든 링크가 노트북에서 안 열린다. 링크 이식성이 이 제품의 핵심 장치이므로
 *   격자는 고정하고 화면에는 레터박스로 맞춘다.
 *
 * 왜 16:9인가: 대부분의 화면 비율이라 레터박스 여백이 최소가 되고,
 *   그 비율로 표시하면 셀이 정확히 정사각형이 된다.
 *   (이전 800×500 격자를 1.88 뷰포트에 늘려서 셀이 가로로 찌그러져 있었다.)
 */
const W = 960
const H = 540

const PAINTABLE = PRESETS.filter((m) => m.slug !== 'empty')

export default function SandCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<SandEngine | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [sel, setSel] = useState('sand')
  const [radius, setRadius] = useState(6)
  const [toast, setToast] = useState<string | null>(null)
  const [fps, setFps] = useState(0)
  const idx = useRef(buildIndex(PRESETS))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false

    const eng = new SandEngine({ canvas, width: W, height: H, materials: PRESETS })
    eng
      .init()
      .then(async () => {
        if (disposed) return
        const restored = await readShareUrl()
        if (!disposed && restored && restored.w === W && restored.h === H) eng.upload(restored.cells)
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

  useEffect(() => {
    if (!ready) return
    const t = setInterval(() => setFps(engineRef.current?.fps ?? 0), 500)
    return () => clearInterval(t)
  }, [ready])

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
    // 우클릭 = 지우개 (모드 전환 없이 지울 수 있어야 손이 안 끊긴다)
    eng.brush.mat = e.button === 2 ? 0 : (idx.current.get(sel) ?? 0)
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current
    if (!eng || eng.brush.mat === 0xffffffff) return
    const { x, y } = toGrid(e)
    eng.brush.x = x
    eng.brush.y = y
  }

  const onUp = () => {
    const eng = engineRef.current
    if (eng) eng.brush.mat = 0xffffffff
  }

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2600)
  }

  const share = useCallback(async () => {
    const eng = engineRef.current
    if (!eng) return
    const cells = await eng.readback()
    const res = await buildShareUrl(cells, W, H)
    if (!res.ok) {
      // 정직하게: 왜 안 되는지 숫자로 알려준다. "다시 시도"는 조언이 아니다.
      return flash(`Scene is ${(res.size / res.budget).toFixed(1)}x too big for a link. Erase some and retry.`)
    }
    history.replaceState(null, '', res.url)
    await navigator.clipboard.writeText(res.url).catch(() => {})
    flash('Link copied — it opens exactly this scene.')
  }, [])

  if (err) {
    return (
      <div style={S.errWrap}>
        <div style={S.errCard}>
          <h2 style={{ margin: '0 0 10px', fontSize: 19 }}>WebGPU isn&apos;t available</h2>
          <p style={{ margin: '0 0 14px', opacity: 0.72, fontSize: 14, lineHeight: 1.55 }}>{err}</p>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>
            Works in Chrome/Edge 113+, and Safari 26+ (macOS Tahoe, iOS 26).
            <br />
            In Firefox, enable <code style={S.code}>dom.webgpu.enabled</code> in{' '}
            <code style={S.code}>about:config</code>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={S.root}>
      <div style={S.stage}>
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
      </div>

      <div style={S.brand}>
        <span style={{ fontWeight: 650, letterSpacing: -0.2 }}>Sandlab</span>
        <span style={S.brandSub}>GPU sand · no install</span>
      </div>

      {ready && (
        <div style={S.stat}>
          {fps} fps · {((W * H) / 1000).toFixed(0)}k cells
        </div>
      )}

      <div style={S.dock}>
        <div style={S.chips}>
          {PAINTABLE.map((m) => {
            const on = sel === m.slug
            return (
              <button
                key={m.slug}
                onClick={() => setSel(m.slug)}
                title={m.name}
                aria-label={m.name}
                style={{
                  ...S.chip,
                  background: m.color,
                  transform: on ? 'scale(1.28)' : 'scale(1)',
                  boxShadow: on
                    ? `0 0 0 2px #0b0e13, 0 0 0 3.5px #fff, 0 0 14px ${m.color}`
                    : m.emissive > 0.5
                      ? `0 0 10px ${m.color}88`
                      : 'inset 0 0 0 1px #ffffff22',
                }}
              />
            )
          })}
        </div>

        <div style={S.sep} />

        <span style={S.selName}>{PRESETS.find((m) => m.slug === sel)?.name}</span>

        <div style={S.sep} />

        <label style={S.sizeWrap} title="Brush size">
          <input
            type="range"
            min={1}
            max={24}
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
            style={S.range}
          />
          <span style={S.sizeNum}>{radius}</span>
        </label>

        <div style={S.sep} />

        <button style={S.ghost} onClick={() => engineRef.current?.clear()}>
          Clear
        </button>
        <button style={S.primary} onClick={share}>
          Share link
        </button>
      </div>

      <div style={S.hint}>Right-click to erase</div>
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  )
}

const glass: React.CSSProperties = {
  background: 'rgba(16,19,26,0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.09)',
}

const S: Record<string, React.CSSProperties> = {
  root: { position: 'fixed', inset: 0, background: '#07090D', overflow: 'hidden' },
  // 캔버스는 도크 위 영역을 레터박스로 채운다. 뷰포트 끝까지 가지 않는다 —
  // 바닥까지 차면 UI를 어디 둬도 콘텐츠(쌓인 모래)를 가린다.
  stage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 76,
    display: 'grid',
    placeItems: 'center',
    padding: '12px 12px 0',
  },
  canvas: {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    aspectRatio: '16 / 9',
    touchAction: 'none',
    cursor: 'crosshair',
    borderRadius: 10,
    // 시뮬이 '장소'로 느껴지게 하는 테두리. 무한 블리드보다 낫다.
    boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 20px 60px rgba(0,0,0,0.6)',
  },
  brand: {
    position: 'absolute',
    top: 18,
    left: 20,
    display: 'flex',
    alignItems: 'baseline',
    gap: 9,
    fontSize: 15,
    color: '#eef1f6',
    textShadow: '0 1px 12px rgba(0,0,0,0.9)',
    pointerEvents: 'none',
  },
  brandSub: { fontSize: 11.5, opacity: 0.45, letterSpacing: 0.2 },
  stat: {
    position: 'absolute',
    top: 20,
    right: 20,
    fontSize: 11,
    color: '#eef1f6',
    opacity: 0.34,
    fontVariantNumeric: 'tabular-nums',
    textShadow: '0 1px 10px rgba(0,0,0,0.9)',
    pointerEvents: 'none',
  },
  // 도크는 하단 중앙 — 동선상 최적(마우스가 자연히 낮은 중앙에 있다).
  // 시뮬 '위에 겹치는' 게 아니라 시뮬 '아래' 자기 영역에 있으므로 콘텐츠를 안 가린다.
  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '0 16px',
  },
  chips: { display: 'flex', gap: 9, alignItems: 'center' },
  chip: {
    width: 19,
    height: 19,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'transform 110ms cubic-bezier(.2,.9,.3,1.2), box-shadow 110ms',
  },
  sep: { width: 1, height: 22, background: 'rgba(255,255,255,0.10)' },
  selName: {
    minWidth: 64,
    fontSize: 11.5,
    color: '#eef1f6',
    opacity: 0.82,
    textAlign: 'center',
    fontWeight: 550,
    letterSpacing: 0.1,
  },
  sizeWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  range: { width: 80, accentColor: '#5b8cff', cursor: 'pointer' },
  sizeNum: {
    fontSize: 10,
    opacity: 0.4,
    color: '#eef1f6',
    fontVariantNumeric: 'tabular-nums',
  },
  ghost: {
    background: 'transparent',
    color: '#eef1f6',
    opacity: 0.68,
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 11.5,
    cursor: 'pointer',
  },
  primary: {
    background: '#3b6dff',
    color: '#fff',
    border: '1px solid #3b6dff',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 3px 16px rgba(59,109,255,0.4)',
    whiteSpace: 'nowrap',
  },
  hint: {
    position: 'absolute',
    top: 40,
    right: 22,
    fontSize: 10.5,
    color: '#eef1f6',
    opacity: 0.22,
    pointerEvents: 'none',
    textShadow: '0 1px 10px rgba(0,0,0,0.9)',
  },
  toast: {
    ...glass,
    position: 'absolute',
    top: 22,
    left: '50%',
    transform: 'translateX(-50%)',
    borderRadius: 9,
    padding: '9px 15px',
    fontSize: 12.5,
    color: '#eef1f6',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    whiteSpace: 'nowrap',
  },
  errWrap: { position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20 },
  errCard: { ...glass, maxWidth: 480, padding: 26, borderRadius: 14 },
  code: {
    background: 'rgba(255,255,255,0.07)',
    padding: '1px 5px',
    borderRadius: 4,
    fontSize: 12,
  },
}
