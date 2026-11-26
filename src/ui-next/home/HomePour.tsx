'use client'

/**
 * 새 홈 「Pour」(리디자인 P6). 프리뷰 빌드(NEXT_PUBLIC_UI=next)에서만 shell/next.ts를 거쳐 들어온다 — prod는 옛 SandCanvas.
 *
 * 화면(위에서 아래): 셸 헤더(P3) → 헤드라인 두 줄(빈 홈 / #s= 장면 제목·작성자·리믹스 수 / #g= 공유 장면)
 * → 유리 우물(엔진 캔버스, 1200×600 그대로, 화면 폭 가득 2:1) → 재료 줄(또는 리믹스 배너) → 시험관 랙(S7) → 엄지 도크
 * (Erase · 붓 크기 점 3개 · Share — 첫 획 전 Share는 흐림 + aria-disabled) → 오늘 카드 → 지층 띠 → 벽 미리보기 → 셸 푸터.
 *
 * 엔진은 옛 홈과 같은 공개 API만 쓴다(init·upload·start·brush·readback·clear·destroy) — 엔진 코드 변경 0.
 * 링크 규칙(#s= 정규식·parent·발행 후 링크)은 urlState.ts의 sceneIdFromHash 등 순수 함수(옛 홈과 공유, 골든셋 테스트).
 * Undo 없음(엔진에 없음). WebGPU가 없으면(B4 ③) 오늘 퍼즐(Spill은 2D)이 주 CTA, 우물 자리는 실엔진 정지 프레임 + 이유 + Open in browser/Copy link.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { SandEngine } from '@/lib/sand/engine'
import { PRESETS, buildIndex } from '@/lib/sand/materials'
import {
  buildShareUrl,
  decodeScene,
  encodeScene,
  hasEmbeddedScene,
  publishParent,
  publishedLinks,
  readShareUrl,
  sceneIdFromHash,
} from '@/lib/sand/urlState'
import { getScene, rememberMine, trackEvent, trackFirstStroke, uploadScene } from '@/lib/sand/gallery'
import { getCreatorId, getCreatorName, setCreatorName } from '@/lib/sand/creator'
import { isBlank, makeThumb } from '@/lib/sand/thumb'
import { noteFirstTry } from '@/lib/sand/discovery'
import { checkPourMilestone } from '@/lib/sand/milestones'
import { uaClass } from '@/lib/sand/ua'
import { gpuAdvice, type GpuAdvice } from '@/lib/sand/gpuAdvice'
import { Icon } from '../icons/Icon'
import { BottomSheet } from '../sheet/BottomSheet'
import { ShellHeader } from '../shell/ShellHeader'
import { ShellFooter } from '../shell/ShellFooter'
import { PREVIEW_READ_ONLY, READ_ONLY_NOTE } from '../shell/ReadOnlyNote'
import { isSandlabPick, SANDLAB_CREATOR } from '../gallery/picks'
import { Rack } from './Rack'
import { StrataBand, TodayCard, WallPreview } from './HomeSections'
import { HomeAbout } from './HomeAbout'
import {
  BRUSH_SIZES,
  DEFAULT_BRUSH,
  DEMO_KEY,
  NO_BRUSH,
  NO_GPU_HEADLINE,
  demoBrush,
  entryHeadline,
  hashNeedsReload,
  rovingNext,
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
    eng.init().then(
      async () => {
        if (disposed) return
        // 복원 단계의 실패(없는 id·깨진 링크·업로드 오류)는 'WebGPU 미지원'이 아니다 — 빈 화면으로 시작한다(옛 홈과 같음)
        const sid = sceneIdFromHash(location.hash)
        let next: Entry = { kind: 'blank' }
        try {
          let restored = null
          if (sid) {
            const sc = await getScene(sid)
            restored = await decodeScene(sc.data)
            // P9: 단건 API가 creatorName을 싣는다. 팀 큐레이션(이름 없이 올린 작품)은 갤러리 목록 표기와 같게 'Sandlab'
            const by = sc.creatorName ?? (isSandlabPick(sid) ? SANDLAB_CREATOR : null)
            next = { kind: 'scene', id: sid, title: sc.title, creatorName: by, remixCount: sc.remixCount ?? 0 }
          } else {
            restored = await readShareUrl()
            if (restored) next = { kind: 'link' }
          }
          if (disposed) return
          if (restored && restored.w === W && restored.h === H) {
            eng.upload(restored.cells)
            if (sid) loadedSceneId.current = sid // 이 장면을 리믹스하면 계보 원본이 된다
            restoredRef.current = true
            setHasDrawn(true)
            setBanner(true)
          } else next = { kind: 'blank' }
        } catch {
          next = { kind: 'blank' }
        }
        if (disposed) return
        setEntry(next)
        engineRef.current = eng
        eng.brush.r = radiusRef.current
        eng.start()
        setReady(true)
      },
      () => {
        // init 실패(미지원 WebGPUUnsupported든 requestDevice 거부·파이프라인 실패든)만 미지원 화면 + 계측 — 옛 홈과 같은 분류
        if (disposed) return
        const ua = navigator.userAgent || ''
        setAdvice(gpuAdvice(ua))
        trackEvent('gpu_unsupported', uaClass(ua), 0) // value 0 = 홈 샌드박스(옛 홈과 같은 계측)
      },
    )
    return () => {
      disposed = true
      eng.destroy()
      engineRef.current = null
    }
  }, [])

  // 홈 안에서 /#s=… (벽 미리보기 카드)로 해시만 바뀌면 엔진이 다시 읽지 않는다 → 새로고침해서 연다.
  useEffect(() => {
    // 비교 기준은 '지금 캔버스에 열린 장면'(공유 시트의 replaceState는 hashchange를 안 내므로 직전 해시를 믿지 않는다)
    const on = () => {
      const opened = loadedSceneId.current ? `#s=${loadedSceneId.current}` : ''
      if (hashNeedsReload(opened, location.hash, sceneIdFromHash)) location.reload()
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
    return () => {
      cancelAnimationFrame(raf)
      if (!interacted.current) eng.brush.mat = NO_BRUSH // 데모 도중 정리(StrictMode 이중 실행 등)에도 모래가 계속 쏟아지지 않게
    }
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
      trackFirstStroke() // 북극성: 탭당 첫 붓기 1회(지우개 획 제외)
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

  // Remix this = 이 장면 위에 바로 붓기 시작: 배너를 접고, 우물을 화면에 맞춰 보이고, 안내 한 줄
  const remixNow = () => {
    setBanner(false)
    canvasRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    flash('Pick a tube and drag on the scene.')
  }

  const pick = (slug: string) => {
    setSel(slug)
    setErasing(false)
  }

  // 엄지 도크 = toolbar(P11): Tab 정지점 1개(Erase · 붓 3 · Share), 좌우 화살표·Home·End로 포커스(위치는 이벤트 대상 기준)
  const DOCK_N = 2 + BRUSH_SIZES.length
  const [dockStop, setDockStop] = useState(0)
  const onDockKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const btns = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
    const to = rovingNext(e.key, btns.indexOf(e.target as HTMLButtonElement), btns.length)
    if (to < 0) return
    e.preventDefault()
    setDockStop(to)
    btns[to]?.focus()
  }

  /* ---------- 공유 시트 ---------- */
  // 공통 BottomSheet. 공유·발행이 만든 주소는 시트가 닫힌 뒤(onCloseShare) 주소창에 넣는다 — 열린 동안 바꾸면 시트의 history 칸
  // 주소가 바뀌어, 닫을 때 history.back이 옛 주소로 되돌리고(#g= 링크로 들어온 경우 hashchange → 새로고침으로 작업이 날아간다) 주소창에 남지도 않는다.
  const [shareOpen, setShareOpen] = useState(false)
  const shareBtnRef = useRef<HTMLButtonElement>(null)
  const shareOpenRef = useRef(false)
  const pendingUrl = useRef<string | null>(null)
  /** 주소창에 넣을 주소: 시트가 열려 있으면 닫힌 뒤로 미룬다. */
  const setAddress = (url: string) => {
    if (shareOpenRef.current) pendingUrl.current = url
    else history.replaceState(history.state, '', url)
  }
  const [link, setLink] = useState<Link | null>(null)
  const [linkErr, setLinkErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  // 마운트 뒤에 판정 — 렌더 중에 navigator를 보면 정적 HTML(Copy link)과 모바일 클라이언트(Share link)가 어긋나 하이드레이션 불일치
  const [canNativeShare, setCanNativeShare] = useState(false)
  useEffect(() => setCanNativeShare(typeof navigator.share === 'function'), [])
  const linkReq = useRef(0)

  const openShare = async () => {
    if (!hasDrawn) return flash('Pour something first.')
    const eng = engineRef.current
    if (!eng) return
    trackEvent('share_click', 'sandbox-link')
    const req = ++linkReq.current // 시트를 닫았다 다시 열면 앞선 요청 결과는 버린다
    setLink(null)
    setLinkErr(null)
    pendingUrl.current = null
    shareOpenRef.current = true
    setShareOpen(true)
    try {
      const cells = await eng.readback()
      const res = await buildShareUrl(cells, W, H)
      let thumb: string | undefined
      try {
        thumb = await makeThumb(cells, W, H, PRESETS)
      } catch {
        /* 미리보기만 생략 */
      }
      if (req !== linkReq.current) return
      if (!res.ok) {
        setLink(null)
        setLinkErr(`Too detailed for a link (${(res.size / res.budget).toFixed(1)}x over). Publish it to the gallery instead.`)
        return
      }
      pendingUrl.current = res.url
      setLink({ url: res.url, thumb, published: false })
    } catch (e) {
      if (req === linkReq.current) setLinkErr(e instanceof Error ? e.message : 'Link failed.')
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
      setAddress(links.tabUrl)
      linkReq.current++ // 늦게 끝나는 링크 요청이 발행 결과를 덮지 않게
      setLinkErr(null)
      setLink({ url: links.shareUrl, thumb, published: true })
      flash('Published to the gallery.')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Publish failed.')
    } finally {
      setBusy(false)
    }
  }

  /** 시트가 닫힌 뒤(시트 api.close의 after) 녹화 시작 — 시트가 내려가는 모습이 클립에 담기지 않게. */
  const record = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
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

  /** 시트가 닫힌 뒤(이미 원래 history 칸으로 돌아온 다음): 만든 주소를 주소창에. 포커스는 BottomSheet가 Share 버튼으로 돌려준다. */
  const onCloseShare = useCallback(() => {
    setShareOpen(false)
    shareOpenRef.current = false
    linkReq.current++ // 링크를 만드는 중에 닫았으면 늦게 온 결과는 버린다(주소창도 그대로)
    const url = pendingUrl.current
    pendingUrl.current = null
    if (url) history.replaceState(history.state, '', url)
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
                  <button type="button" className="sl-btn sl-btn-ember sl-remix-go" onClick={remixNow}>
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
              <Rack materials={PAINTABLE} sel={sel} erasing={erasing} onPick={pick} warm={hasDrawn} />
              <div className="sl-dock" role="toolbar" aria-label="Brush" onKeyDown={onDockKey}>
                <button
                  type="button"
                  className="sl-btn sl-dock-erase"
                  aria-pressed={erasing}
                  tabIndex={dockStop === 0 ? 0 : -1}
                  onFocus={() => setDockStop(0)}
                  onClick={() => setErasing((v) => !v)}
                >
                  <Icon name="erase" />
                  <span>Erase</span>
                </button>
                <div className="sl-sizes" role="group" aria-label="Brush size">
                  {BRUSH_SIZES.map((b, i) => (
                    <button
                      key={b.r}
                      type="button"
                      aria-pressed={radius === b.r}
                      aria-label={b.label}
                      className="sl-size"
                      tabIndex={dockStop === i + 1 ? 0 : -1}
                      onFocus={() => setDockStop(i + 1)}
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
                  aria-describedby={hasDrawn ? undefined : 'sl-share-why'}
                  tabIndex={dockStop === DOCK_N - 1 ? 0 : -1}
                  onFocus={() => setDockStop(DOCK_N - 1)}
                  onClick={openShare}
                >
                  <Icon name="share" />
                  <span>Share</span>
                </button>
                <span id="sl-share-why" className="sl-vh">
                  Pour something first.
                </span>
              </div>
            </div>
            <div className="sl-home-below">
              <TodayCard />
              <StrataBand />
              <WallPreview />
            </div>
          </>
        )}
        <HomeAbout />
      </main>
      <ShellFooter />

      <BottomSheet open={shareOpen} onClose={onCloseShare} labelledBy="sl-share-h" historyMark="__slShare" className="sl-share" returnFocus={shareBtnRef}>
        {(api) => (
        <div className="sl-sheet-in">
          <div className="sl-sheet-top">
            <h2 className="sl-sheet-title" id="sl-share-h">
              {link?.published ? 'Published' : 'Share this scene'}
            </h2>
            <button type="button" className="sl-hit sl-text-btn" onClick={() => api.close()}>
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
            <button type="button" className="sl-btn sl-btn-quiet" onClick={() => api.close(() => void record())}>
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
        )}
      </BottomSheet>
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
