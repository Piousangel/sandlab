'use client'

/**
 * 챌린지 플레이 화면 — 엔진을 직접 쓴다(SandCanvas는 건드리지 않는다: 일반 샌드박스 회귀 위험 0).
 *
 * 흐름: 레벨 격자 업로드 → 붓질(칠 영역 안·잉크 남은 동안만, 빈 칸에만) → 0.5초마다 readback 판정 →
 * 4회 연속 충족(≈2초) = 클리어 → 별점·최고기록 저장.
 * 판정은 세대 번호(gen)로 Reset 이전에 출발한 늦은 readback을 버린다(즉시 클리어 오판 방지).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { SandEngine, WebGPUUnsupported } from '@/lib/sand/engine'
import { PRESETS, buildIndex } from '@/lib/sand/materials'
import { buildGrid, GRID_W, GRID_H } from '@/lib/challenge/grid'
import { judge, initialCounts, describeGoal } from '@/lib/challenge/judge'
import { ClearTracker, starsFor } from '@/lib/challenge/clear'
import { InkLedger } from '@/lib/challenge/ink'
import { canPaintAt, areaFor } from '@/lib/challenge/area'
import { saveBest, type Best } from '@/lib/challenge/progress'
import type { GoalStatus, Level, Zone } from '@/lib/challenge/types'

const IDX = buildIndex(PRESETS)
const MAT = Object.fromEntries(PRESETS.map((m) => [m.slug, m]))
const JUDGE_MS = 500
const INK_MS = 120
const SIZES = [4, 8, 14]
const OFF = 0xffffffff

const pct = (v: number, of: number) => `${(v / of) * 100}%`
const zoneStyle = (z: Exclude<Zone, 'all'>) => ({
  left: pct(z.x, GRID_W),
  top: pct(z.y, GRID_H),
  width: pct(z.w, GRID_W),
  height: pct(z.h, GRID_H),
})

export default function ChallengePlayer({ level, nextId }: { level: Level; nextId?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engRef = useRef<SandEngine | null>(null)
  // useRef(expr)는 렌더마다 expr을 평가한다 — 2.9MB 격자를 초당 ~10번 새로 만들던 문제(2026-10-09 리뷰).
  // 레벨당 한 번만 만들도록 lazy useState로 고정한다.
  const [grid] = useState(() => buildGrid(level))
  const [init] = useState(() => initialCounts(grid, level))
  const [ink] = useState(() => new InkLedger(level.palette))
  const [tracker] = useState(() => new ClearTracker())
  const gridRef = useRef(grid)
  const initRef = useRef(init)
  const inkRef = useRef(ink)
  const trackerRef = useRef(tracker)
  const inkBusyRef = useRef(false)
  const genRef = useRef(0)
  const busyRef = useRef(false)
  const downRef = useRef(false)

  const mats = Object.keys(level.palette)
  const [sel, setSel] = useState(mats[0])
  const [radius, setRadius] = useState(SIZES[1])
  const [statuses, setStatuses] = useState<GoalStatus[]>(level.goals.map(() => ({ met: false, progress: 0 })))
  const [left, setLeft] = useState<Record<string, number>>({ ...level.palette })
  const [result, setResult] = useState<{ stars: 1 | 2 | 3; ink: number; best: Best } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState(false)
  const selRef = useRef(sel)
  const radiusRef = useRef(radius)
  selRef.current = sel
  radiusRef.current = radius

  const stopBrush = () => {
    const eng = engRef.current
    if (eng) eng.brush.mat = OFF
  }

  const loadLevel = useCallback(() => {
    const eng = engRef.current
    if (!eng) return
    genRef.current++
    eng.brush.mat = OFF
    eng.upload(gridRef.current)
    eng.resetTick()
    eng.resetInk()
    inkRef.current.reset()
    trackerRef.current.reset()
    setStatuses(level.goals.map(() => ({ met: false, progress: 0 })))
    setLeft({ ...level.palette })
    setResult(null)
  }, [level])

  // 엔진 생성·정리
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    const eng = new SandEngine({ canvas, width: GRID_W, height: GRID_H, materials: PRESETS })
    eng.onLost = () => !disposed && setErr('The graphics device was lost. Reload the page to keep playing.')
    eng
      .init()
      .then(() => {
        if (disposed) return
        eng.paintEmptyOnly = true
        engRef.current = eng
        loadLevel()
        eng.start()
        setReady(true)
      })
      .catch((e) => {
        if (!disposed) setErr(e instanceof WebGPUUnsupported ? e.message : String(e))
      })
    return () => {
      disposed = true
      engRef.current = null
      eng.destroy()
    }
  }, [loadLevel])

  // 잉크 — 자주 읽어 예산 소진 즉시 붓을 멈춘다(판정 주기만 기다리면 0.5초치 초과 사용).
  useEffect(() => {
    if (!ready) return
    if (!ready || err) return
    const id = setInterval(async () => {
      const eng = engRef.current
      if (!eng || result || inkBusyRef.current) return // readback 중첩 금지(스펙 §1.3)
      inkBusyRef.current = true
      const gen = genRef.current
      try {
        const counts = await eng.readInk()
        if (gen !== genRef.current) return
        inkRef.current.update(counts)
        // 값이 바뀔 때만 상태를 갱신 — 쓸데없는 리렌더 방지
        setLeft((prev) => {
          let changed = false
          const next: Record<string, number> = {}
          for (const m of mats) {
            next[m] = inkRef.current.left(m)
            if (next[m] !== prev[m]) changed = true
          }
          return changed ? next : prev
        })
        if (eng.brush.mat !== OFF && inkRef.current.spent(PRESETS[eng.brush.mat]?.slug ?? '')) eng.brush.mat = OFF
      } catch {
        /* 장치 손실·언마운트 중 readback 실패 — onLost가 안내한다 */
      } finally {
        inkBusyRef.current = false
      }
    }, INK_MS)
    return () => clearInterval(id)
    // mats는 레벨에서 파생(레벨당 고정)
  }, [ready, result, err])

  // 판정
  useEffect(() => {
    if (!ready || err) return
    const id = setInterval(async () => {
      const eng = engRef.current
      if (!eng || busyRef.current || trackerRef.current.cleared) return
      busyRef.current = true
      const gen = genRef.current
      try {
        const tick = eng.currentTick
        const cells = await eng.readback()
        if (gen !== genRef.current) return // Reset 이후 도착한 이전 판의 결과
        const s = judge(cells, level, initRef.current, tick)
        setStatuses(s)
        if (trackerRef.current.push(s)) {
          eng.brush.mat = OFF
          downRef.current = false
          inkRef.current.update(await eng.readInk())
          const ink = inkRef.current.total()
          const stars = starsFor(ink, level.stars)
          setResult({ stars, ink, best: saveBest(level.id, { stars, ink }) })
        }
      } catch {
        /* 장치 손실·언마운트 중 readback 실패 — onLost가 안내한다 */
      } finally {
        busyRef.current = false
      }
    }, JUDGE_MS)
    return () => clearInterval(id)
  }, [ready, level, err])

  const toGrid = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * GRID_W),
      y: Math.floor(((e.clientY - r.top) / r.height) * GRID_H),
    }
  }

  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engRef.current
    if (!eng || !downRef.current || result) return
    const { x, y } = toGrid(e)
    const slug = selRef.current
    const r = radiusRef.current
    if (!canPaintAt(areaFor(level, slug), x, y, r) || inkRef.current.spent(slug)) {
      eng.brush.mat = OFF // 칠 영역 밖·잉크 소진 — 획은 유지하되 칠하지 않는다
      return
    }
    eng.brush.x = x
    eng.brush.y = y
    eng.brush.r = r
    eng.inkCap = level.palette[slug] // GPU가 예산을 넘는 칠을 즉시 거부한다
    eng.brush.mat = IDX.get(slug) ?? OFF
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    downRef.current = true
    aim(e)
  }
  const onUp = () => {
    downRef.current = false
    stopBrush()
  }

  const btn = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#eef1f6',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 13,
    cursor: 'pointer',
  } as const

  return (
    <div style={{ width: '100%' }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', display: 'grid', gap: 6 }}>
        {level.goals.map((g, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <span aria-hidden style={{ width: 14, textAlign: 'center' }}>{statuses[i]?.met ? '✓' : '○'}</span>
            <span style={{ flex: 1 }}>{describeGoal(g)}</span>
            <span style={{ width: 80, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${Math.round((statuses[i]?.progress ?? 0) * 100)}%`,
                  background: statuses[i]?.met ? '#7ddc8a' : '#f5c98a',
                  transition: 'width 300ms ease',
                }}
              />
            </span>
          </li>
        ))}
      </ul>

      <div style={{ position: 'relative', width: '100%', aspectRatio: '2 / 1' }}>
        <canvas
          ref={canvasRef}
          width={GRID_W}
          height={GRID_H}
          onPointerDown={onDown}
          onPointerMove={aim}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none',
            cursor: 'crosshair',
            borderRadius: 10,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 20px 60px rgba(0,0,0,0.6)',
          }}
        />
        {/* HUD 오버레이 — 포인터는 캔버스로 통과 */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', ...zoneStyle(areaFor(level, sel)), border: '1px dashed rgba(238,241,246,0.18)', borderRadius: 4 }} />
          {level.goals.map((g, i) =>
            'zone' in g && g.zone !== 'all' ? (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  ...zoneStyle(g.zone),
                  border: `1.5px dashed ${statuses[i]?.met ? '#7ddc8a' : '#f5c98a'}`,
                  borderRadius: 4,
                }}
              />
            ) : null,
          )}
        </div>
        {!ready && !err && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 0.6, fontSize: 14 }}>
            Loading the level…
          </div>
        )}
        {err && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center', fontSize: 14, background: 'rgba(7,9,13,0.85)', borderRadius: 10 }}>
            <p style={{ maxWidth: 420 }}>
              This level needs WebGPU, which this browser does not provide. Try a recent Chrome or Edge. {err}
            </p>
          </div>
        )}
        {result && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(7,9,13,0.72)', borderRadius: 10 }}>
            <div role="dialog" aria-label="Level cleared" style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 34, letterSpacing: 4, color: '#f5c98a' }}>
                {'★'.repeat(result.stars)}
                <span style={{ opacity: 0.25 }}>{'★'.repeat(3 - result.stars)}</span>
              </div>
              <p style={{ margin: '8px 0 2px', fontSize: 18, fontWeight: 650 }}>Cleared!</p>
              <p style={{ margin: 0, fontSize: 13.5, opacity: 0.7 }}>
                {result.ink.toLocaleString('en-US')} ink · best {result.best.stars}★ {result.best.ink.toLocaleString('en-US')}
              </p>
              <p style={{ margin: '4px 0 14px', fontSize: 12.5, opacity: 0.55 }}>
                3★ at {level.stars[0].toLocaleString('en-US')} ink or less
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {nextId && (
                  <a href={`/play/${nextId}`} style={{ ...btn, background: '#eef1f6', color: '#07090D', fontWeight: 650, textDecoration: 'none' }}>
                    Next level →
                  </a>
                )}
                <button style={btn} onClick={loadLevel}>Play again</button>
                <a href="/play" style={{ ...btn, textDecoration: 'none' }}>All levels</a>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 12 }}>
        {mats.map((m) => {
          const on = sel === m
          const frac = left[m] / level.palette[m]
          return (
            <button
              key={m}
              onClick={() => setSel(m)}
              aria-pressed={on}
              style={{
                ...btn,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderColor: on ? '#f5c98a' : 'rgba(255,255,255,0.12)',
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 3, background: MAT[m]?.color }} />
              {MAT[m]?.name}
              <span style={{ width: 56, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${Math.max(0, frac) * 100}%`, background: frac > 0.15 ? MAT[m]?.color : '#ff8080' }} />
              </span>
            </button>
          )
        })}
        <span style={{ display: 'flex', gap: 4 }} role="group" aria-label="Brush size">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setRadius(s)}
              aria-pressed={radius === s}
              aria-label={`Brush size ${s}`}
              style={{ ...btn, padding: '7px 9px', borderColor: radius === s ? '#f5c98a' : 'rgba(255,255,255,0.12)' }}
            >
              <span style={{ display: 'block', width: s + 2, height: s + 2, borderRadius: '50%', background: '#eef1f6' }} />
            </button>
          ))}
        </span>
        <button style={btn} onClick={loadLevel}>Reset</button>
        <button style={btn} onClick={() => setHint((h) => !h)} aria-expanded={hint}>Hint</button>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, opacity: 0.55 }}>
          Paint inside the faint dashed box · 3★ at {level.stars[0].toLocaleString('en-US')} ink
        </span>
      </div>
      {hint && <p style={{ marginTop: 10, fontSize: 14, opacity: 0.85 }}>{level.hint}</p>}
    </div>
  )
}
