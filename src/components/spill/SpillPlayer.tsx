'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { LevelDef, Verb } from '@/lib/spill/level/define'
import { SpillController, type PlayState } from '@/lib/spill/play/controller'
import { startAutoplay, startWatch } from '@/lib/spill/play/autoplay'
import { gateWindowState } from '@/lib/spill/play/gatewin'
import { checkAction, dropAnchor, hitGate, pointerToTile, snapLine, stampSize, type ActionInput, type CssRect } from '@/lib/spill/play/input'
import { starCount, starMask, stars as starsOf, type Stars } from '@/lib/spill/play/score'
import { loadRecord, recordResult } from '@/lib/spill/play/progress'
import type { RunResult } from '@/lib/spill/play/attempt'
import { Sim } from '@/lib/spill/sim/sim'
import { SpillRenderer } from '@/lib/spill/render/canvas'
import { OverlayRenderer, type OverlayView } from '@/lib/spill/render/overlay'
import { Fx, type FxOpts } from '@/lib/spill/render/fx'
import { SpillAudio, loadSoundPref, saveSoundPref } from '@/lib/spill/render/audio'
import { haptic } from '@/lib/spill/render/haptics'
import { chromeBoxes, computeLayout, type Layout } from '@/lib/spill/render/layout'
import { TILE } from '@/lib/spill/sim/grid'
import {
  autoplayMark, clearKind, failMessage, hudKey, hudParts, rejectMessage, runButton, showMovesFor, trayVerbs, usageOf, type RunAction,
} from '@/lib/spill/client/view'
import { histBars, type HistBars } from '@/lib/spill/client/hist'
import { fetchHist, postClear } from '@/lib/spill/client/api'
import { getPid } from '@/lib/spill/client/pid'
import { describeLevel } from '@/lib/spill/client/describe'
import { trackEvent } from '@/lib/sand/gallery'
import { currentUaClass } from '@/lib/sand/ua'
import Hud from './Hud'
import Tray from './Tray'
import FloatButtons from './FloatButtons'
import ResultCard from './ResultCard'
import Onboarding from './Onboarding'
import { C, starRow } from './ui'

interface Props {
  level: LevelDef
  nextId: string | null
  children?: ReactNode
}

interface Card {
  result: RunResult
  stars: Stars
  newBest: boolean
  starGapMs: number
  key: number
  solution: boolean
}

interface Toast {
  text: string
  until: number
}

const SSR_LAYOUT = computeLayout({ vw: 390, vh: 844, dpr: 1 })
const TOAST_MS = 1600
const AFTERGLOW_TICKS = 600

const CSS = `
.spill-root{background:${C.bg};color:${C.text}}
.spill-main{position:relative;height:100dvh;overflow:hidden;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none}
.spill-panel{box-sizing:border-box;padding:24px 16px 48px;max-width:720px;margin:0 auto;line-height:1.6;font-size:15px}
.spill-panel h2{font-size:17px;margin:20px 0 8px}
.spill-panel ul{padding-left:20px;margin:0}
@media (min-width:900px){
  .spill-root{display:grid;grid-template-columns:minmax(0,1fr) 320px;height:100dvh;overflow:hidden}
  .spill-panel{height:100dvh;overflow-y:auto;border-left:1px solid ${C.line};max-width:none;margin:0;padding:20px 20px 40px}
}
@keyframes spill-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
@keyframes spill-msg{from{opacity:0}to{opacity:1}}
@keyframes spill-hand-drag{0%{transform:translate(var(--fx),var(--fy));opacity:0}12%{transform:translate(var(--fx),var(--fy));opacity:1}70%{transform:translate(var(--tx),var(--ty));opacity:1}86%,100%{transform:translate(var(--tx),var(--ty));opacity:0}}
@keyframes spill-hand-tap{0%,100%{transform:translate(var(--fx),var(--fy)) scale(1)}50%{transform:translate(var(--fx),calc(var(--fy) + 7px)) scale(.92)}}
`

function useHud(ctl: SpillController): PlayState {
  const cache = useRef<{ key: string; s: PlayState } | null>(null)
  const subscribe = useCallback(
    (cb: () => void) =>
      ctl.subscribe((s) => {
        const key = hudKey(s)
        if (cache.current?.key === key) return
        cache.current = { key, s }
        cb()
      }),
    [ctl],
  )
  const get = useCallback(() => {
    if (!cache.current) {
      const s = ctl.getState()
      cache.current = { key: hudKey(s), s }
    }
    return cache.current.s
  }, [ctl])
  return useSyncExternalStore(subscribe, get, get)
}

