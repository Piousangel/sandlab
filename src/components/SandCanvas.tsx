'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { SandEngine, WebGPUUnsupported } from '@/lib/sand/engine'
import { PRESETS, buildIndex } from '@/lib/sand/materials'
import { buildShareUrl, readShareUrl, encodeScene, decodeScene } from '@/lib/sand/urlState'
import { uploadScene } from '@/lib/sand/gallery'
import { makeThumb, isBlank } from '@/lib/sand/thumb'
import { getScene } from '@/lib/sand/gallery'
import { recordClip, downloadClip, RecordUnsupported } from '@/lib/sand/record'

/**
 * 격자 해상도 — 2:1 고정, 72만 셀.
 *
 * 왜 뷰포트에 맞춰 동적으로 안 잡는가:
 *   공유 URL이 격자 크기(w,h)를 담는다. 격자가 뷰포트마다 다르면 넓은 모니터에서
 *   만든 링크가 노트북에서 안 열린다. 링크 이식성이 이 제품의 핵심 장치이므로
 *   격자는 고정하고 화면에는 레터박스로 맞춘다.
 *
 * 왜 2:1인가:
 *   캔버스는 도크 위 영역에 들어가므로 항상 '높이에 갇힌' 상태다. 즉 세로가 꽉 차면
 *   가로에 여백이 남는다. 16:9(1.78)일 때 전형적 창에서 가로 200px가 놀았다.
 *   2:1로 넓히면 같은 높이에서 캔버스가 더 크다. 그 비율로 표시하면 셀은 정사각형.
 *   더 넓히면(21:9 등) 낙하 거리가 짧아져 낙사가 심심해진다 — 2:1이 균형점.
 */
