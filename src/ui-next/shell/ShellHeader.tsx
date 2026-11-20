'use client'

/**
 * 새 셸 헤더(P3) — wordmark · 내비 4동사 · 데일리 모래시계 pill · 메뉴 시트.
 * 프리뷰 빌드(NEXT_PUBLIC_UI=next)에서만 shell/next.ts를 거쳐 들어온다. prod(classic)에는 이 모듈이 없다.
 *
 * - 좁은 화면(< 840px — 720에서는 가운데 내비와 pill 사이 여유가 8px 안팎이라 올림, 독립 리뷰)에서는 내비가 숨고 메뉴 시트 안에 같은 링크가 있다(SSR HTML에는 둘 다 있다).
 * - 누르는 것은 전부 44×44 이상(S9), 포커스 링은 --sl-focus.
 * - 아이콘은 <Icon>만(R8, pnpm lint:ui).
 * - 프리뷰 읽기 전용 안내(ReadOnlyNote): 헤더 아래 한 줄 + 메뉴 시트 안 한 줄(Spill 화면은 헤더 없이 메뉴 시트만 쓴다).
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { loadSoundPref, saveSoundPref } from '@/lib/spill/render/audio'
import { Icon, IconSprite } from '../icons/Icon'
import { DAILY_HREF, MENU_LINKS, NAV, isActive, type ShellLink } from './nav'
import { SSR_PILL, pillText, type PillText } from './dailyPill'
import { ReadOnlyNote } from './ReadOnlyNote'

/** 첫 방문 wordmark 낙하: 이 키가 없을 때만 한 번. reduced-motion이면 아예 시작하지 않는다(CSS도 한 번 더 막는다). */
const WM_KEY = 'sl.wordmark.v1'
// 파싱 중에 동기 실행 — wordmark가 그려지기 전에 html에 표시를 단다(마운트 뒤에 달면 글자가 보였다가 다시 떨어진다).
const WM_SCRIPT = `try{if(!localStorage.getItem('${WM_KEY}')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('data-sl-wm','drop')}catch(e){}`
const LETTERS = 'SANDLAB'.split('')

function NavLink({ link, className, current, onClick }: { link: ShellLink; className: string; current: boolean; onClick?: () => void }) {
  const props = { className, 'aria-current': current ? ('page' as const) : undefined, onClick }
  return link.doc ? (
    <Link href={link.href} {...props}>
      {link.label}
    </Link>
  ) : (
    <a href={link.href} {...props}>
      {link.label}
    </a>
  )
}

function Wordmark() {
  useEffect(() => {
    const html = document.documentElement
    if (html.getAttribute('data-sl-wm') !== 'drop') return
    try {
      localStorage.setItem(WM_KEY, '1')
    } catch {
      /* 쓰기만 막힌 경우 매 방문 낙하(무해). 읽기부터 막히면 인라인 스크립트가 catch로 빠져 낙하 자체가 없다 */
    }
    // 애니메이션(최대 ~700ms)이 끝나면 표시를 뗀다 — 클라이언트 이동으로 헤더가 다시 그려져도 반복하지 않게
    const t = window.setTimeout(() => html.removeAttribute('data-sl-wm'), 1200)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: WM_SCRIPT }} />
      <a href="/" className="sl-wm" aria-label="Sandlab home">
        <span className="sl-wm-word" aria-hidden="true">
          {LETTERS.map((ch, i) => (
            <span key={i} className="sl-wm-l" style={{ animationDelay: `${i * 45}ms` }}>
              {ch}
            </span>
          ))}
          <span className="sl-wm-grain" />
        </span>
      </a>
    </>
  )
}

