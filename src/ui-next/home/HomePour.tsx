'use client'

/**
 * 새 홈 「Pour」(리디자인 P6). 프리뷰 빌드(NEXT_PUBLIC_UI=next)에서만 shell/next.ts를 거쳐 들어온다 — prod는 옛 SandCanvas.
 *
 * 화면(위에서 아래): 셸 헤더(P3) → 헤드라인 두 줄(빈 홈 / #s= 장면 제목·작성자·리믹스 수 / #g= 공유 장면)
 * → 유리 우물(엔진 캔버스, 1200×600 그대로, 화면 폭 가득 2:1) → 재료 줄(또는 리믹스 배너) → 시험관 랙(S7) → 엄지 도크
 * (Erase · 붓 크기 점 3개 · Share — 첫 획 전 Share는 흐림 + aria-disabled) → 오늘 카드 → 지층 띠 → 벽 미리보기 → 셸 푸터.
 *
 * 엔진은 옛 홈과 같은 공개 API만 쓴다(init·upload·start·brush·readback·clear·destroy) — 엔진 코드 변경 0.
 * 링크 규칙(#s= 정규식·parent·발행 후 링크)은 sceneLink.ts 순수 함수(옛 홈과 공유, 골든셋 테스트).
 * Undo 없음(엔진에 없음). WebGPU가 없으면(B4 ③) 오늘 퍼즐(Spill은 2D)이 주 CTA, 우물 자리는 실엔진 정지 프레임 + 이유 + Open in browser/Copy link.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { SandEngine } from '@/lib/sand/engine'
import { PRESETS, buildIndex } from '@/lib/sand/materials'
import { buildShareUrl, decodeScene, encodeScene, readShareUrl } from '@/lib/sand/urlState'
import { getScene, rememberMine, trackEvent, uploadScene } from '@/lib/sand/gallery'
import { getCreatorId, getCreatorName, setCreatorName } from '@/lib/sand/creator'
import { isBlank, makeThumb } from '@/lib/sand/thumb'
import { noteFirstTry } from '@/lib/sand/discovery'
import { checkPourMilestone } from '@/lib/sand/milestones'
import { uaClass } from '@/lib/sand/ua'
import { gpuAdvice, type GpuAdvice } from '@/lib/sand/gpuAdvice'
import { hasEmbeddedScene, publishParent, publishedLinks, sceneIdFromHash } from '@/lib/sand/sceneLink'
import { Icon } from '../icons/Icon'
import { ShellHeader } from '../shell/ShellHeader'
import { ShellFooter } from '../shell/ShellFooter'
import { PREVIEW_READ_ONLY, READ_ONLY_NOTE } from '../shell/ReadOnlyNote'
import { Rack } from './Rack'
import { StrataBand, TodayCard, WallPreview } from './HomeSections'
import {
  BRUSH_SIZES,
  DEFAULT_BRUSH,
  DEMO_KEY,
  NO_BRUSH,
  NO_GPU_HEADLINE,
  demoBrush,
  entryHeadline,
  hashNeedsReload,
  shouldDemo,
  tabOf,
  type Entry,
} from './model'

/** 격자 — 옛 홈과 같은 1200×600(공유 URL이 w,h를 담는다. 바꾸면 기존 링크가 전부 깨진다). */
const W = 1200
const H = 600
const PAINTABLE = PRESETS.filter((m) => m.slug !== 'empty')
const BY_SLUG = Object.fromEntries(PRESETS.map((m) => [m.slug, m]))
const STILL = '/ui-next/home/still.webp'

type Link = { url: string; thumb?: string; published: boolean }

