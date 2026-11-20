'use client'

/**
 * 시험관 랙(S7) — 정지 포스터 아틀라스 1장(#67 실엔진 캡처, public/ui-next/posters/atlas.webp)을 관마다 잘라 쓴다.
 * 선택된 관만 들림·마개 열림(transform 한 번) + P11: 사람이 고른 관 하나만 12프레임 스트립으로 한 번 붓는다
 * (strips/<slug>.webp, transform steps — 합성 단계만). reduced-motion·Save-Data·고체 6종·다시 누른 관은 재생 없음,
 * 스트립이 누른 뒤 STRIP_WAIT_MS 안에 (디코드까지) 안 오면 건너뜀. 미리 받기 = 관에 hover·focus·pointerdown, 첫 획 뒤 유휴 시간에 앞쪽 6관.
 * 탭 ALL/POWDER/LIQUID/SOLID/GAS(44px), 옅은 재료(PALE)는 관 안 결 패턴, 이름 라벨은 모든 관에 항상(ink).
 * 재료 줄 = WAI-ARIA toolbar(P11): Tab 정지점 1개(로빙), 좌우 화살표·Home·End로 포커스, Enter/Space로 선택.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Material } from '@/lib/sand/materials'
import atlas from '../../../public/ui-next/posters/atlas.json'
import {
  PALE,
  RACK_TABS,
  STRIP_FRAMES,
  STRIP_MS,
  STRIP_WAIT_MS,
  rackOrder,
  rovingNext,
  rovingStop,
  shouldPour,
  tabOf,
  warmList,
  type RackTab,
} from './model'

const ATLAS_URL = '/ui-next/posters/atlas.webp'
/** 관 유리 안쪽 크기(px). 아틀라스 타일 96×192를 1/3로. */
const GLASS_W = 32
const GLASS_H = 64
const SCALE = GLASS_W / atlas.tile.w

type Tiles = Record<string, { x: number; y: number }>