function DailyPill() {
  const [t, setT] = useState<PillText>(SSR_PILL)
  useEffect(() => {
    const tick = () => setT(pillText(Date.now()))
    tick()
    const id = window.setInterval(tick, 15_000)
    const onVis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return (
    <a href={DAILY_HREF} className="sl-hit sl-pill-hit" aria-label={t.label}>
      <span className="sl-pill">
        <Icon name="daily" size={16} />
        <span className="sl-pill-t">
          {t.no}
          {t.left && <span className="sl-pill-left"> · {t.left}</span>}
        </span>
      </span>
    </a>
  )
}

/**
 * 메뉴 시트. Spill 화면(P4)도 재사용한다 — 그때는 소리 상태를 화면이 가진 SpillAudio와 맞추려고
 * `sound`·`onSound`를 넘긴다(제어 모드). 안 넘기면 저장된 설정(spill.v1.sound)을 직접 읽고 쓴다.
 */
export function MenuSheet({ pathname, sound: soundProp, onSound }: { pathname: string | null; sound?: boolean; onSound?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  // 소리 설정은 Spill 화면과 같은 키(spill.v1.sound). SSR에는 기본값(켜짐)을 그리고 마운트 뒤 실제 값을 읽는다.
  const [soundOwn, setSound] = useState(true)
  useEffect(() => setSound(loadSoundPref()), [])
  const sound = soundProp ?? soundOwn

  const close = useCallback(() => ref.current?.close(), [])
  const show = () => {
    const d = ref.current
    if (!d || d.open) return
    setSound(loadSoundPref())
    d.showModal() // 모달 dialog: 바깥은 inert(포커스 가둠), Esc = cancel → close
    setOpen(true)
    document.documentElement.classList.add('sl-lock')
  }
  useEffect(() => {
    const d = ref.current
    if (!d) return
    const onClose = () => {
      setOpen(false)
      document.documentElement.classList.remove('sl-lock')
      btnRef.current?.focus()
    }
    d.addEventListener('close', onClose)
    return () => {
      d.removeEventListener('close', onClose)
      document.documentElement.classList.remove('sl-lock')
    }
  }, [])

  const toggleSound = () => {
    if (onSound) return onSound()
    const next = !sound
    saveSoundPref(next)
    setSound(next)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="sl-hit sl-icon-btn"
        aria-label="Menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="sl-menu"
        onClick={show}
      >
        <Icon name="menu" />
      </button>
      <dialog
        ref={ref}
        id="sl-menu"
        className="sl-sheet"
        aria-label="Menu"
        // 바깥(백드롭) 클릭으로 닫기 — 시트 안쪽 클릭은 target이 dialog가 아니다
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="sl-sheet-in">
          <div className="sl-sheet-top">
            <span className="sl-sheet-title">Menu</span>
            <button type="button" className="sl-hit sl-text-btn" onClick={close}>
              Close
            </button>
          </div>
          <nav aria-label="Sections">
            <ul className="sl-sheet-nav">
              {NAV.map((l) => (
                <li key={l.href}>
                  <NavLink link={l} className="sl-sheet-link sl-sheet-link-big" current={isActive(pathname, l.href)} onClick={close} />
                </li>
              ))}
              <li>
                <a href={DAILY_HREF} className="sl-sheet-link sl-sheet-link-big" aria-current={isActive(pathname, DAILY_HREF) ? 'page' : undefined}>
                  Daily
                </a>
              </li>
            </ul>
          </nav>
          <div className="sl-sheet-rule" />
          <button type="button" className="sl-sheet-link sl-sound" aria-pressed={sound} onClick={toggleSound}>
            <Icon name={sound ? 'sound-on' : 'sound-off'} />
            <span>Sound</span>
            <span className="sl-sound-state">{sound ? 'On' : 'Off'}</span>
          </button>
          <ReadOnlyNote className="sl-ro-sheet" />
          <ul className="sl-sheet-links">
            {MENU_LINKS.map((l) => (
              <li key={l.href}>
                <NavLink link={l} className="sl-sheet-link" current={isActive(pathname, l.href)} onClick={close} />
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  )
}

export function ShellHeader() {
  const pathname = usePathname()
  return (
    <>
      <header className="sl-shell sl-hdr" data-sl-shell="header">
        <IconSprite />
        <Wordmark />
        <nav className="sl-nav" aria-label="Main">
          {NAV.map((l) => (
            <NavLink key={l.href} link={l} className="sl-nav-link" current={isActive(pathname, l.href)} />
          ))}
        </nav>
        <div className="sl-hdr-end">
          <DailyPill />
          <MenuSheet pathname={pathname} />
        </div>
      </header>
      {/* 프리뷰 빌드(NEXT_PUBLIC_READ_ONLY=1)만 — 워커가 쓰기를 403으로 막는다는 안내. prod·로컬 기본은 null */}
      <ReadOnlyNote />
    </>
  )
}
