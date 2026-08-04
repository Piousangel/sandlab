'use client'

import { useEffect, useRef, useState, useCallback, Fragment } from 'react'
import { SandEngine, WebGPUUnsupported } from '@/lib/sand/engine'
import { PRESETS, buildIndex } from '@/lib/sand/materials'
import { buildShareUrl, readShareUrl, encodeScene, decodeScene } from '@/lib/sand/urlState'
import { uploadScene, getScene, listScenes, rememberMine, type SceneMeta } from '@/lib/sand/gallery'
import { makeThumb, isBlank } from '@/lib/sand/thumb'
import { noteFirstTry, buildSuggestionPairs, pickSuggestion } from '@/lib/sand/discovery'
// record.ts는 mediabunny(~대용량 코덱)를 정적 import한다. 방문자 대부분이 안 누르는 녹화 기능이므로
// 랜딩 초기 JS에서 분리한다 — record() 호출 시점에 동적 import(아래).

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
const NAME_BY_SLUG: Record<string, string> = Object.fromEntries(PRESETS.map((m) => [m.slug, m.name]))
// materials.ts reactions에서 파생 — 여기 따로 하드코딩하지 않는다(단일 진실 공급원 유지).
const SUGGESTION_PAIRS = buildSuggestionPairs(PRESETS)
const IDLE_NUDGE_MS = 8000 // 이 정도 손을 안 대면 "해봐" 넛지 후보
const MAX_IDLE_NUDGES = 3 // 방문마다 상한 — 계속 그리는 중인데 넛지가 스팸처럼 뜨지 않게