const stripUrl = (slug: string) => `/ui-next/posters/strips/${slug}.webp`
/** 스트립 받기 상태(모듈 전역 — 랙이 다시 마운트돼도 같은 파일을 두 번 받지 않는다). */
const strips = new Map<string, Promise<void>>()
const loaded = new Set<string>()
function fetchStrip(slug: string): Promise<void> {
  let p = strips.get(slug)
  if (!p) {
    p = new Promise<void>((ok, bad) => {
      const img = new Image()
      img.decoding = 'async'
      // onload ≠ 디코드 끝 — 디코드 전에 재생하면 앞 프레임이 빈 칸으로 지나간다(리뷰)
      img.onload = () => {
        img
          .decode()
          .catch(() => {})
          .then(() => {
            loaded.add(slug)
            ok()
          })
      }
      img.onerror = () => {
        strips.delete(slug)
        bad(new Error(slug))
      }
      img.src = stripUrl(slug)
    })
    p.catch(() => {})
    strips.set(slug, p)
  }
  return p
}
function saveData(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
}
function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function Rack({
  materials,
  sel,
  erasing,
  onPick,
  warm = false,
}: {
  materials: readonly Material[]
  sel: string
  erasing: boolean
  onPick: (slug: string) => void
  /** 첫 획 뒤 true → 유휴 시간에 앞쪽 관 스트립을 미리 받는다(구경만 하는 방문자는 받지 않음). */
  warm?: boolean
}) {
  const [tab, setTab] = useState<RackTab>('all')
  const ordered = useMemo(() => rackOrder(materials), [materials])
  const shown = tab === 'all' ? ordered : ordered.filter((m) => tabOf(m) === tab)
  const tiles = atlas.tiles as Tiles
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // 한 번 붓기: 재생 중인 관과 회차(같은 관을 다시 골라도 애니메이션을 처음부터)
  const [pour, setPour] = useState<{ slug: string; n: number } | null>(null)
  const pourN = useRef(0)
  // 재생 중에 관이 사라지면(탭 전환) animationend가 안 온다 → 그대로 두면 돌아올 때 혼자 다시 붓는다(리뷰 차단, 재현함)
  const switchTab = (id: RackTab) => {
    pourN.current++
    setPour(null)
    setTab(id)
  }

  // 탭 목록 키보드(WAI-ARIA tabs): 선택된 탭만 Tab 정지점, 좌우 화살표·Home·End로 이동하며 바로 선택
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const to = rovingNext(e.key, i, RACK_TABS.length)
    if (to < 0) return
    e.preventDefault()
    switchTab(RACK_TABS[to].id)
    tabRefs.current[to]?.focus()
  }

  // 재료 툴바 로빙: 마지막으로 포커스한 관 → 선택된 관 → 맨 앞
  const [focused, setFocused] = useState<string | null>(null)
  // 다른 경로(장면 로드·Erase 해제)로 선택이 바뀌면 정지점도 선택을 따른다
  useEffect(() => setFocused(null), [sel])
  const shownSlugs = shown.map((m) => m.slug)
  const stop = rovingStop(shownSlugs, focused, sel)
  const tubeRefs = useRef(new Map<string, HTMLButtonElement>())
  const onTubeKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const to = rovingNext(e.key, i, shownSlugs.length)
    if (to < 0) return
    e.preventDefault()
    const slug = shownSlugs[to]
    setFocused(slug)
    const el = tubeRefs.current.get(slug)
    if (!el) return
    // iOS: scroll-snap 가로 줄에서 focus()만으로는 포커스한 관이 화면 밖에 남는다(WebKit 251003) — 직접 스크롤
    el.focus({ preventScroll: true })
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  const pick = useCallback(
    (slug: string) => {
      const already = !erasing && sel === slug
      onPick(slug)
      if (!shouldPour({ slug, already, reducedMotion: reducedMotion(), saveData: saveData() })) return
      const n = ++pourN.current
      const go = () => {
        if (pourN.current === n) setPour({ slug, n })
      }
      if (loaded.has(slug)) return go()
      const t0 = performance.now()
      fetchStrip(slug).then(
        () => {
          if (performance.now() - t0 <= STRIP_WAIT_MS) go()
        },
        () => {},
      )
    },
    [erasing, sel, onPick],
  )
  const prefetch = (slug: string) => {
    if (!saveData() && !reducedMotion() && shouldPour({ slug, already: false, reducedMotion: false, saveData: false })) fetchStrip(slug)
  }

  // 첫 획 뒤 유휴 시간에 앞쪽 관 미리 받기(받은 파일은 모듈 캐시 — 탭을 바꿔도 같은 파일을 다시 받지 않는다)
  const warmKey = warm ? warmList(shownSlugs, saveData()).join(',') : ''
  useEffect(() => {
    if (!warmKey || reducedMotion()) return
    const run = () => warmKey.split(',').forEach((s) => fetchStrip(s))
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 4000 })
      return () => w.cancelIdleCallback?.(id)
    }
    const id = window.setTimeout(run, 1500)
    return () => window.clearTimeout(id)
  }, [warmKey])

  return (
    <div className="sl-rack">
      <div className="sl-rack-tabs" role="tablist" aria-label="Material groups">
        {RACK_TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`sl-rack-tab-${t.id}`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            onKeyDown={(e) => onTabKey(e, i)}
            aria-controls="sl-rack-panel"
            className="sl-rack-tab"
            onClick={() => switchTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        id="sl-rack-panel"
        role="tabpanel"
        aria-labelledby={`sl-rack-tab-${tab}`}
        className="sl-rack-panel"
      >
        <div className="sl-rack-row" role="toolbar" aria-label="Material">
          {shown.map((m, i) => {
            const on = !erasing && sel === m.slug
            const t = tiles[m.slug]
            const pouring = pour?.slug === m.slug ? pour : null
            return (
              <button
                key={m.slug}
                ref={(el) => {
                  if (el) tubeRefs.current.set(m.slug, el)
                  else tubeRefs.current.delete(m.slug)
                }}
                type="button"
                aria-pressed={on}
                tabIndex={m.slug === stop ? 0 : -1}
                className="sl-tube-btn"
                data-on={on || undefined}
                onClick={() => pick(m.slug)}
                onKeyDown={(e) => onTubeKey(e, i)}
                onFocus={() => {
                  setFocused(m.slug)
                  prefetch(m.slug)
                }}
                onPointerEnter={() => prefetch(m.slug)}
                onPointerDown={() => prefetch(m.slug)}
              >
                <span className="sl-tube" data-pale={PALE.has(m.slug) || undefined}>
                  <span className="sl-tube-cork" aria-hidden="true" />
                  <span
                    className="sl-tube-glass"
                    aria-hidden="true"
                    style={
                      t
                        ? {
                            backgroundImage: `url(${ATLAS_URL})`,
                            backgroundSize: `${atlas.width * SCALE}px ${atlas.height * SCALE}px`,
                            backgroundPosition: `${-t.x * SCALE}px ${-t.y * SCALE}px`,
                          }
                        : { background: m.color }
                    }
                  >
                    {pouring && (
                      <span
                        key={pouring.n}
                        className="sl-tube-pour"
                        data-sl-pour={m.slug}
                        style={{ width: GLASS_W * STRIP_FRAMES, backgroundImage: `url(${stripUrl(m.slug)})`, animationDuration: `${STRIP_MS}ms` }}
                        onAnimationEnd={() => setPour((p) => (p && p.n === pouring.n ? null : p))}
                      />
                    )}
                  </span>
                </span>
                <span className="sl-tube-name">{m.name.toLowerCase()}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const TUBE_GLASS = { w: GLASS_W, h: GLASS_H }
