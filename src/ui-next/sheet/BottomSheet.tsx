'use client'

/**
 * 사이트 공통 하단 시트(오너 11-20 "손잡이를 끌어 닫을 수 없고 배경 탭만 된다 — 모든 부분을 사용자 친화적으로").
 * 허브 공통 BottomSheet(minigames-hub #218)를 Glass & Grain 모양으로 옮긴 것. 새 모달은 이것 하나로 연다(docs/team/UX-CHECKLIST.md 2항).
 *
 * 닫는 길 6개가 모두 같은 퇴장 모션·같은 onClose로 모인다: 손잡이 끌기(25% 또는 튕김) · 손잡이 탭/Enter/Space ·
 * 배경 탭 · Esc · 브라우저 뒤로 가기(열 때 history 칸 1개) · 시트 안 닫기 버튼(api.close).
 * - 끌기: Pointer Events. 손잡이는 언제나, 내용 영역은 터치·펜이고 안쪽 스크롤이 맨 위일 때 아래로 끌면만(스크롤과 충돌 없음).
 *   768px 이상은 카드(가운데 또는 메뉴 자리)라 끌기 없음·손잡이 숨김 — 내용에 닫기 버튼을 둔다.
 * - 배경 스크롤 잠금: html overflow hidden + 배경·경계의 touchmove 차단(iOS 고무줄 스크롤까지). body를 fixed로 바꾸지 않는다.
 * - 포커스: 열면 시트로, Tab 가둠, 닫히면 연 자리로 복귀. 배경은 inert.
 * - 키보드: visualViewport로 가린 높이만큼 시트를 올리고, 포커스된 입력을 보이게 스크롤.
 * - 모션: 열기 280ms·닫기 240ms·복귀 300ms, iOS 감속 곡선(--sl-ease-sheet). 모션 줄이기면 즉시.
 * 허브 리뷰에서 고친 함정을 처음부터 반영: 닫기 연타로 history.back 두 번(closing), 다른 페이지로 바꿔 끼울 때 스크롤 복원(leaving),
 * touchmove 첫 1~2px 흔들림(4px 누적), 열리는 애니메이션 중 닫기·끌기(애니메이션 취소), 한글 조합 중 Esc(isComposing).
 * 시트 안에서 URL을 바꾸는 화면(홈 공유)은 열린 동안 바꾸지 말고 onClose에서 바꾼다 — 시트 칸의 URL을 바꾸면 닫을 때 history.back이 옛 URL로 되돌린다.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CLOSE_MS, DRAG_SLOP, SPRING_MS, dimOpacity, dragOffset, keyboardInset, releaseVelocity, shouldDismiss, type Sample } from './sheetGesture'

/** 시트 안 내용이 닫기·history를 다룰 때 받는 손잡이. */
export interface SheetApi {
  /** UI로 닫기(손잡이·닫기 버튼·Esc와 같은 길). after는 시트가 완전히 닫히고 스크롤 잠금이 풀린 뒤 실행(페이지 이동은 여기서). */
  close: (after?: () => void) => void
  /**
   * 시트가 넣은 history 칸이 맨 위에 있으면 그 칸을 내준다(true) — 호출한 쪽이 그 칸을 다른 주소로 바꿔 끼울 때.
   * 그 뒤 시트는 history를 건드리지 않고, 닫힐 때 스크롤을 되돌리지 않는다.
   */
  takeHistory: () => boolean
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const NO_DRAG = 'input, textarea, select, [contenteditable="true"], [data-sheet-nodrag]'
/** 이 폭 이상은 카드(끌기 없음). shell.css의 @media (min-width: 768px)와 같은 값. */
export const SHEET_DESKTOP = '(min-width: 768px)'

const isVisible = (n: HTMLElement) => (typeof n.checkVisibility === 'function' ? n.checkVisibility() : true)
const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isDesktop = () => typeof window.matchMedia === 'function' && window.matchMedia(SHEET_DESKTOP).matches

export function BottomSheet({
  open,
  onClose,
  labelledBy,
  label,
  id,
  historyMark = '__slSheet',
  placement = 'center',
  className = '',
  keepMounted = false,
  children,
}: {
  open: boolean
  onClose: () => void
  labelledBy?: string
  label?: string
  /** 패널 id(여는 버튼의 aria-controls). */
  id?: string
  /** history.state에 남기는 표식(시트마다 다르게). */
  historyMark?: string
  /** 768px 이상에서의 자리: 'center' = 가운데 카드, 'menu' = 헤더 메뉴 버튼 아래 오른쪽. */
  placement?: 'center' | 'menu'
  /** 패널에 더할 클래스(폭 등). 모양·배경·여백은 공통. */
  className?: string
  /** 닫혀 있을 때도 내용을 hidden으로 그린다(SSR HTML에 메뉴 링크를 남기려고 — 예전 닫힌 <dialog>와 같은 효과). */
  keepMounted?: boolean
  children: ReactNode | ((api: SheetApi) => ReactNode)
}) {
  const [mounted, setMounted] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const pushed = useRef(false)
  const exiting = useRef(false)
  const afterRef = useRef<(() => void) | undefined>(undefined)
  const closing = useRef(false) // close() 연타로 history.back()이 두 번 불려 이전 페이지까지 빠지지 않게
  const leaving = useRef(false) // takeHistory 뒤(다른 주소로 바꿔 끼움): 닫힐 때 스크롤을 되돌리지 않는다
  const springTimer = useRef(0)
  const gesture = useRef<{ id: number; x0: number; y0: number; onHandle: boolean; dragging: boolean; offset: number; samples: Sample[] } | null>(null)
  const suppressClick = useRef(false)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  useEffect(() => setMounted(true), [])

  const ours = useCallback(() => pushed.current && !!(window.history.state as Record<string, unknown> | null)?.[historyMark], [historyMark])

  /** 퇴장 모션 → onClose. 이미 시작했으면 무시. */
  const startExit = useCallback(() => {
    if (exiting.current) return
    exiting.current = true
    window.clearTimeout(springTimer.current)
    const root = rootRef.current
    const panel = panelRef.current
    const dim = dimRef.current
    if (root) root.dataset.state = 'closing'
    // 열리는 애니메이션 중이면 끊는다(animation이 인라인·transition보다 우선이라 퇴장이 순간이동이 된다)
    panel?.getAnimations?.().forEach((a) => a.cancel())
    dim?.getAnimations?.().forEach((a) => a.cancel())
    // 끌던 자리에서 이어서 내려가도록: 인라인 transform을 지우면 CSS(closing)의 transition이 그 자리부터 이어받는다
    if (panel) {
      panel.style.transition = ''
      panel.style.transform = ''
    }
    if (dim) {
      dim.style.transition = ''
      dim.style.opacity = ''
    }
    const ms = reducedMotion() ? 0 : CLOSE_MS
    window.setTimeout(() => onCloseRef.current(), ms)
  }, [])

  const close = useCallback(
    (after?: () => void) => {
      if (after) afterRef.current = after
      if (exiting.current || closing.current) return
      closing.current = true
      if (ours()) {
        window.history.back() // popstate가 startExit
        return
      }
      pushed.current = false
      startExit()
    },
    [ours, startExit],
  )

  const takeHistory = useCallback(() => {
    if (!ours()) return false
    pushed.current = false
    leaving.current = true
    return true
  }, [ours])

  // 열림: history 칸·Esc·Tab 가둠·스크롤 잠금·inert·키보드
  useEffect(() => {
    if (!open || !mounted) return
    exiting.current = false
    closing.current = false
    leaving.current = false
    const root = rootRef.current
    const panel = panelRef.current
    if (root) delete root.dataset.state
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panel?.focus({ preventScroll: true })
    try {
      window.history.pushState({ ...(window.history.state ?? {}), [historyMark]: 1 }, '')
      pushed.current = true
    } catch {
      pushed.current = false
    }
    const onPop = () => {
      if (!pushed.current) return
      pushed.current = false
      startExit()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.isComposing) {
        e.preventDefault()
        e.stopPropagation()
        close()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => !n.closest('[hidden], [inert], [aria-hidden="true"]') && isVisible(n))
      if (!items.length) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    // 배경 스크롤 잠금. 클래식 스크롤바(윈도)면 gutter를 남겨 배경이 옆으로 밀리지 않게.
    const html = document.documentElement
    const prev = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter }
    const sbw = window.innerWidth - html.clientWidth
    html.style.overflow = 'hidden'
    if (sbw > 0) html.style.scrollbarGutter = 'stable'
    const y0 = window.scrollY

    // iOS: overflow hidden만으로는 배경(어둠)·시트 경계에서 문서가 고무줄처럼 끌린다 → touchmove를 막는다.
    // 시트 안 스크롤은 그대로, 맨 위에서 아래로·맨 아래에서 위로처럼 문서로 번질 움직임만 막는다(맨 위에서 아래로는 끌어 닫기가 이어받는다).
    let x0 = 0
    let ys = 0
    const onTouchStart = (e: TouchEvent) => {
      x0 = e.touches[0]?.clientX ?? 0
      ys = e.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (e: TouchEvent) => {
      // 터치 시작부터의 누적 이동으로 판단(첫 1~2px 흔들림으로 손짓 전체를 막지 않게)
      const dy = (e.touches[0]?.clientY ?? ys) - ys
      const dx = (e.touches[0]?.clientX ?? x0) - x0
      if (!e.cancelable) return
      const t = e.target as Node
      if (!panel || !panel.contains(t)) {
        e.preventDefault()
        return
      }
      if (gesture.current?.dragging) {
        e.preventDefault()
        return
      }
      if ((t as Element).closest?.(NO_DRAG)) return // 입력칸 안의 커서 옮기기·글 선택
      if (Math.abs(dy) < 4 || Math.abs(dx) > Math.abs(dy)) return // 아직 방향 모름·가로 손짓
      const canScroll = panel.scrollHeight > panel.clientHeight + 1
      const atTop = panel.scrollTop <= 0
      const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1
      if (!canScroll || (dy > 0 && atTop) || (dy < 0 && atBottom)) e.preventDefault()
    }

    // 화면 키보드: 가린 만큼 시트를 올리고 높이를 줄인다
    const vv = window.visualViewport
    const onViewport = () => {
      if (!vv || !root) return
      const kb = keyboardInset(window.innerHeight, vv.height, vv.offsetTop, vv.scale)
      root.style.setProperty('--sl-sheet-kb', `${kb}px`)
      root.style.setProperty('--sl-sheet-vh', kb ? `${Math.round(vv.height)}px` : '')
    }
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement
      if (!t.matches?.('input, textarea, select, [contenteditable="true"]')) return
      // 키보드가 올라오는 시간을 기다렸다가 입력이 시트 안에서 보이게
      window.setTimeout(() => t.scrollIntoView?.({ block: 'nearest' }), 320)
    }

    // 배경을 inert로: 스크린 리더가 시트 밖으로 나가지 않게(iOS VoiceOver는 aria-modal만으로 부족)
    const inerted = [...document.body.children].filter((n): n is HTMLElement => n instanceof HTMLElement && n !== root && !n.hasAttribute('inert'))
    inerted.forEach((n) => n.setAttribute('inert', ''))

    window.addEventListener('popstate', onPop)
    document.addEventListener('keydown', onKey, true)
    root?.addEventListener('touchstart', onTouchStart, { passive: true })
    root?.addEventListener('touchmove', onTouchMove, { passive: false })
    panel?.addEventListener('focusin', onFocusIn)
    vv?.addEventListener('resize', onViewport)
    vv?.addEventListener('scroll', onViewport)
    onViewport()
    return () => {
      window.removeEventListener('popstate', onPop)
      document.removeEventListener('keydown', onKey, true)
      root?.removeEventListener('touchstart', onTouchStart)
      root?.removeEventListener('touchmove', onTouchMove)
      panel?.removeEventListener('focusin', onFocusIn)
      vv?.removeEventListener('resize', onViewport)
      vv?.removeEventListener('scroll', onViewport)
      html.style.overflow = prev.overflow
      html.style.scrollbarGutter = prev.gutter
      if (!leaving.current && Math.abs(window.scrollY - y0) > 1) window.scrollTo(0, y0)
      inerted.forEach((n) => n.removeAttribute('inert'))
      // UI 밖 이유로 닫혔다(부모가 open=false): 우리가 넣은 history 칸이 맨 위에 남아 있으면 빼서 '뒤로 가기 두 번'을 막는다
      if (ours()) window.history.back()
      pushed.current = false
      returnTo?.focus?.({ preventScroll: true })
      const after = afterRef.current
      afterRef.current = undefined
      if (after) window.setTimeout(after, 0)
    }
  }, [open, mounted, historyMark, close, startExit, ours])