/** m:ss. 체류시간 stat 표시용 — 음수(시계 오차 등)는 0으로 클램프. */
function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export default function SandCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<SandEngine | null>(null)
  const [err, setErr] = useState<string | null>(null)
  // GPU 컨텍스트 손실(sleep/wake·모바일 GPU 회수·드라이버 TDR). 무신호 정지 대신 새로고침 안내.
  const [lost, setLost] = useState(false)
  const [ready, setReady] = useState(false)
  const [sel, setSel] = useState('sand')
  const [radius, setRadius] = useState(6)
  const [toast, setToast] = useState<string | null>(null)
  const [fps, setFps] = useState(0)
  const [rec, setRec] = useState<number | null>(null) // null=대기, 0..1=녹화중
  const [busy, setBusy] = useState(false)
  // 빈 캔버스 온보딩: 첫 방문자는 검은 상자만 보면 그릴 줄 모른다. 한 번이라도 그리면(또는 장면 복원 시) 끈다.
  const [hasDrawn, setHasDrawn] = useState(false)
  // 남의 씬(#s=id)을 열고 착지했을 때만 뜨는 리믹스 안내 배너. 첫 붓질/× 에 소멸.
  const [remix, setRemix] = useState<{ id: string; title: string } | null>(null)
  // 지우개 모드. 데스크톱은 우클릭으로도 지우지만 터치엔 우클릭이 없어 이 토글이 유일한 지우기 수단이다.
  const [erasing, setErasing] = useState(false)
  // WebGPU 미지원 방문자(클립을 클릭하는 인앱 웹뷰 등)를 텍스트 벽에서 버리지 않는다 —
  // 갤러리는 순수 <img> PNG라 WebGPU 없이 100% 보인다. 최근 씬 썸네일을 관람 탈출구로 보여준다.
  const [errScenes, setErrScenes] = useState<SceneMeta[]>([])
  const [errLoaded, setErrLoaded] = useState(false)
  // Publish/Copy 성공 후 지속되는 공유 패널. navigator.share·clipboard는 transient activation을
  // 요구하는데 업로드(네트워크 await) 뒤엔 그 창이 만료돼 있다. 그래서 자동 공유 대신,
  // 사용자가 '새 제스처'로 눌러 공유/복사하게 링크를 눈앞에 남긴다(실패해도 링크 회수 가능).
  const [shared, setShared] = useState<{ url: string; published: boolean; thumb?: string } | null>(null)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  // 터치(coarse pointer)에선 우클릭이 없다 — 힌트/안내 문구를 포인터 타입에 맞춘다.
  const [coarse, setCoarse] = useState(false)
  const idx = useRef(buildIndex(PRESETS))
  // 리믹스 계보: 공유 링크(#s=id)로 로드한 원본 씬 id. Publish 시 parent로 보내 계보를 잇는다.
  const loadedSceneId = useRef<string | null>(null)
  // 사용자가 한 번이라도 캔버스를 건드렸는가 — 앰비언트 데모를 즉시(race 없이) 멈추는 데 쓴다.
  const interacted = useRef(false)
  // 앰비언트 데모 정리(cleanup)가 되돌릴 반지름의 최신값. effect 마운트 시점 스냅샷을 쓰면,
  // 데모가 도는 동안 사용자가 슬라이더를 바꿔도 정리 시점에 그 변경 전 값으로 덮어써 UI(슬라이더)와
  // 실제 브러시 반지름이 어긋난다 — ref로 항상 최신값을 들고 있어야 한다.
  const radiusRef = useRef(radius)
  // 이번 세션(리로드하면 리셋)에 실제로 칠해본 재료 — 온-페이지 체류 장치("New: Lava (3/20 tried)").
  // GPU 리드백 없음(반응 자체가 아니라 '내가 이 재료를 써봤는가'만 클라이언트에서 추적).
  const triedRef = useRef<Set<string>>(new Set())
  // 유휴 넛지("Try Lava on Water") — 마지막 상호작용(붓질 시작/끝) 이후 경과시간을 잰다.
  // 반응이 실제로 일어났는지는 감지 안 하니 GPU 리드백·셰이더 변경 없음.
  const lastActivityRef = useRef(0)
  const idleNudgedRef = useRef(false) // 이번 유휴 구간엔 이미 넛지했다(같은 정지 상태에서 반복 방지)
  const nudgeCountRef = useRef(0)
  // 체류시간 장치 #3 — 첫 붓질(또는 씬 복원) 시점을 기준으로 경과시간을 stat 줄에 보여준다.
  // neal.fun "Progress" 선례: 실시간으로 오르는 숫자 자체가 볼거리(장르 내 실증).
  const firstDrawnAtRef = useRef<number | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(pointer: coarse)')
    const on = () => setCoarse(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // WebGPU가 없을 때만 최근 씬을 불러온다 — 관람 모드용.
  useEffect(() => {
    if (!err) return
    listScenes('new')
      .then((r) => setErrScenes((r.scenes ?? []).slice(0, 6)))
      .catch(() => {})
      .finally(() => setErrLoaded(true))
  }, [err])

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

  // 세로 폰(h>w)에선 2:1 캔버스가 얇은 밴드가 되고 아래가 큰 검정 → 그 공간을 브랜딩으로 채운다.
  // h>w는 세로 폰/태블릿만 정확히 잡고 모든 landscape 데스크톱을 배제(절대값 임계의 오발동 회피).
  const stageRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setNarrow(el.clientHeight > el.clientWidth)
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
    // init resolve 전에 무장 — 손실이 언제 오든(로딩 중 포함) 신호를 받아 복구를 안내한다.
    eng.onLost = () => {
      if (!disposed) setLost(true)
    }
    eng
      .init()
      .then(async () => {
        if (disposed) return
        // #s=<id> = 갤러리 장면. #g=<blob> = URL 내장 장면.
        // 갤러리 경로가 있어야 URL 예산(6000자)을 넘는 복잡한 장면도 공유된다.
        const sm = location.hash.match(/[#&]s=([A-Za-z0-9_-]{6,16})/)
        let restored = null
        let remixMeta: { id: string; title: string } | null = null
        if (sm) {
          try {
            const sc = await getScene(sm[1])
            restored = await decodeScene(sc.data)
            loadedSceneId.current = sm[1] // 이 씬을 리믹스하면 계보 원본이 된다
            remixMeta = { id: sm[1], title: sc.title } // 착지 배너용(제목은 서버에서 이미 정제됨)
          } catch {
            /* 삭제됐거나 잘못된 id — 빈 화면으로 시작한다 */
          }
        } else {
          restored = await readShareUrl()
        }
        if (!disposed && restored && restored.w === W && restored.h === H) {
          eng.upload(restored.cells)
          firstDrawnAtRef.current = performance.now()
          setHasDrawn(true) // 복원된 장면은 빈 게 아니므로 온보딩 힌트를 띄우지 않는다
          // 남의 씬을 링크로 열었다 → "이거 리믹스할 수 있다"를 알린다(링크 클릭자 = 최고 전환 후보).
          if (remixMeta) setRemix(remixMeta)
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
    if (!hasDrawn) return
    const t = setInterval(() => {
      const start = firstDrawnAtRef.current
      if (start != null) setElapsedSec(Math.floor((performance.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [hasDrawn])

  // 유휴 넛지 — 붓질이 멈춘 지 IDLE_NUDGE_MS 넘으면 시도 안 해본 반응쌍을 하나 제안한다.
  // 온보딩 힌트/앰비언트 데모와 안 겹치게 hasDrawn 이후에만, 방문당 상한(MAX_IDLE_NUDGES)을 둔다.
  useEffect(() => {
    if (!ready || !hasDrawn) return
    // hasDrawn이 onDown 없이(#s=id·#g= 씬 복원) true가 될 수도 있다 — 그 경로는 lastActivityRef를
    // 안 건드리므로 0(초기값)에 멈춰있어 첫 tick에 곧바로 "유휴"로 오판한다. 이 effect가 실제로
    // 활성화되는 시점을 기준선으로 삼는다.
    lastActivityRef.current = performance.now()
    const iv = setInterval(() => {
      if (idleNudgedRef.current || nudgeCountRef.current >= MAX_IDLE_NUDGES) return
      // 누르고 있는 동안(움직임 없는 정지 홀드 포함)은 절대 유휴가 아니다 — onMove 없이도 맞다.
      if (engineRef.current?.brush.mat !== 0xffffffff) return
      if (performance.now() - lastActivityRef.current < IDLE_NUDGE_MS) return
      const msg = pickSuggestion(SUGGESTION_PAIRS, triedRef.current)
      idleNudgedRef.current = true // 제안이 없어도(null) 이번 유휴 구간은 소진 — 매초 재시도 안 함
      if (msg) {
        flash(msg)
        nudgeCountRef.current++
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [ready, hasDrawn])

  useEffect(() => {
    radiusRef.current = radius
    const eng = engineRef.current
    if (eng) eng.brush.r = radius
  }, [radius, ready])

  // 살아있는 첫 프레임 — 안 건드린 빈 캔버스에 재료를 은은히 흘려 넣는다.
  // 클립을 보고 온 방문자가 '죽은 검은 박스'가 아니라 움직이는 장면(모래 쌓임·물 흐름·용암 발광)에
  // 착지해 스크롤이 멈춘다(oddly-satisfying). 손대는 즉시 멈추고 캔버스를 비운다(onDown).
  useEffect(() => {
    if (!ready || hasDrawn) return
    // 요청하지 않은 자동 모션이므로 reduced-motion 사용자에겐 돌리지 않는다(접근성).
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const eng = engineRef.current
    if (!eng) return
    let raf = 0
    let t = 0
    eng.brush.r = 3 // 얇게 흘려 천천히 쌓이게
    // 색 대비 + 용암 발광 + 물↔용암 증기 + oil↔lava 발화(자발적 불꽃 이벤트로 첫 프레임이 더 살아있게)
    const palette = ['sand', 'water', 'lava', 'oil', 'plant', 'lava']
    const tick = () => {
      if (interacted.current) {
        eng.brush.mat = 0xffffffff
        return
      }
      t++
      if (t < 900) {
        // 부드럽게 좌우로 드리프트하는 수도꼭지 — 순간이동이 아니라 연속 스트림이라 선이 안 그어진다.
        eng.brush.x = Math.floor(W * (0.5 + 0.4 * Math.sin(t * 0.011)))
        eng.brush.y = Math.floor(H * 0.05)
        eng.brush.mat = idx.current.get(palette[Math.floor(t / 80) % palette.length]) ?? 0
      } else {
        eng.brush.mat = 0xffffffff // 충분히 찼으면 멈추고 반응·정착만 살아있게 둔다
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      const e = engineRef.current
      if (e) {
        e.brush.mat = 0xffffffff
        e.brush.r = radiusRef.current
      }
    }
  }, [ready, hasDrawn])

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
    lastActivityRef.current = performance.now()
    idleNudgedRef.current = false // 다시 손을 댔으니 다음 유휴 구간에 또 넛지할 수 있다
    if (remix) setRemix(null) // 첫 붓질 = 리믹스 시작 → 안내 배너 소멸
    // 첫 상호작용: 앰비언트 데모를 즉시 멈추고(ref) 캔버스를 비워 사용자에게 깨끗한 시작을 준다.
    if (!interacted.current) {
      interacted.current = true
      if (!hasDrawn) eng.clear()
    }
    const { x, y } = toGrid(e)
    eng.brush.x = x
    eng.brush.y = y
    // 지우개 모드(터치) 또는 우클릭(데스크톱) = 지우기. 둘 다 mat=0.
    const isErase = erasing || e.button === 2
    eng.brush.mat = isErase ? 0 : (idx.current.get(sel) ?? 0)
    if (!isErase) {
      const msg = noteFirstTry(triedRef.current, sel, NAME_BY_SLUG[sel] ?? sel, PAINTABLE.length)
      if (msg) flash(msg)
    }
    if (!hasDrawn) {
      firstDrawnAtRef.current = performance.now()
      setHasDrawn(true) // 첫 붓질 → 온보딩 힌트 제거
    }
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current
    if (!eng || eng.brush.mat === 0xffffffff) return
    // 계속 누른 채 긋는 긴 스트로크도 '활동 중'이다 — onDown/onUp만 갱신하면 IDLE_NUDGE_MS보다
    // 긴 스트로크 도중에 유휴로 오판해 넛지가 뜬다.
    lastActivityRef.current = performance.now()
    const { x, y } = toGrid(e)
    eng.brush.x = x
    eng.brush.y = y
  }

  const onUp = () => {
    const eng = engineRef.current
    if (eng) eng.brush.mat = 0xffffffff
    lastActivityRef.current = performance.now() // 유휴 시계는 붓질이 '끝난' 시점부터
  }

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flash = (m: string) => {
    // 이전 타이머를 지운다 — 안 그러면 2.6초 내 겹친 토스트를 stale 타이머가 조기에 지운다.
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(m)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  // 공유 패널 버튼 핸들러 — 사용자의 새 클릭/탭(fresh activation)으로 구동되므로
  // navigator.share·clipboard가 안정적으로 동작한다. 성공/실패를 정직하게 보고한다.
  const copyShared = async () => {
    if (!shared) return
    try {
      await navigator.clipboard.writeText(shared.url)
      flash('Link copied.')
    } catch {
      // 클립보드가 막히면 거짓 성공 대신 링크를 직접 집어가게 안내한다.
      flash('Copy blocked — tap the link to select it.')
    }
  }
  const shareShared = async () => {
    if (!shared) return
    try {
      await navigator.share({ title: 'Sandlab', url: shared.url })
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) copyShared()
    }
  }

  const record = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || rec !== null) return
    try {
      setRec(0)
      if (engineRef.current) engineRef.current.recording = true // 클립에 워터마크 합성 ON
      const { recordClip, downloadClip } = await import('@/lib/sand/record')
      const clip = await recordClip({ canvas, durationMs: 10000, onProgress: setRec })
      downloadClip(clip, `sandlab-${Date.now()}`)
      flash(`${clip.format.label} saved · ${(clip.bytes / 1e6).toFixed(1)} MB — post it, don't link it.`)
    } catch (e) {
      // RecordUnsupported는 동적 모듈의 클래스라 instanceof 대신 name으로 식별한다.
      flash(e instanceof Error && e.name === 'RecordUnsupported' ? e.message : 'Recording failed.')
    } finally {
      if (engineRef.current) engineRef.current.recording = false // 워터마크 OFF (평소엔 안 보임)
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
      const { id } = await uploadScene({
        title,
        data,
        thumb,
        w: W,
        h: H,
        parent: loadedSceneId.current, // 공유 링크로 로드한 원본이 있으면 계보를 잇는다
      })
      rememberMine(id, title || 'Untitled') // 재방문 훅: 내가 올린 씬으로 기록
      loadedSceneId.current = id // 이후 재발행은 방금 올린 내 씬의 리믹스가 된다
      // 현재 탭 상태는 기존 해시 경로로(리로드해도 이 씬), 공유는 OG가 붙는 경로형 링크로.
      history.replaceState(null, '', `${location.origin}/#s=${id}`)
      // 방금 만든 씬 썸네일을 공유 패널에 보여준다 — "내가 만든 게 이렇게 나왔다" 자부심 모먼트.
      setShared({ url: `${location.origin}/s/${id}`, published: true, thumb })
      flash('Published to the gallery.')
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
    let res: Awaited<ReturnType<typeof buildShareUrl>>
    try {
      res = await buildShareUrl(cells, W, H)
    } catch (e) {
      // rleEncode는 물질 id가 1바이트 포맷을 넘으면 던진다(urlState.ts) — publish()와 동일하게
      // 사용자에게 알린다. 안 잡으면 버튼이 아무 반응 없이 죽은 것처럼 보인다.
      return flash(e instanceof Error ? e.message : 'Link failed.')
    }
    if (!res.ok) {
      // 막다른 길로 두지 않는다 — 갤러리는 크기 제한이 없으므로 그쪽으로 보낸다.
      return flash(
        `Too detailed for a link (${(res.size / res.budget).toFixed(1)}x over). Use Publish instead.`,
      )
    }
    history.replaceState(null, '', res.url)
    // 공유 패널에도 씬 프리뷰를 — 실패해도 optional이라 링크 흐름은 무손상.
    let thumb: string | undefined
    try {
      thumb = await makeThumb(cells, W, H, PRESETS)
    } catch {
      /* 프리뷰만 생략 */
    }
    setShared({ url: res.url, published: false, thumb })
    // Copy link는 네트워크가 없어 activation이 살아있다 — 즉시 복사를 시도하되 정직하게.
    // 실패해도 패널에 링크가 남아 회수 가능하므로 거짓 'copied'를 내지 않는다.
    try {
      await navigator.clipboard.writeText(res.url)
      flash('Link copied.')
    } catch {
      /* 패널의 Copy 버튼(새 제스처)으로 다시 시도 가능 */
    }
  }, [])

  if (lost) {
    return (
      <div style={S.errWrap}>
        <div style={S.errCard}>
          <h2 style={{ margin: '0 0 10px', fontSize: 19 }}>The GPU was interrupted</h2>
          <p style={{ margin: '0 0 16px', opacity: 0.72, fontSize: 14, lineHeight: 1.55 }}>
            Your device paused the graphics context (this can happen after sleep, or when another app
            needs the GPU). Reload to pick up where the sandbox left off.
          </p>
          <button
            onClick={() => location.reload()}
            style={{ ...S.errCta, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Reload ↻
          </button>
          <p style={{ margin: '14px 0 0' }}>
            <a href="/gallery" style={{ ...S.errCta, background: 'transparent', color: '#8ea0bf', boxShadow: 'none', padding: 0 }}>
              or browse the gallery →
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (err) {
    return (
      <div style={S.errWrap}>
        <div style={S.errCard}>
          <h2 style={{ margin: '0 0 10px', fontSize: 19 }}>Your browser can&apos;t run the sandbox</h2>
          <p style={{ margin: '0 0 14px', opacity: 0.72, fontSize: 14, lineHeight: 1.55 }}>
            The playground needs WebGPU, which this browser doesn&apos;t expose. But you can still
            browse what people have made.
          </p>

          {errScenes.length > 0 && (
            <div style={S.errThumbs}>
              {errScenes.map((s) => (
                <a
                  key={s.id}
                  href={`/gallery`}
                  title={s.title}
                  style={S.errThumb}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/scenes/${s.id}/thumb`}
                    alt={s.title}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </a>
              ))}
            </div>
          )}

          {/* 갤러리가 아직 비어 있으면 빈손 CTA 대신 브랜드 카드로 최소한의 시각을 준다. */}
          {errLoaded && errScenes.length === 0 && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/og.png" alt="Sandlab" style={S.errHero} />
          )}

          <a href="/gallery" style={S.errCta}>
            Browse the gallery →
          </a>

          <p style={{ margin: '16px 0 0', fontSize: 12.5, opacity: 0.42, lineHeight: 1.6 }}>
            To create your own: Chrome/Edge 113+, or Safari 26+ (macOS Tahoe, iOS 26).
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
      <div ref={stageRef} style={{ ...S.stage, bottom: dockH, ...(narrow ? S.stageNarrow : null) }}>
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
        {/* init(adapter→device→6 파이프라인 컴파일)은 저사양·초기방문에서 0.5~2초. 그동안 검은 박스에
            탭이 조용히 버려지면 "고장"으로 오해해 이탈한다. 로딩 신호로 첫 5초 마찰을 없앤다. */}
        {!ready && <div style={S.loading}>Starting the sandbox…</div>}
        {/* 온보딩 힌트는 캔버스 위 정중앙 — narrow(세로 폰)에선 캔버스가 상단 밴드라 stage 50%가
            듄 영역에 떨어져 어긋난다. 그래서 narrow에선 숨기고 아래 stageFillSub가 안내를 대신한다. */}
        {ready && !hasDrawn && !narrow && (
          <div style={S.onboard}>{coarse ? 'Drag to pour sand' : 'Click and drag to pour sand'}</div>
        )}
        {/* 좌상단에 이미 Sandlab 브랜드가 있어 중앙 금색 워드는 중복·공간낭비라 제거.
            그리기 전 안내 힌트만(그린 뒤엔 블록 자체가 안 뜬다). */}
        {narrow && !hasDrawn && (
          <div style={S.stageFill}>
            <span style={S.stageFillSub}>Drag on the canvas to pour sand. Share the link.</span>
          </div>
        )}
        {remix && (
          <div style={S.remixBanner}>
            <span style={S.remixText}>
              Remixing <strong style={{ fontWeight: 600 }}>“{remix.title}”</strong> — draw on it, then Publish your own.
            </span>
            <a href={`/s/${remix.id}`} target="_blank" rel="noopener noreferrer" style={S.remixLink}>
              original&nbsp;↗
            </a>
            <button onClick={() => setRemix(null)} style={S.remixClose} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
      </div>

      <div style={S.brand}>
        <span style={{ fontWeight: 650, letterSpacing: -0.2 }}>Sandlab</span>
        <span style={S.brandSub}>no install · no sign-up · share as a link</span>
      </div>

      {ready && (
        <div style={S.stat}>
          {fps} fps · {((W * H) / 1000).toFixed(0)}k cells
          {hasDrawn && <> · {formatElapsed(elapsedSec)}</>}
        </div>
      )}

      <div ref={dockRef} style={S.dock}>
        <div style={S.chips}>
          {PAINTABLE.map((m, i) => {
            const on = sel === m.slug
            const dot = {
              ...S.chip,
              background: m.color,
              transform: on ? 'scale(1.32)' : 'scale(1)',
              boxShadow: on
                ? `0 0 0 2px #0b0e13, 0 0 0 3.5px #fff, 0 0 16px ${m.color}, 0 0 6px 1px #f5a62366`
                : m.emissive > 0.5
                  ? `0 0 10px ${m.color}88`
                  : 'inset 0 0 0 1px #ffffff22',
            }
            const pick = () => {
              setSel(m.slug)
              setErasing(false) // 재료를 고르면 지우개 모드 해제
            }
            // 움직임 타입(고정·가루·액체·기체) 경계에 구분선 — 18개 칩의 그룹을 읽히게.
            const groupBreak = i > 0 && PAINTABLE[i - 1].movement !== m.movement
            // 터치: 시각 점은 19px 유지하되 탭 영역만 40px로(오탭 방지). 마우스: 19px 버튼.
            const chip = coarse ? (
              <button onClick={pick} title={m.name} aria-label={m.name} aria-pressed={!erasing && sel === m.slug} style={S.chipHit}>
                <span style={dot} />
              </button>
            ) : (
              <button onClick={pick} title={m.name} aria-label={m.name} aria-pressed={!erasing && sel === m.slug} style={dot} />
            )
            return (
              <Fragment key={m.slug}>
                {groupBreak && <span style={S.chipSep} />}
                {chip}
              </Fragment>
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
            aria-label="Brush size"
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
        <button style={S.publishBtn} onClick={publish} disabled={busy}>
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

      {shared && (
        <div style={{ ...S.sharePanel, bottom: dockH + 14 }}>
          {shared.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${shared.thumb}`} alt="Your scene" style={S.shareThumb} />
          )}
          <span style={S.sharePanelMsg}>
            {shared.published ? 'Published to the gallery' : 'Link ready'}
          </span>
          <input
            readOnly
            value={shared.url}
            onFocus={(e) => e.currentTarget.select()}
            style={S.shareInput}
          />
          {/* 주액션은 항상 하나만: 모바일엔 Share가 자연스러우니 Copy는 고스트로, 데스크톱엔 Copy가 주액션. */}
          <button style={canShare ? S.ghost : S.sharePrimary} onClick={copyShared}>
            Copy
          </button>
          {canShare && (
            <button style={S.sharePrimary} onClick={shareShared}>
              Share
            </button>
          )}
          <a style={{ ...S.ghost, textDecoration: 'none', lineHeight: '1.6' }} href="/gallery">
            Gallery
          </a>
          <button style={S.shareClose} onClick={() => setShared(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {!coarse && <div style={S.hint}>Right-click to erase</div>}
      {toast && <div style={S.toast} role="status" aria-live="polite">{toast}</div>}
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
    // flex column — 데스크톱은 자식(canvas)이 하나라 여전히 정중앙. 세로 폰에선 canvas를 위로
    // 붙이고 남는 큰 검정을 브랜딩으로 채운다(stageNarrow/stageFill).
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 8px 0',
  },
  // 세로 폰: canvas를 상단에 붙이고 아래 데드스페이스를 채운다.
  stageNarrow: {
    justifyContent: 'flex-start',
    paddingTop: 'max(56px, env(safe-area-inset-top))',
  },
  // 검정 데드스페이스 대신 바닥에서 올라오는 앰버 듄 글로우 + 브랜드 히어로.
  stageFill: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    textAlign: 'center',
    padding: '26px 20px',
    background:
      'radial-gradient(130% 90% at 50% 118%, rgba(245,166,35,0.16), rgba(245,166,35,0.03) 46%, transparent 72%)',
    pointerEvents: 'none',
    userSelect: 'none',
  },
  stageFillWord: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: -0.4,
    color: '#f5d9a6',
    textShadow: '0 2px 20px rgba(0,0,0,0.6)',
  },
  stageFillSub: { fontSize: 13, opacity: 0.62, color: '#eef1f6', maxWidth: 280, lineHeight: 1.5 },
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
    // cover 확장 시 iOS 상태바(시계·배터리)와 겹치지 않게 안전영역만큼 내린다.
    top: 'max(18px, env(safe-area-inset-top))',
    left: 20,
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    fontSize: 18,
    color: '#eef1f6',
    textShadow: '0 1px 12px rgba(0,0,0,0.9)',
    pointerEvents: 'none',
  },
  brandSub: { fontSize: 11.5, opacity: 0.6, letterSpacing: 0.2 },
  stat: {
    position: 'absolute',
    top: 'max(20px, env(safe-area-inset-top))',
    right: 20,
    fontSize: 11,
    color: '#eef1f6',
    opacity: 0.5,
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
    paddingTop: 8,
    paddingLeft: 14,
    paddingRight: 14,
    // viewportFit:'cover'가 레이아웃을 홈인디케이터 밑까지 확장하므로, 안전영역만큼 하단을 띄운다.
    // 이 패딩은 dockRef.offsetHeight에 포함돼 ResizeObserver→stage.bottom이 자동으로 비켜준다.
    paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
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
    display: 'block',
    width: 19,
    height: 19,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'transform 110ms cubic-bezier(.2,.9,.3,1.2), box-shadow 110ms',
  },
  // 움직임 타입 그룹 구분선 (고정·가루·액체·기체)
  chipSep: {
    width: 1,
    height: 16,
    background: 'rgba(255,255,255,0.13)',
    margin: '0 3px',
    alignSelf: 'center',
    flexShrink: 0,
  },
  // 터치 히트영역 래퍼 — 40px 탭 타깃, 안엔 19px 점만 보인다. 투명.
  chipHit: {
    width: 40,
    height: 40,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
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
  range: { width: 80, accentColor: '#f5a623', cursor: 'pointer' },
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
  // Publish는 리텐션 루프(발행→갤러리)의 관문 — 앰버 아웃라인으로 2차 강조해 파괴 액션 Clear와 구분.
  publishBtn: {
    background: 'rgba(245,166,35,0.10)',
    color: '#f5c98a',
    opacity: 1,
    border: '1px solid rgba(245,166,35,0.55)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // 토글 활성 상태(지우개 ON) — 브랜드 앰버로 지금 지우개 모드임을 보여준다.
  ghostActive: {
    opacity: 1,
    color: '#f5d9a6',
    background: 'rgba(245,166,35,0.16)',
    border: '1px solid rgba(245,166,35,0.7)',
    boxShadow: '0 0 0 1px rgba(245,166,35,0.22)',
  },
  // Record만 시그니처 레드-오렌지(용암 글로우) — 나머지 주액션은 앰버. '캡처' 액션의 차별화.
  primary: {
    background: '#ff5a2c',
    color: '#fff',
    border: '1px solid #ff5a2c',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 3px 16px rgba(255,90,44,0.42)',
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
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    userSelect: 'none',
    color: '#eef1f6',
    opacity: 0.55,
    fontSize: 14.5,
    fontWeight: 500,
    letterSpacing: 0.3,
    textShadow: '0 1px 12px rgba(0,0,0,0.9)',
  },
  // 리믹스 착지 배너 — 캔버스 상단. 컨테이너는 pointerEvents:none(그리기 방해 안 함),
  // 링크·× 만 auto. 첫 붓질 또는 × 로 소멸.
  remixBanner: {
    ...glass,
    position: 'absolute',
    top: 14,
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: 'calc(100% - 20px)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 8px 7px 13px',
    borderRadius: 10,
    color: '#eef1f6',
    fontSize: 12.5,
    boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
    pointerEvents: 'none',
    zIndex: 6,
  },
  remixText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 },
  remixLink: {
    pointerEvents: 'auto',
    color: '#f5c98a',
    textDecoration: 'none',
    fontWeight: 600,
    flexShrink: 0,
  },
  remixClose: {
    pointerEvents: 'auto',
    flexShrink: 0,
    background: 'transparent',
    border: 'none',
    color: '#eef1f6',
    opacity: 0.55,
    fontSize: 17,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 2px',
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
  // Publish/Copy 성공 후 지속되는 공유 패널 — 새 제스처로 눌러 공유/복사(activation 안전).
  sharePanel: {
    ...glass,
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    padding: '9px 11px',
    borderRadius: 12,
    maxWidth: '92vw',
    zIndex: 6,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  },
  sharePanelMsg: { fontSize: 12, fontWeight: 600, opacity: 0.85, color: '#eef1f6' },
  // 방금 만든 씬 프리뷰 — 패널이 flexWrap이라 flexBasis 100%가 컨트롤 위 독립 행으로 밀어 올린다.
  shareThumb: {
    flexBasis: '100%',
    width: '100%',
    maxWidth: 264,
    margin: '0 auto',
    aspectRatio: '2 / 1',
    borderRadius: 8,
    objectFit: 'cover',
    display: 'block',
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
  },
  shareInput: {
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 7,
    color: '#e8dcc4',
    fontSize: 12,
    padding: '6px 8px',
    width: 240,
    maxWidth: '58vw',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  sharePrimary: {
    background: '#f5a623',
    color: '#1a1206',
    border: '1px solid #f5a623',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  shareClose: {
    background: 'transparent',
    color: '#eef1f6',
    opacity: 0.55,
    border: 'none',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 4px',
  },
  errWrap: { position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20 },
  errCard: { ...glass, maxWidth: 480, padding: 26, borderRadius: 14 },
  errHero: {
    width: '100%',
    borderRadius: 8,
    margin: '0 0 16px',
    display: 'block',
    border: '1px solid rgba(255,255,255,0.10)',
  },
  errThumbs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    margin: '0 0 16px',
  },
  errThumb: {
    display: 'block',
    aspectRatio: '2 / 1',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.10)',
  },
  errCta: {
    display: 'inline-block',
    background: '#f5a623',
    color: '#1a1206',
    textDecoration: 'none',
    borderRadius: 9,
    padding: '10px 16px',
    fontSize: 13.5,
    fontWeight: 600,
    boxShadow: '0 3px 16px rgba(245,166,35,0.4)',
  },
  code: {
    background: 'rgba(255,255,255,0.07)',
    padding: '1px 5px',
    borderRadius: 4,
    fontSize: 12,
  },
}
