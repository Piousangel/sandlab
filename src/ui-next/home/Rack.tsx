'use client'

/**
 * 시험관 랙(S7) — 정지 포스터 아틀라스 1장(#67 실엔진 캡처, public/ui-next/posters/atlas.webp)을 관마다 잘라 쓴다.
 * 애니메이션 없음(선택된 관만 들림·마개 열림 = transform 한 번). 저사양·reduced-motion에서도 같은 비용.
 * 탭 ALL/POWDER/LIQUID/SOLID/GAS(44px), 옅은 재료(PALE)는 관 안 결 패턴, 이름 라벨은 모든 관에 항상(ink).
 */
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Material } from '@/lib/sand/materials'
import atlas from '../../../public/ui-next/posters/atlas.json'
import { PALE, RACK_TABS, rackOrder, tabOf, type RackTab } from './model'

const ATLAS_URL = '/ui-next/posters/atlas.webp'
/** 관 유리 안쪽 크기(px). 아틀라스 타일 96×192를 1/3로. */
const GLASS_W = 32
const GLASS_H = 64
const SCALE = GLASS_W / atlas.tile.w

type Tiles = Record<string, { x: number; y: number }>

export function Rack({
  materials,
  sel,
  erasing,
  onPick,
}: {
  materials: readonly Material[]
  sel: string
  erasing: boolean
  onPick: (slug: string) => void
}) {
  const [tab, setTab] = useState<RackTab>('all')
  const ordered = useMemo(() => rackOrder(materials), [materials])
  const shown = tab === 'all' ? ordered : ordered.filter((m) => tabOf(m) === tab)
  const tiles = atlas.tiles as Tiles
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  // 탭 목록 키보드(WAI-ARIA tabs): 선택된 탭만 Tab 정지점, 좌우 화살표·Home·End로 이동하며 바로 선택
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = RACK_TABS.length
    const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (to < 0) return
    e.preventDefault()
    setTab(RACK_TABS[to].id)
    tabRefs.current[to]?.focus()
  }

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
            onClick={() => setTab(t.id)}
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
        <div className="sl-rack-row" role="group" aria-label="Material">
          {shown.map((m) => {
            const on = !erasing && sel === m.slug
            const t = tiles[m.slug]
            return (
              <button
                key={m.slug}
                type="button"
                aria-pressed={on}
                className="sl-tube-btn"
                data-on={on || undefined}
                onClick={() => onPick(m.slug)}
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
                  />
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