  // 끌어 닫기(Pointer Events)
  useEffect(() => {
    if (!open || !mounted) return
    const panel = panelRef.current
    const dim = dimRef.current
    if (!panel) return

    const springBack = () => {
      const ms = reducedMotion() ? 0 : SPRING_MS
      panel.style.transition = ms ? `transform ${ms}ms var(--sl-ease-sheet)` : 'none'
      panel.style.transform = ''
      if (dim) {
        dim.style.transition = ms ? `opacity ${ms}ms var(--sl-ease-sheet)` : 'none'
        dim.style.opacity = ''
      }
      panel.dataset.drag = 'settling'
      window.clearTimeout(springTimer.current)
      springTimer.current = window.setTimeout(() => {
        if (exiting.current) return
        panel.style.transition = ''
        if (dim) dim.style.transition = ''
        delete panel.dataset.drag
      }, ms)
    }

    const onDown = (e: PointerEvent) => {
      if (exiting.current || isDesktop() || e.button !== 0 || !e.isPrimary) return
      const target = e.target as Element
      const onHandle = !!handleRef.current?.contains(target)
      // 마우스는 손잡이에서만(내용 영역은 글 선택·클릭이 먼저). 입력칸에서는 끌기를 시작하지 않는다.
      if (!onHandle && (e.pointerType === 'mouse' || target.closest(NO_DRAG))) return
      gesture.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, onHandle, dragging: false, offset: 0, samples: [{ t: e.timeStamp, y: e.clientY }] }
    }
    const onMove = (e: PointerEvent) => {
      const g = gesture.current
      if (!g || e.pointerId !== g.id) return
      const dx = e.clientX - g.x0
      const dy = e.clientY - g.y0
      if (!g.dragging) {
        if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return
        // 아래로, 세로가 주된 움직임, 그리고 손잡이이거나 안쪽 스크롤이 맨 위일 때만 끌기. 아니면 스크롤·가로 손짓에 맡긴다.
        if (dy > 0 && Math.abs(dy) > Math.abs(dx) && (g.onHandle || panel.scrollTop <= 0)) {
          g.dragging = true
          g.y0 += DRAG_SLOP // 판정 거리만큼은 빼고 따라온다(튀지 않게)
          try {
            panel.setPointerCapture(e.pointerId)
          } catch {
            /* 이미 놓은 포인터 */
          }
          window.clearTimeout(springTimer.current)
          panel.getAnimations?.().forEach((a) => a.cancel()) // 열리는 중에 잡아도 손가락을 따라오게
          panel.style.transition = 'none'
          if (dim) dim.style.transition = 'none'
          panel.dataset.drag = 'dragging'
        } else {
          gesture.current = null
          return
        }
      }
      e.preventDefault()
      g.offset = dragOffset(e.clientY - g.y0)
      g.samples.push({ t: e.timeStamp, y: e.clientY })
      if (g.samples.length > 12) g.samples.shift()
      panel.style.transform = `translate3d(0, ${g.offset}px, 0)`
      if (dim) dim.style.opacity = String(dimOpacity(g.offset, panel.offsetHeight))
    }
    const finish = (e: PointerEvent, cancelled: boolean) => {
      const g = gesture.current
      if (!g || e.pointerId !== g.id) return
      gesture.current = null
      if (!g.dragging) return
      suppressClick.current = true // 끌기 끝의 click이 손잡이·버튼을 누르지 않게
      window.setTimeout(() => (suppressClick.current = false), 0)
      // 손을 떼기 직전에 멈춰 있었다면(STILL_MS) 튕김이 아니다
      const v = releaseVelocity(g.samples, e.timeStamp)
      if (!cancelled && shouldDismiss(g.offset, panel.offsetHeight, v)) {
        delete panel.dataset.drag
        close()
      } else springBack()
    }
    const onUp = (e: PointerEvent) => finish(e, false)
    const onCancel = (e: PointerEvent) => finish(e, true)
    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick.current) return
      suppressClick.current = false
      e.preventDefault()
      e.stopPropagation()
    }
    panel.addEventListener('pointerdown', onDown)
    panel.addEventListener('pointermove', onMove)
    panel.addEventListener('pointerup', onUp)
    panel.addEventListener('pointercancel', onCancel)
    panel.addEventListener('click', onClickCapture, true)
    return () => {
      panel.removeEventListener('pointerdown', onDown)
      panel.removeEventListener('pointermove', onMove)
      panel.removeEventListener('pointerup', onUp)
      panel.removeEventListener('pointercancel', onCancel)
      panel.removeEventListener('click', onClickCapture, true)
      gesture.current = null
    }
  }, [open, mounted, close])

  const api: SheetApi = { close, takeHistory }
  const body = typeof children === 'function' ? children(api) : children

  if (!open || !mounted) {
    // 닫힘: 아무것도 안 그리거나(기본), 내용을 hidden으로(SSR HTML·크롤러용). 하이드레이션 전후가 같은 모양이어야 한다.
    return keepMounted ? (
      <div id={id} hidden data-sheet-closed="">
        {body}
      </div>
    ) : null
  }

  return createPortal(
    <div ref={rootRef} className="sl-sheet-root" data-place={placement}>
      <div ref={dimRef} aria-hidden="true" className="sl-sheet-dim" data-testid="sheet-dim" onClick={() => close()} />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
        className={`sl-sheet ${className}`}
      >
        {/* 손잡이: 끌어 닫기 + 그 자체로 닫기 버튼(44px 높이, Enter/Space). 768px 이상 카드에서는 숨김 */}
        <button ref={handleRef} type="button" aria-label="Close" className="sl-sheet-handle" data-testid="sheet-handle" onClick={() => close()}>
          <span aria-hidden="true" className="sl-sheet-handle-bar" />
        </button>
        {body}
      </div>
    </div>,
    document.body,
  )
}