function measure(probe: HTMLElement | null): Layout {
  const vw = document.documentElement.clientWidth || window.innerWidth
  const vh = window.innerHeight
  const safeBottom = probe ? parseFloat(getComputedStyle(probe).paddingBottom) || 0 : 0
  return computeLayout({ vw, vh, dpr: window.devicePixelRatio || 1, safeBottom })
}

const cellCenter = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

export default function SpillPlayer({ level, nextId, children }: Props) {
  const [ctl] = useState(() => new SpillController(level))
  const [audio] = useState(() => new SpillAudio())
  const fx = useRef(new Fx(level.salt || 1))
  const state = useHud(ctl)
  const [layout, setLayout] = useState<Layout>(SSR_LAYOUT)
  const [sound, setSound] = useState(true)
  const [selected, setSelected] = useState<Verb | null>(() => {
    const v = level.verbs ?? {}
    return v.dig ? 'dig' : v.line ? 'line' : v.drop ? 'drop' : null
  })
  const [toast, setToast] = useState<Toast | null>(null)
  const [card, setCard] = useState<Card | null>(null)
  const [hist, setHist] = useState<HistBars | null>(null)
  const [onboard, setOnboard] = useState(false)
  const [mode, setMode] = useState<'play' | 'autoplay' | 'watch'>('play')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef(mode)
  const selectedRef = useRef(selected)
  const layoutRef = useRef(layout)
  const ghostRef = useRef<OverlayView['ghost']>(null)
  const dragRef = useRef<{ id: number; fx: number; fy: number } | null>(null)
  const loupeRef = useRef<{ x: number; y: number } | null>(null)
  const lastVerbRef = useRef<Verb>('dig')
  const afterRef = useRef<{ sim: Sim; acc: number; steps: number } | null>(null)
  const reducedRef = useRef(false)
  const legalRef = useRef<{ key: string; mask: Uint8Array | null }>({ key: '', mask: null })
  const cardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLatchRef = useRef<{ x: number; y: number } | null>(null)
  const [best, setBest] = useState(0)
  modeRef.current = mode
  selectedRef.current = selected
  layoutRef.current = layout

  const desc = useMemo(() => describeLevel(level), [level])
  const lastTarget = useMemo(() => {
    const t = ctl.level.targets.filter((x) => x.kind !== 'bad')
    return t.length ? cellCenter(t[t.length - 1]) : { x: 80, y: 120 }
  }, [ctl])

  const fxOpts = useCallback((): FxOpts => ({ reduced: reducedRef.current, muted: audio.muted }), [audio])
  const say = useCallback((text: string) => setToast({ text, until: performance.now() + TOAST_MS }), [])

  useLayoutEffect(() => {
    const update = () => setLayout(measure(probeRef.current))
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    reducedRef.current = !!mq?.matches
    const onMq = () => { reducedRef.current = !!mq?.matches }
    mq?.addEventListener?.('change', onMq)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      mq?.removeEventListener?.('change', onMq)
    }
  }, [])

  useEffect(() => {
    const on = loadSoundPref()
    setSound(on)
    audio.enabled = on
    const auto = new URLSearchParams(location.search).get('autoplay') === '1'
    if (auto) {
      setMode('autoplay')
      modeRef.current = 'autoplay'
      return
    }
    trackEvent('puzzle_land', currentUaClass())
    const rec = loadRecord(level.id)
    setBest(rec ? starCount(rec.stars) : 0)
    if (level.id === '1-1' && !rec?.clears) setOnboard(true)
  }, [audio, level.id])

  useEffect(() => {
    const off = ctl.onEvent((e) => {
      const live = modeRef.current === 'play'
      switch (e.type) {
        case 'latch': {
          const t = ctl.level.targets.find((x) => x.id === e.id)
          const p = t ? cellCenter(t) : lastTarget
          lastLatchRef.current = p
          const step = ctl.level.targets.filter((x) => x.kind !== 'bad').length - e.left - 1
          if (e.left > 0) {
            fx.current.latch(p.x, p.y, '#5be38a', fxOpts())
            audio.latch(step)
            haptic('latch')
          }
          break
        }
        case 'gem': {
          const g = ctl.level.gems[e.index]
          if (g) fx.current.gem(g.x + g.w / 2, g.y + g.h / 2, fxOpts())
          audio.gem()
          haptic('gem')
          break
        }
        case 'clear': {
          const r = e.result
          const st = starsOf(r, level)
          let outcome = { firstClear: true, newBest: true }
          let prevBest = false
          if (live) {
            const o = recordResult(level.id, r, starMask(st))
            outcome = o
            setBest(starCount(o.record.stars))
            prevBest = o.newBest && !o.firstClear
            void postClear(level.id, { pid: getPid(), moves: r.moves, ticks: r.ticks, lh: ctl.lh })
            trackEvent('challenge_clear', level.id, r.ticks)
            void fetchHist(level.id).then((h) => setHist(h ? histBars(h, r.moves, r.ticks) : null))
          }
          if (modeRef.current === 'autoplay') document.body.dataset.autoplay = autoplayMark(r, level)
          const kind = clearKind(outcome)
          const at = lastLatchRef.current ?? lastTarget
          const plan = fx.current.clear(kind, at.x, at.y, fxOpts())
          audio.clear()
          haptic('clear')
          if (!reducedRef.current) {
            const sim = new Sim()
            sim.load(ctl.level)
            sim.restore(ctl.sim.snapshot())
            afterRef.current = { sim, acc: 0, steps: 0 }
          }
          if (cardTimer.current) clearTimeout(cardTimer.current)
          cardTimer.current = setTimeout(() => {
            setCard({ result: r, stars: st, newBest: prevBest, starGapMs: plan.starGapMs, key: Date.now(), solution: modeRef.current === 'watch' })
          }, plan.cardDelayMs)
          break
        }
        case 'fail': {
          fx.current.fail(fxOpts())
          audio.fail()
          haptic('fail')
          if (modeRef.current === 'autoplay') document.body.dataset.autoplay = autoplayMark(e.result, level)
          break
        }
        case 'reject': {
          audio.reject()
          haptic('reject')
          say(rejectMessage(e.reason, lastVerbRef.current))
          break
        }
        case 'action': {
          audio.tap()
          break
        }
        case 'phase': {
          if (e.phase === 'setup') {
            afterRef.current = null
            lastLatchRef.current = null
            fx.current.reset()
            if (cardTimer.current) clearTimeout(cardTimer.current)
            setCard(null)
            setHist(null)
            if (modeRef.current === 'watch') setMode('play')
          }
          if (e.phase === 'run' && e.prev === 'setup') {
            setOnboard(false)
            if (live) trackEvent('challenge_start', level.id)
          }
          break
        }
      }
    })
    return () => {
      off()
      if (cardTimer.current) clearTimeout(cardTimer.current)
    }
  }, [ctl, audio, level, fxOpts, say, lastTarget])

  useEffect(() => {
    const canvas = canvasRef.current
    const overlayCanvas = overlayRef.current
    if (!canvas || !overlayCanvas) return
    const renderer = new SpillRenderer(canvas)
    const overlay = new OverlayRenderer(overlayCanvas)
    let raf = 0
    let last = performance.now()
    let sized = ''

    const legalFor = (s: PlayState): Uint8Array | null => {
      const v = selectedRef.current
      if (s.phase !== 'setup' || !v || v === 'trigger') return null
      const key = `${v}|${s.attempt}|${s.moves}`
      if (legalRef.current.key !== key) legalRef.current = { key, mask: ctl.legalMask(v) }
      return legalRef.current.mask
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(100, Math.max(0, now - last))
      last = now
      if (modeRef.current !== 'autoplay') ctl.frame(dt)
      const f = fx.current
      const after = afterRef.current
      if (after && after.steps < AFTERGLOW_TICKS) {
        after.acc += dt * 0.06 * f.timeScale()
        while (after.acc >= 1 && after.steps < AFTERGLOW_TICKS) {
          after.sim.step()
          after.acc -= 1
          after.steps++
        }
      }
      f.step(dt)
      const l = layoutRef.current
      const dpr = window.devicePixelRatio || 1
      const sizeKey = `${l.cssW}|${l.cssH}|${dpr}`
      if (sizeKey !== sized) {
        overlay.resize(l.cssW, l.cssH, dpr)
        sized = sizeKey
      }
      const sim = after ? after.sim : ctl.sim
      renderer.draw(sim.grid, sim.tick)
      const s = ctl.getState()
      const used = usageOf(s)
      const trig = ctl.level.def.verbs?.trigger ?? []
      overlay.draw(
        {
          timeMs: now,
          cssW: l.cssW,
          cssH: l.cssH,
          cssPerCell: l.cssPerCell,
          phase: s.phase,
          targets: s.targets.map((t, k) => ({ ...t, mat: ctl.level.targets[k].mat })),
          gems: ctl.level.gems.map((g, k) => ({ rect: g, mat: g.mat, got: s.gems[k] })),
          gates: ctl.gates.map((b) => ({ box: b, open: used.triggered.includes(b.name), tappable: trig.includes(b.name), win: gateWindowState(level, b.name, s.tick, s.run) })),
          ghost: ghostRef.current,
          oldGhosts: s.phase === 'setup' ? s.ghosts : [],
          legal: legalFor(s),
          loupe: loupeRef.current && ghostRef.current && (ghostRef.current.action.verb === 'dig' || ghostRef.current.action.verb === 'line') ? { ...loupeRef.current, src: canvas } : null,
        },
        f,
      )
      const wrap = wrapRef.current
      if (wrap) {
        const sh = f.shake()
        const z = f.zoom()
        wrap.style.transformOrigin = `${z.cx * l.cssPerCell}px ${z.cy * l.cssPerCell}px`
        wrap.style.transform = sh.x || sh.y || z.k !== 1 ? `translate(${sh.x}px,${sh.y}px) scale(${z.k})` : ''
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ctl])

  useEffect(() => {
    if (mode !== 'autoplay') return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    startAutoplay(ctl)
    const tick = () => {
      if (!alive) return
      ctl.advance(document.hidden ? 600 : 2)
      if (ctl.phase === 'run') timer = setTimeout(tick, document.hidden ? 0 : 16)
    }
    timer = setTimeout(tick, 60)
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [ctl, mode])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), Math.max(0, toast.until - performance.now()))
    return () => clearTimeout(t)
  }, [toast])

  const rect = (): CssRect => {
    const r = overlayRef.current!.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  }

  const ghostFor = (verb: Verb, px: number, py: number, start: { fx: number; fy: number } | null): ActionInput | null => {
    const v = level.verbs ?? {}
    const r = rect()
    if (verb === 'drop' && v.drop) {
      const a = dropAnchor(px, py, r, stampSize(v.drop.kind))
      return { verb: 'drop', tx: a.tx, ty: a.ty, tx2: a.tx, ty2: a.ty, arg: v.drop.kind }
    }
    if ((verb === 'dig' && v.dig) || (verb === 'line' && v.line)) {
      if (!start) return null
      const p = pointerToTile(px, py, r)
      const maxLen = verb === 'dig' ? v.dig!.maxLen : v.line!.maxLen
      const l = snapLine(start.fx, start.fy, p.fx, p.fy, maxLen)
      return verb === 'line' ? { verb, ...l, arg: v.line!.mat } : { verb, ...l }
    }
    return null
  }

  const okFor = (a: ActionInput): boolean => {
    const s = ctl.getState()
    return checkAction(ctl.level, ctl.sim.grid, a, usageOf(s)).ok
  }

  const blocked = () => modeRef.current !== 'play' || ctl.phase === 'failed' || ctl.phase === 'cleared'

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    audio.unlock()
    if (blocked() || dragRef.current) return
    const r = rect()
    const phase = ctl.phase
    if (phase === 'run' || phase === 'paused' || phase === 'setup') {
      const gate = hitGate(e.clientX, e.clientY, r, ctl.gates, usageOf(ctl.getState()).triggered)
      const trig = ctl.level.def.verbs?.trigger ?? []
      if (gate && trig.includes(gate)) {
        lastVerbRef.current = 'trigger'
        ctl.act({ verb: 'trigger', tx: 0, ty: 0, tx2: 0, ty2: 0, arg: gate })
        return
      }
    }
    const verb = selectedRef.current
    if (!verb || verb === 'trigger') return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const p = pointerToTile(e.clientX, e.clientY, r)
    dragRef.current = { id: e.pointerId, fx: p.fx, fy: p.fy }
    loupeRef.current = e.pointerType === 'mouse' ? null : { x: e.clientX - r.left, y: e.clientY - r.top }
    const a = ghostFor(verb, e.clientX, e.clientY, dragRef.current)
    ghostRef.current = a ? { action: a, ok: okFor(a) } : null
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    const verb = selectedRef.current
    if (!verb) return
    if (loupeRef.current) {
      const r = rect()
      loupeRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const a = ghostFor(verb, e.clientX, e.clientY, d)
    ghostRef.current = a ? { action: a, ok: okFor(a) } : null
  }

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    dragRef.current = null
    loupeRef.current = null
    const g = ghostRef.current
    ghostRef.current = null
    if (!g || blocked()) return
    lastVerbRef.current = g.action.verb
    ctl.act(g.action)
  }

  const onCancel = () => {
    dragRef.current = null
    loupeRef.current = null
    ghostRef.current = null
  }

  const onVerb = (v: Verb) => {
    audio.unlock()
    if (v === 'trigger') {
      say(ctl.phase === 'setup' ? 'Run first, then tap the gate' : 'Tap the gate')
      return
    }
    setSelected(v)
  }

  const onRun = (a: RunAction) => {
    audio.unlock()
    if (modeRef.current === 'autoplay') return
    if (a === 'run') ctl.run()
    else if (a === 'pause') ctl.pause()
    else if (a === 'resume') ctl.resume()
    else if (a === 'retry') retry()
    else if (a === 'next' && nextId) location.href = `/play/${nextId}`
  }

  const retry = () => {
    if (modeRef.current === 'autoplay') return
    if (ctl.phase === 'setup') {
      say('Hold ↺ to clear everything')
      return
    }
    if (modeRef.current === 'play') trackEvent('challenge_reset', level.id)
    ctl.retry()
  }

  const clearAll = () => {
    if (modeRef.current === 'autoplay') return
    ctl.clearAll()
    say('Cleared')
  }

  const speedUp = () => {
    const s = ctl.getState()
    const next = s.speed === 1 ? 2 : s.speed === 2 ? 4 : 1
    ctl.setSpeed(next > s.speedCap ? 1 : next)
  }

  const toggleSound = () => {
    const on = !sound
    setSound(on)
    audio.setEnabled(on)
    saveSoundPref(on)
  }

  const watch = () => {
    setMode('watch')
    modeRef.current = 'watch'
    startWatch(ctl)
  }

  const s = state
  const parts = hudParts(s, layout.compactHud)
  const used = usageOf(s)
  const verbs = trayVerbs(level, used)
  const run = runButton(s.phase, !!nextId, s.watching)
  const l = layout
  const now = typeof performance === 'undefined' ? 0 : performance.now()
  const toastText = toast && toast.until > now ? toast.text : null
  const failText = s.phase === 'failed' ? failMessage(s.failReason, s.targetsLeft, s.gatesClosed) : null
  const hintText = s.phase === 'setup' && s.fails >= 1 && level.hint ? level.hint : null
  const message = toastText ?? failText ?? hintText ?? (mode === 'autoplay' || mode === 'watch' ? 'Solution replay' : null)
  const canWatch = mode === 'play' && s.phase === 'setup' && s.fails >= 3 && (level.dev?.length ?? 0) > 0
  const gemTotal = s.gems.length
  const gemGot = s.gems.filter(Boolean).length
  const firstDig = level.dev?.find((a) => a[1] === 'dig' || a[1] === 'line')
  const tilePx = TILE * l.cssPerCell
  const showHand = onboard && mode === 'play' && s.phase === 'setup' && !!firstDig
  const chrome = chromeBoxes(l)

  return (
    <div className="spill-root">
      <style>{CSS}</style>
      <div className="spill-main" onPointerDownCapture={() => audio.unlock()}>
        <div ref={probeRef} aria-hidden style={{ position: 'absolute', visibility: 'hidden', paddingBottom: 'env(safe-area-inset-bottom)' }} />
        <Hud
          id={level.id}
          name={level.name}
          parts={parts}
          showMoves={showMovesFor(level.id)}
          phase={s.phase}
          sound={sound}
          navCollapsed={l.navCollapsed}
          onSound={toggleSound}
          onPause={() => ctl.togglePause()}
        />
        <div style={{ position: 'relative', height: l.cssH, width: '100%', flexShrink: 0 }}>
          <div style={{ position: 'absolute', left: l.canvasLeft, top: 0, width: l.cssW, height: l.cssH, overflow: 'hidden' }}>
            <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
              <canvas
                ref={canvasRef}
                width={160}
                height={240}
                aria-label={`${level.id} ${level.name} puzzle canvas`}
                style={{ position: 'absolute', inset: 0, width: l.cssW, height: l.cssH, imageRendering: 'pixelated', background: C.bg }}
              />
              <canvas
                ref={overlayRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onCancel}
                style={{ position: 'absolute', inset: 0, width: l.cssW, height: l.cssH, touchAction: 'none', cursor: 'crosshair' }}
              />
            </div>
            {message && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  position: 'absolute', top: chrome.messageTop, left: '50%', transform: 'translateX(-50%)', maxWidth: 'calc(100% - 16px)', zIndex: 3, pointerEvents: 'none',
                  background: 'rgba(7,9,13,0.78)', border: `1px solid ${C.line}`, borderRadius: 999, padding: '6px 14px', fontSize: 14,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', animation: 'spill-msg 160ms ease-out', display: 'flex', gap: 8, alignItems: 'center',
                  color: failText && message === failText ? '#ffb3ad' : C.text,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{message}</span>
                {canWatch && message === hintText && (
                  <button type="button" onClick={watch} style={{ border: 0, background: C.accent, color: C.bg, borderRadius: 999, minHeight: 44, minWidth: 64, padding: '0 14px', fontWeight: 700, cursor: 'pointer', pointerEvents: 'auto' }}>
                    Watch
                  </button>
                )}
              </div>
            )}
            {gemTotal > 0 && (
              <div aria-label={`Gems ${gemGot} of ${gemTotal}`} style={{ position: 'absolute', left: chrome.gems.x, top: chrome.gems.y, height: chrome.gems.h, boxSizing: 'border-box', display: 'flex', alignItems: 'center', zIndex: 3, fontSize: 13, color: C.gem, background: 'rgba(7,9,13,0.6)', borderRadius: 999, padding: '0 10px', pointerEvents: 'none' }}>
                ◆ {gemGot}/{gemTotal}
              </div>
            )}
            {!card && (
              <FloatButtons
                phase={s.phase}
                canUndo={s.canUndo && mode === 'play'}
                speed={s.speed}
                speedCap={s.speedCap}
                onUndo={() => ctl.undo()}
                onRetry={retry}
                onClearAll={clearAll}
                onSpeed={speedUp}
                box={chrome.buttons}
              />
            )}
          </div>
        </div>
        <Tray
          height={l.trayH}
          safeBottom={l.safeBottom}
          verbs={verbs}
          selected={selected}
          run={run}
          runHighlight={showHand && s.moves > 0}
          onVerb={onVerb}
          onRun={onRun}
        />
        {card && s.phase === 'cleared' && (
          <ResultCard
            key={card.key}
            def={level}
            result={card.result}
            stars={card.stars}
            newBest={card.newBest}
            starGapMs={card.starGapMs}
            nextId={nextId}
            hist={hist}
            onStar={(i) => audio.star(i)}
            onRetry={retry}
            onSkip={() => fx.current.skip()}
            solution={card.solution}
            bottom={l.safeBottom + 8}
          />
        )}
        {showHand && firstDig && (
          <Onboarding
            step={s.moves === 0 ? 'drag' : 'run'}
            from={{ x: l.canvasLeft + (firstDig[2] + 0.5) * tilePx, y: l.headerH + (firstDig[3] + 0.5) * tilePx }}
            to={{ x: l.canvasLeft + (firstDig[4] + 0.5) * tilePx, y: l.headerH + (firstDig[5] + 0.5) * tilePx }}
            run={{ x: l.stageW - 64, y: l.headerH + l.cssH + l.trayH / 2 - l.safeBottom / 2 }}
          />
        )}
      </div>
      <aside className="spill-panel">
        <h2 style={{ marginTop: 0 }}>Goal</h2>
        <ul>
          {desc.goals.map((g, k) => {
            const t = s.targets.filter((x) => x.kind !== 'bad')[k]
            return (
              <li key={k} style={{ color: t?.latched ? C.green : undefined }}>
                {g}
                {t?.latched ? ' ✓' : ''}
              </li>
            )
          })}
          {desc.warnings.map((w) => (
            <li key={w} style={{ color: '#ffb3ad' }}>{w}</li>
          ))}
        </ul>
        <h2>Stars</h2>
        <ul>
          <li>★ Clear the level</li>
          <li>★ {gemTotal ? `Collect ${gemTotal === 1 ? 'the gem' : `all ${gemTotal} gems`}` : 'Gems (none in this level)'}</li>
          <li>★ {desc.par ?? 'No par for this level'}</li>
        </ul>
        {best > 0 && (
          <p style={{ margin: '10px 0 0', color: '#ffd54a' }}>Your best: {starRow(best)}</p>
        )}
        {children}
      </aside>
    </div>
  )
}
