'use client'

/**
 * /play 전시실의 월드 카드 + 주 행동(리디자인 P8). 진행(별)은 이 브라우저 localStorage에만 있으므로 클라이언트에서 읽는다.
 * 정적 HTML은 "기록 없음" 상태로 그려지고(prod LevelList와 같은 방식), 마운트 뒤 별·잠금·주 행동 문구만 바뀐다 —
 * 칸 크기·줄 높이는 상태와 무관하게 고정이라 레이아웃 이동 0.
 * 썸네일은 scripts/gen-level-thumbs.mts가 구운 정적 PNG(라이브 캔버스 없음).
 */
import { useEffect, useMemo, useState } from 'react'
import { loadRecord } from '@/lib/spill/play/progress'
import { starCount } from '@/lib/spill/play/score'
import { Icon } from '../icons/Icon'
import type { PlayGalleryLevel } from '../shell/playTypes'
import { galleryWorlds, primaryAction, type GalleryCell } from './galleryModel'

/** 첫 화면(390에서 첫 줄 3칸)만 즉시 로드, 나머지는 lazy. */
const EAGER = 3

export function thumbSrc(id: string): string {
  return `/ui-next/levels/${id}.png`
}

export function PlayWorlds({ levels }: { levels: PlayGalleryLevel[] }) {
  const [stars, setStars] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState<{ world: number; text: string } | null>(null)

  useEffect(() => {
    const read = () => {
      const out: Record<string, number> = {}
      for (const l of levels) {
        const r = loadRecord(l.id)
        if (r) out[l.id] = starCount(r.stars)
      }
      setStars(out)
    }
    read()
    // 레벨을 깨고 뒤로가기로 돌아오면 bfcache 페이지가 그대로 보인다 — 그때 다시 읽는다(리뷰)
    const onShow = (e: PageTransitionEvent) => e.persisted && read()
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [levels])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2600)
    return () => clearTimeout(t)
  }, [msg])

  const worlds = useMemo(() => galleryWorlds(levels, (id) => stars[id] ?? 0), [levels, stars])
  const cta = primaryAction(worlds)
  let order = 0

  return (
    <>
      <a className="sl-pg-cta" href={cta.href} data-sl-pg-cta="">
        <span>{cta.label}</span>
        <Icon name="next" />
      </a>
      {worlds.map((w) => (
        <section key={w.world} className="sl-pg-world" aria-labelledby={`sl-pg-w${w.world}`}>
          <div className="sl-pg-wh">
            <h2 id={`sl-pg-w${w.world}`} className="sl-pg-lbl">
              World {w.world} · {w.name}
            </h2>
            <span className="sl-pg-rule" aria-hidden />
            <span className="sl-pg-lbl sl-pg-count">
              {w.got} / {w.total} stars
            </span>
          </div>
          <ol className="sl-pg-grid">
            {w.cells.map((c) => (
              <li key={c.id}>
                <Cell c={c} lock={w.lock} eager={order++ < EAGER} onLocked={() => setMsg({ world: w.world, text: w.lock })} />
              </li>
            ))}
            {Array.from({ length: w.soon }, (_, i) => (
              <li key={`soon-${i}`} className="sl-pg-soon">
                {/* 잠긴 칸(lock)과 다른 아이콘 — '별을 모으면 열린다'가 아니라 '아직 안 만들었다'(리뷰) */}
                <span className="sl-pg-soon-face" aria-hidden>
                  <Icon name="daily" size={18} />
                  <span className="sl-pg-lbl">Soon</span>
                </span>
                <span className="sl-pg-vh">More World {w.world} rooms are coming soon</span>
              </li>
            ))}
          </ol>
          {/* 잠긴 칸 안내는 그 월드 바로 아래(첫 화면 위쪽 한 곳이면 아래 월드에서 눌렀을 때 화면 밖에 뜬다 — 리뷰). 높이 예약 */}
          <p className="sl-pg-msg" role="status" aria-live="polite">
            {msg?.world === w.world ? msg.text : null}
          </p>
        </section>
      ))}
    </>
  )
}

function Cell({ c, lock, eager, onLocked }: { c: GalleryCell; lock: string; eager: boolean; onLocked(): void }) {
  const body = (
    <>
      <span className="sl-pg-glass">
        <img
          src={thumbSrc(c.id)}
          width={160}
          height={240}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
        />
        {!c.open && (
          <span className="sl-pg-lock" aria-hidden>
            <Icon name="lock" size={22} />
          </span>
        )}
      </span>
      <span className="sl-pg-name">
        <span className="sl-pg-n">{c.id}</span> {c.name}
      </span>
      <span className="sl-pg-beads" aria-hidden>
        {[0, 1, 2].map((i) => (
          <Icon key={i} name={i < c.stars ? 'star-full' : 'star-empty'} size={20} />
        ))}
      </span>
    </>
  )
  if (!c.open)
    return (
      <button type="button" className="sl-pg-card is-locked" aria-label={`${c.id} ${c.name}, locked. ${lock}`} onClick={onLocked}>
        {body}
      </button>
    )
  return (
    <a className="sl-pg-card" href={`/play/${c.id}`} aria-label={`${c.id} ${c.name}, ${c.stars} of 3 stars`} data-stars={c.stars}>
      {body}
    </a>
  )
}