export function HomePour() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<SandEngine | null>(null)
  const idx = useRef(buildIndex(PRESETS))
  const [ready, setReady] = useState(false)
  const [lost, setLost] = useState(false)
  const [advice, setAdvice] = useState<GpuAdvice | null>(null)
  const [sel, setSel] = useState('sand')
  const [radius, setRadius] = useState(DEFAULT_BRUSH)
  const radiusRef = useRef(radius)
  const [erasing, setErasing] = useState(false)
  // 첫 획(또는 링크로 연 장면 복원) 뒤에만 Share가 살아난다
  const [hasDrawn, setHasDrawn] = useState(false)
  const [entry, setEntry] = useState<Entry>({ kind: 'blank' })
  const [banner, setBanner] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [demo, setDemo] = useState<'idle' | 'running' | 'done'>('idle')
  const interacted = useRef(false)
  // 링크로 연 장면을 복원했는가(엔진 준비 시점) — 그 위로는 데모를 붓지 않는다
  const restoredRef = useRef(false)
  const loadedSceneId = useRef<string | null>(null)
  const triedRef = useRef<Set<string>>(new Set())
  const pouredRef = useRef(0)
  const pourMultRef = useRef(0)
  const pourPrevRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const strokeEraseRef = useRef<Map<number, boolean>>(new Map())

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flash = useCallback((m: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(m)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  // 엔진 + 해시 진입. 옛 홈(SandCanvas)과 같은 순서: init → (#s= 갤러리 | #g= URL) 복원 → start.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    const hash = location.hash
    if (sceneIdFromHash(hash) || hasEmbeddedScene(hash)) setEntry({ kind: 'opening' })
    const eng = new SandEngine({ canvas, width: W, height: H, materials: PRESETS })
    eng.onLost = () => {
      if (!disposed) setLost(true)
    }
    eng
      .init()
      .then(async () => {
        if (disposed) return
        const sid = sceneIdFromHash(location.hash)
        let restored = null
        let next: Entry = { kind: 'blank' }
        if (sid) {
          try {
            const sc = await getScene(sid)
            restored = await decodeScene(sc.data)
            loadedSceneId.current = sid // 이 장면을 리믹스하면 계보 원본이 된다
            next = { kind: 'scene', id: sid, title: sc.title, creatorName: sc.creatorName ?? null, remixCount: sc.remixCount ?? 0 }
          } catch {
            /* 삭제됐거나 잘못된 id — 빈 화면으로 시작한다(옛 홈과 같음) */
          }
        } else {
          restored = await readShareUrl()
          if (restored) next = { kind: 'link' }
        }
        if (disposed) return
        if (restored && restored.w === W && restored.h === H) {
          eng.upload(restored.cells)
          restoredRef.current = true
          setHasDrawn(true)
          setBanner(true)
          setEntry(next)
        } else {
          setEntry({ kind: 'blank' })
        }
        engineRef.current = eng
        eng.brush.r = radiusRef.current
        eng.start()
        setReady(true)
      })
      .catch(() => {
        if (disposed) return
        const ua = navigator.userAgent || ''
        setAdvice(gpuAdvice(ua))
        trackEvent('gpu_unsupported', uaClass(ua), 0) // value 0 = 홈 샌드박스(옛 홈과 같은 계측)
      })
    return () => {
      disposed = true
      eng.destroy()
      engineRef.current = null
    }
  }, [])

  // 홈 안에서 /#s=… (벽 미리보기 카드)로 해시만 바뀌면 엔진이 다시 읽지 않는다 → 새로고침해서 연다.
  useEffect(() => {
    let prev = location.hash
    const on = () => {
      const next = location.hash
      if (hashNeedsReload(prev, next, sceneIdFromHash)) location.reload()
      prev = next
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    radiusRef.current = radius
    const eng = engineRef.current
    if (eng && demo !== 'running') eng.brush.r = radius
  }, [radius, ready, demo])

  // 첫 방문 붓기 데모(1.5초): 위쪽 가운데에서 모래 한 줄기. 첫 터치에 즉시 멈춘다. reduced-motion·재방문·링크 장면은 없음.
  useEffect(() => {
    if (!ready) return
    const eng = engineRef.current
    if (!eng) return
    const restored = restoredRef.current
    let seen = true
    try {
      seen = localStorage.getItem(DEMO_KEY) !== null
      if (!restored) localStorage.setItem(DEMO_KEY, '1') // 빈 홈을 한 번 보면 첫 방문 끝(링크 장면 착지는 세지 않음)
    } catch {
      /* 저장소가 막히면 데모 없음(힌트만) */
    }
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!shouldDemo({ seen, reducedMotion: reduced, restored })) {
      setDemo('done')
      return
    }
    setDemo('running')
    const sand = idx.current.get('sand') ?? 0
    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      if (interacted.current) return // onDown이 붓을 넘겨받았다
      const b = demoBrush(performance.now() - t0, W, H)
      if (!b) {
        eng.brush.mat = NO_BRUSH
        eng.brush.r = radiusRef.current
        setDemo('done')
        return
      }
      eng.brush.x = b.x
      eng.brush.y = b.y
      eng.brush.r = b.r
      eng.brush.mat = sand
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const toGrid = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: Math.floor(((e.clientX - r.left) / r.width) * W), y: Math.floor(((e.clientY - r.top) / r.height) * H) }
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const eng = engineRef.current
    if (!eng) return
    if (!interacted.current) {
      interacted.current = true // 데모 즉시 정지(다음 rAF에서 손을 뗀다) — 데모가 부은 모래는 남긴다
      if (demo === 'running') setDemo('done')
    }
    if (banner) setBanner(false) // 첫 붓질 = 리믹스 시작
    const { x, y } = toGrid(e)
    eng.brush.x = x
    eng.brush.y = y
    eng.brush.r = radiusRef.current
    const isErase = erasing || e.button === 2
    eng.brush.mat = isErase ? 0 : (idx.current.get(sel) ?? 0)
    strokeEraseRef.current.set(e.pointerId, isErase)
    if (!isErase) {
      const msg = noteFirstTry(triedRef.current, sel, BY_SLUG[sel]?.name ?? sel, PAINTABLE.length)
      pourPrevRef.current.set(e.pointerId, { x, y })
      pouredRef.current += Math.PI * radiusRef.current * radiusRef.current
      if (msg) flash(msg)
      else {
        const pm = checkPourMilestone(pouredRef.current, W * H, pourMultRef.current)
        if (pm.message) flash(pm.message)
        pourMultRef.current = pm.multReached
      }
    } else pourPrevRef.current.delete(e.pointerId)
    if (!hasDrawn) setHasDrawn(true)
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current
    if (!eng || eng.brush.mat === NO_BRUSH || !interacted.current) return
    const { x, y } = toGrid(e)
    eng.brush.x = x
    eng.brush.y = y
    const prev = pourPrevRef.current.get(e.pointerId)
    if (!strokeEraseRef.current.get(e.pointerId) && prev) {
      pouredRef.current += Math.hypot(x - prev.x, y - prev.y) * (2 * radiusRef.current + 1)
      pourPrevRef.current.set(e.pointerId, { x, y })
      const pm = checkPourMilestone(pouredRef.current, W * H, pourMultRef.current)
      if (pm.message) flash(pm.message)
      pourMultRef.current = pm.multReached
    }
  }

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current
    if (eng) eng.brush.mat = NO_BRUSH
    pourPrevRef.current.delete(e.pointerId)
    strokeEraseRef.current.delete(e.pointerId)
  }

  const pick = (slug: string) => {
    setSel(slug)
    setErasing(false)
  }

  /* ---------- 공유 시트 ---------- */
  const sheetRef = useRef<HTMLDialogElement>(null)
  const shareBtnRef = useRef<HTMLButtonElement>(null)
  const [link, setLink] = useState<Link | null>(null)
  const [linkErr, setLinkErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const openShare = async () => {
    if (!hasDrawn) return flash('Pour something first.')
    const eng = engineRef.current
    if (!eng) return
    trackEvent('share_click', 'sandbox-link')
    setLink(null)
    setLinkErr(null)
    sheetRef.current?.showModal()
    try {
      const cells = await eng.readback()
      const res = await buildShareUrl(cells, W, H)
      let thumb: string | undefined
      try {
        thumb = await makeThumb(cells, W, H, PRESETS)
      } catch {
        /* 미리보기만 생략 */
      }
      if (!res.ok) {
        setLink(null)
        setLinkErr(`Too detailed for a link (${(res.size / res.budget).toFixed(1)}x over). Publish it to the gallery instead.`)
        return
      }
      history.replaceState(null, '', res.url)
      setLink({ url: res.url, thumb, published: false })
    } catch (e) {
      setLinkErr(e instanceof Error ? e.message : 'Link failed.')
    }
  }

  const copyLink = async () => {
    if (!link) return
    trackEvent('share_click', 'sandbox-copy')
    try {
      await navigator.clipboard.writeText(link.url)
      flash('Link copied.')
    } catch {
      flash('Copy blocked. Select the link and copy it.')
    }
  }
  const nativeShare = async () => {
    if (!link) return
    trackEvent('share_click', 'sandbox-share')
    try {
      await navigator.share({ title: 'Sandlab', url: link.url })
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) copyLink()
    }
  }

  const publish = async () => {
    const eng = engineRef.current
    if (!eng || busy || PREVIEW_READ_ONLY) return
    setBusy(true)
    try {
      const cells = await eng.readback()
      if (isBlank(cells, W * H)) return flash('Pour something first.')
      if (getCreatorName() === undefined) {
        const entered = (window.prompt('Your name for the gallery? (optional, shown on your scenes)', '') || '').trim()
        setCreatorName(entered)
      }
      const [data, thumb] = await Promise.all([encodeScene(cells, W, H), makeThumb(cells, W, H, PRESETS)])
      const { id } = await uploadScene({
        title,
        data,
        thumb,
        w: W,
        h: H,
        parent: publishParent(loadedSceneId.current),
        creator: getCreatorId(),
        creatorName: getCreatorId() ? getCreatorName() : undefined,
      })
      rememberMine(id, title || 'Untitled')
      const links = publishedLinks(location.origin, id)
      loadedSceneId.current = links.nextLoadedId
      history.replaceState(null, '', links.tabUrl)
      setLink({ url: links.shareUrl, thumb, published: true })
      flash('Published to the gallery.')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Publish failed.')
    } finally {
      setBusy(false)
    }
  }

  const record = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    sheetRef.current?.close()
    try {
      if (engineRef.current) engineRef.current.recording = true
      flash('Recording 10 seconds.')
      const { recordClip, downloadClip } = await import('@/lib/sand/record')
      const clip = await recordClip({ canvas, durationMs: 10000, onProgress: () => {} })
      downloadClip(clip, `sandlab-${Date.now()}`)
      flash(`${clip.format.label} saved, ${(clip.bytes / 1e6).toFixed(1)} MB.`)
    } catch (e) {
      flash(e instanceof Error && e.name === 'RecordUnsupported' ? e.message : 'Recording failed.')
    } finally {
      if (engineRef.current) engineRef.current.recording = false
    }
  }

  useEffect(() => {
    const d = sheetRef.current
    if (!d) return
    const onClose = () => shareBtnRef.current?.focus()
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
  }, [])

  /* ---------- 그리기 ---------- */
  const noGpu = advice !== null
  const head = noGpu ? { title: NO_GPU_HEADLINE, sub: 'The sandbox can’t start in this browser, but the daily puzzle can.' } : entryHeadline(entry)
  const mat = BY_SLUG[sel]
  const here = typeof location !== 'undefined' ? location.href : 'https://sandlab.app/'

  if (lost) {
    return (
      <div className="sl-shell sl-home" data-sl-home="lost">
        <ShellHeader />
        <main className="sl-home-main">
          <div className="sl-home-head">
            <h1 className="sl-home-h1">The GPU was interrupted</h1>
            <p className="sl-home-sub">Your device paused the graphics context. Reload to start again.</p>
          </div>
          <div className="sl-home-sec">
            <button type="button" className="sl-cta" onClick={() => location.reload()}>
              <span>Reload</span>
              <Icon name="retry" />
            </button>
          </div>
        </main>
        <ShellFooter />
      </div>
    )
  }

  const well = (
    <div className="sl-well" data-demo={demo} data-ready={ready || undefined}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="sl-well-canvas"
        aria-label="Sandbox. Drag to pour the selected material."
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
      />
      {!ready && <p className="sl-well-loading">Starting the sandbox…</p>}
      {ready && !hasDrawn && (
        <p className="sl-well-hint" aria-hidden="true">
          <Icon name="hand" />
          <span>Drag to pour</span>
        </p>
      )}
      <p className="sl-well-toast" role="status" aria-live="polite">
        {toast}
      </p>
    </div>
  )

  return (
    <div className="sl-shell sl-home" data-sl-home={noGpu ? 'no-gpu' : entry.kind}>
      <ShellHeader />
      <main className="sl-home-main">
        <div className="sl-home-head">
          <h1 className="sl-home-h1">{head.title}</h1>
          <p className="sl-home-sub">{head.sub}</p>
        </div>

        {noGpu ? (
          <>
            <div className="sl-home-below sl-home-below-first">
              <TodayCard />
            </div>
            <section className="sl-nogpu" aria-labelledby="sl-nogpu-h">
              <div className="sl-nogpu-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={STILL} alt="A still frame of the sandbox: sand, water and lava piled in the glass" width={1200} height={600} />
                <span className="sl-nogpu-tag">Still frame</span>
              </div>
              <div className="sl-nogpu-body">
                <h2 className="sl-nogpu-h" id="sl-nogpu-h">
                  {advice!.heading}
                </h2>
                <p className="sl-nogpu-p">{advice!.body}</p>
                <div className="sl-nogpu-acts">
                  {advice!.kind === 'kakao' && (
                    <a href={`kakaotalk://web/openExternal?url=${encodeURIComponent(here)}`} className="sl-btn sl-btn-line">
                      <span>Open in browser</span>
                      <Icon name="external" />
                    </a>
                  )}
                  <button type="button" className="sl-btn sl-btn-quiet" onClick={() => copyHere(here, flash)}>
                    <Icon name="copy" />
                    <span>Copy link</span>
                  </button>
                </div>
                {advice!.kind === 'insta' && <p className="sl-nogpu-p">Tap the menu at the top right, then Open in external browser.</p>}
                <p className="sl-well-toast-inline" role="status" aria-live="polite">
                  {toast}
                </p>
              </div>
            </section>
            <div className="sl-home-below">
              <WallPreview />
            </div>
          </>
        ) : (
          <>
            {well}
            <div className="sl-home-tools">
              {banner && entry.kind !== 'blank' && entry.kind !== 'opening' ? (
                <div className="sl-remix" role="region" aria-label="Remix">
                  <p className="sl-remix-t">Pour on it to make your own version.</p>
                  <button type="button" className="sl-btn sl-btn-ember sl-remix-go" onClick={() => setBanner(false)}>
                    <Icon name="remix" />
                    <span>Remix this</span>
                  </button>
                  <button type="button" className="sl-hit sl-icon-btn" aria-label="Close" onClick={() => setBanner(false)}>
                    <Icon name="close" />
                  </button>
                </div>
              ) : (
                <div className="sl-matline">
                  <span className="sl-matline-swatch" style={{ background: erasing ? 'transparent' : mat?.color }} data-erase={erasing || undefined} />
                  <span className="sl-matline-name">{erasing ? 'Erase' : mat?.name}</span>
                  {!erasing && mat && <span className="sl-matline-kind">· {tabOf(mat)}</span>}
                  <span className="sl-matline-end">
                    {entry.kind === 'scene' && (
                      <a className="sl-hit sl-text-link" href={`/s/${entry.id}`} target="_blank" rel="noopener noreferrer">
                        Original
                        <Icon name="external" size={16} />
                      </a>
                    )}
                    <button type="button" className="sl-hit sl-text-link" onClick={() => engineRef.current?.clear()} disabled={!ready}>
                      Clear
                    </button>
                  </span>
                </div>
              )}
              <Rack materials={PAINTABLE} sel={sel} erasing={erasing} onPick={pick} />
              <div className="sl-dock" role="toolbar" aria-label="Brush">
                <button type="button" className="sl-btn sl-dock-erase" aria-pressed={erasing} onClick={() => setErasing((v) => !v)}>
                  <Icon name="erase" />
                  <span>Erase</span>
                </button>
                <div className="sl-sizes" role="radiogroup" aria-label="Brush size">
                  {BRUSH_SIZES.map((b, i) => (
                    <button
                      key={b.r}
                      type="button"
                      role="radio"
                      aria-checked={radius === b.r}
                      aria-label={b.label}
                      className="sl-size"
                      onClick={() => setRadius(b.r)}
                    >
                      <span className="sl-size-dot" data-i={i} />
                    </button>
                  ))}
                </div>
                <button
                  ref={shareBtnRef}
                  type="button"
                  className="sl-btn sl-dock-share"
                  aria-disabled={!hasDrawn || undefined}
                  title={hasDrawn ? undefined : 'Pour something first'}
                  onClick={openShare}
                >
                  <Icon name="share" />
                  <span>Share</span>
                </button>
              </div>
            </div>
            <div className="sl-home-below">
              <TodayCard />
              <StrataBand />
              <WallPreview />
            </div>
          </>
        )}
      </main>
      <ShellFooter />

      <dialog
        ref={sheetRef}
        className="sl-sheet sl-share"
        aria-labelledby="sl-share-h"
        onClick={(e) => e.target === e.currentTarget && sheetRef.current?.close()}
      >
        <div className="sl-sheet-in">
          <div className="sl-sheet-top">
            <h2 className="sl-sheet-title" id="sl-share-h">
              {link?.published ? 'Published' : 'Share this scene'}
            </h2>
            <button type="button" className="sl-hit sl-text-btn" onClick={() => sheetRef.current?.close()}>
              Close
            </button>
          </div>
          {link?.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="sl-share-thumb" src={`data:image/png;base64,${link.thumb}`} alt="Your scene" />
          )}
          {linkErr ? (
            <p className="sl-share-p">{linkErr}</p>
          ) : (
            <input className="sl-share-url" readOnly value={link?.url ?? 'Making a link…'} aria-label="Link to this scene" onFocus={(e) => e.currentTarget.select()} />
          )}
          <div className="sl-share-acts">
            <button type="button" className="sl-btn sl-btn-ember" onClick={canNativeShare ? nativeShare : copyLink} disabled={!link}>
              <Icon name={canNativeShare ? 'share' : 'copy'} />
              <span>{canNativeShare ? 'Share link' : 'Copy link'}</span>
            </button>
            {canNativeShare && (
              <button type="button" className="sl-btn sl-btn-quiet" onClick={copyLink} disabled={!link}>
                <Icon name="copy" />
                <span>Copy</span>
              </button>
            )}
          </div>
          <div className="sl-sheet-rule" />
          <label className="sl-share-label" htmlFor="sl-share-title">
            Title for the gallery
          </label>
          <input
            id="sl-share-title"
            className="sl-share-url"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            disabled={PREVIEW_READ_ONLY}
          />
          <div className="sl-share-acts">
            <button type="button" className="sl-btn sl-btn-line" onClick={publish} disabled={busy || PREVIEW_READ_ONLY} aria-describedby={PREVIEW_READ_ONLY ? 'sl-share-ro' : undefined}>
              <Icon name="gallery" />
              <span>{busy ? 'Publishing…' : 'Publish to the gallery'}</span>
            </button>
            <button type="button" className="sl-btn sl-btn-quiet" onClick={record}>
              <Icon name="record" />
              <span>Record 10s clip</span>
            </button>
          </div>
          {PREVIEW_READ_ONLY && (
            <p className="sl-share-p" id="sl-share-ro" role="note" data-sl-read-only="">
              {READ_ONLY_NOTE}
            </p>
          )}
        </div>
      </dialog>
    </div>
  )
}

async function copyHere(url: string, flash: (m: string) => void) {
  try {
    await navigator.clipboard.writeText(url)
    flash('Link copied.')
  } catch {
    flash('Copy blocked. Copy the address bar instead.')
  }
}