const W = 1200
const H = 600

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
  const [rec, setRec] = useState<number | null>(null) // null=대기, 0..1=녹화중
  const [busy, setBusy] = useState(false)
  // 빈 캔버스 온보딩: 첫 방문자는 검은 상자만 보면 그릴 줄 모른다. 한 번이라도 그리면(또는 장면 복원 시) 끈다.
  const [hasDrawn, setHasDrawn] = useState(false)
  // 지우개 모드. 데스크톱은 우클릭으로도 지우지만 터치엔 우클릭이 없어 이 토글이 유일한 지우기 수단이다.
  const [erasing, setErasing] = useState(false)
  // 터치(coarse pointer)에선 우클릭이 없다 — 힌트/안내 문구를 포인터 타입에 맞춘다.
  const [coarse, setCoarse] = useState(false)
  const idx = useRef(buildIndex(PRESETS))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(pointer: coarse)')
    const on = () => setCoarse(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // 도크는 좁은 화면에서 여러 줄로 접힌다(모바일). 캔버스 영역(stage)이 도크를 가리거나
  // 도크에 가리지 않도록, 도크의 실제 높이를 재서 stage.bottom을 거기에 맞춘다.
  // 인라인 스타일이라 미디어쿼리를 못 써서 측정 기반으로 간다 — 데스크톱(한 줄)도 그대로 동작.
  const dockRef = useRef<HTMLDivElement>(null)
  const [dockH, setDockH] = useState(56)
  useEffect(() => {
    const el = dockRef.current
    if (!el) return
    const measure = () => setDockH(el.offsetHeight)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false

    const eng = new SandEngine({ canvas, width: W, height: H, materials: PRESETS })
    eng
      .init()
      .then(async () => {
        if (disposed) return
        // #s=<id> = 갤러리 장면. #g=<blob> = URL 내장 장면.
        // 갤러리 경로가 있어야 URL 예산(6000자)을 넘는 복잡한 장면도 공유된다.
        const sm = location.hash.match(/[#&]s=([A-Za-z0-9_-]{6,16})/)
        let restored = null
        if (sm) {
          try {
            const sc = await getScene(sm[1])
            restored = await decodeScene(sc.data)
          } catch {
            /* 삭제됐거나 잘못된 id — 빈 화면으로 시작한다 */
          }
        } else {
          restored = await readShareUrl()
        }
        if (!disposed && restored && restored.w === W && restored.h === H) {
          eng.upload(restored.cells)
          setHasDrawn(true) // 복원된 장면은 빈 게 아니므로 온보딩 힌트를 띄우지 않는다
        }
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
    // 지우개 모드(터치) 또는 우클릭(데스크톱) = 지우기. 둘 다 mat=0.
    eng.brush.mat = erasing || e.button === 2 ? 0 : (idx.current.get(sel) ?? 0)
    if (!hasDrawn) setHasDrawn(true) // 첫 붓질 → 온보딩 힌트 제거
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

  const record = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || rec !== null) return
    try {
      setRec(0)
      const clip = await recordClip({ canvas, durationMs: 10000, onProgress: setRec })
      downloadClip(clip, `sandlab-${Date.now()}`)
      flash(`${clip.format.label} saved · ${(clip.bytes / 1e6).toFixed(1)} MB — post it, don't link it.`)
    } catch (e) {
      flash(e instanceof RecordUnsupported ? e.message : 'Recording failed.')
    } finally {
      setRec(null)
    }
  }, [rec])

  const publish = useCallback(async () => {
    const eng = engineRef.current
    if (!eng || busy) return
    setBusy(true)
    try {
      const cells = await eng.readback()
      if (isBlank(cells, W * H)) return flash('Draw something first.')
      const title = window.prompt('Title for the gallery?', '')
      if (title === null) return
      const [data, thumb] = await Promise.all([
        encodeScene(cells, W, H),
        makeThumb(cells, W, H, PRESETS),
      ])
      const { id } = await uploadScene({ title, data, thumb, w: W, h: H })
      const url = `${location.origin}/#s=${id}`
      history.replaceState(null, '', url)
      await navigator.clipboard.writeText(url).catch(() => {})
      flash('Published to the gallery — link copied.')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Publish failed.')
    } finally {
      setBusy(false)
    }
  }, [busy])

  const share = useCallback(async () => {
    const eng = engineRef.current
    if (!eng) return
    const cells = await eng.readback()
    const res = await buildShareUrl(cells, W, H)
    if (!res.ok) {
      // 막다른 길로 두지 않는다 — 갤러리는 크기 제한이 없으므로 그쪽으로 보낸다.
      return flash(
        `Too detailed for a link (${(res.size / res.budget).toFixed(1)}x over). Use Publish instead.`,
      )
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
      <div style={{ ...S.stage, bottom: dockH }}>
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
        {ready && !hasDrawn && (
          <div style={S.onboard}>{coarse ? 'Drag to pour sand' : 'Click and drag to pour sand'}</div>
        )}
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

      <div ref={dockRef} style={S.dock}>
        <div style={S.chips}>
          {PAINTABLE.map((m) => {
            const on = sel === m.slug
            return (
              <button
                key={m.slug}
                onClick={() => {
                  setSel(m.slug)
                  setErasing(false) // 재료를 고르면 지우개 모드 해제
                }}
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

        <span style={S.selName}>{erasing ? 'Erase' : PRESETS.find((m) => m.slug === sel)?.name}</span>

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

        <button
          style={{ ...S.ghost, ...(erasing ? S.ghostActive : null) }}
          onClick={() => setErasing((v) => !v)}
          aria-pressed={erasing}
          title="Eraser — draw to remove (right-click also erases on desktop)"
        >
          Erase
        </button>
        <button style={S.ghost} onClick={() => engineRef.current?.clear()}>
          Clear
        </button>
        <button style={S.ghost} onClick={share}>
          Copy link
        </button>
        <button style={S.ghost} onClick={publish} disabled={busy}>
          {busy ? 'Publishing…' : 'Publish'}
        </button>
        <a style={{ ...S.ghost, textDecoration: 'none', lineHeight: '1.6' }} href="/gallery">
          Gallery
        </a>
        <button
          style={{ ...S.primary, opacity: rec !== null ? 0.75 : 1, minWidth: 104 }}
          onClick={record}
          disabled={rec !== null}
          title="Record 10 seconds and download — post the clip, not the link"
        >
          {rec !== null ? `Recording ${(10 - rec * 10).toFixed(1)}s` : 'Record 10s clip'}
        </button>
      </div>

      {rec !== null && (
        <div style={{ ...S.recRing, clipPath: `inset(0 ${(1 - rec) * 100}% 0 0)` }} />
      )}
      {!coarse && <div style={S.hint}>Right-click to erase</div>}
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
    bottom: 56,
    display: 'grid',
    placeItems: 'center',
    padding: '8px 8px 0',
  },
  canvas: {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    aspectRatio: '2 / 1',
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
    minHeight: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // 좁은 화면에서 여러 줄로 접힌다 — 접힌 높이는 ResizeObserver가 재서 stage가 비켜준다.
    // 데스크톱에선 한 줄에 다 들어가 wrap이 일어나지 않으므로 외형 변화 없다.
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 10,
    padding: '8px 14px',
  },
  // 칩 컨테이너도 접혀야 한다 — 원소 18개는 그 자체로 폰 폭을 넘는다.
  chips: {
    display: 'flex',
    gap: 9,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 8,
  },
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
  // 토글 활성 상태(지우개 ON) — 앱 액센트 색으로 지금 지우개 모드임을 명확히 보여준다.
  ghostActive: {
    opacity: 1,
    color: '#cfe0ff',
    background: 'rgba(59,109,255,0.18)',
    border: '1px solid rgba(91,140,255,0.7)',
    boxShadow: '0 0 0 1px rgba(91,140,255,0.25)',
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
  // 녹화 진행 바 — 화면 최상단. 지금 뭘 담고 있는지 보이지 않으면 사람은 안 누른다.
  recRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: 'linear-gradient(90deg, #ff3b6d, #ff8f3b)',
    boxShadow: '0 0 14px rgba(255,59,109,0.8)',
    pointerEvents: 'none',
    transition: 'clip-path 80ms linear',
  },
  // 빈 캔버스 중앙 온보딩 — pointerEvents none이라 그 위로 바로 그릴 수 있다.
  onboard: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    userSelect: 'none',
    color: '#eef1f6',
    opacity: 0.4,
    fontSize: 15,
    fontWeight: 500,
    letterSpacing: 0.3,
    textShadow: '0 1px 12px rgba(0,0,0,0.9)',
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
