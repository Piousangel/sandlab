'use client'

/**
 * 새 Spill 플레이 HUD(리디자인 P4, S1 = A 라이트). 프리뷰 빌드(NEXT_PUBLIC_UI=next)에서만 shell/next.ts를 거쳐 들어온다.
 *
 * 크롬은 Bone 한 면, 보드 안쪽만 어두운 유리(kiln 테두리). 보드 위에는 아무것도 얹지 않는다 — 목표·보석은 위 목표 줄,
 * 도구(동사·Undo·Retry·속도·RUN)는 아래 트레이, 메시지·Watch는 진행 줄(보드 가림 0).
 * Ember는 화면당 주 행동 하나(RUN 버튼). 누르는 것은 전부 44×44 이상, 아이콘은 <Icon>만(이모지·기호 0).
 * 세로 예산은 chrome.ts(HUD)와 같다 — 여기 높이를 바꾸면 chrome.ts도 바꾼다.
 */
import { usePathname } from 'next/navigation'
import { useRef, type CSSProperties } from 'react'
import type { DockRow } from '@/lib/spill/client/dock'
import type { RunAction, TrayVerb } from '@/lib/spill/client/view'
import type { Verb } from '@/lib/spill/level/define'
import { hudLine } from '@/lib/spill/play/score'
import { Icon, IconSprite } from '../icons/Icon'
import type { IconName } from '../icons/icons'
import { MenuSheet } from '../shell/ShellHeader'
import type { SpillFrameProps, SpillHudKit } from '../shell/spillTypes'
import { HUD, spillChrome } from './chrome'

/** Retry 길게 누르기 = 전부 지우기(지금 HUD의 FloatButtons와 같은 600ms). */
export const LONG_PRESS_MS = 600

const VERB_ICON: Record<Verb, IconName> = { dig: 'dig', drop: 'pour', line: 'brush-size', trigger: 'lock' }

export function runFace(action: RunAction, watching: boolean): { icon: IconName; label: string; primary: boolean } {
  switch (action) {
    case 'run': return { icon: 'pour', label: 'Run', primary: true }
    case 'pause': return { icon: 'pause', label: 'Pause', primary: false }
    case 'resume': return { icon: 'pour', label: 'Resume', primary: true }
    case 'next': return { icon: 'next', label: 'Next', primary: true }
    case 'retry': return { icon: 'retry', label: watching ? 'Try it' : 'Retry', primary: true }
  }
}

export function SpillHeader({ badge, name, backHref, backLabel, sound, onSound, heading = true }: {
  badge: string | null
  name: string
  backHref: string
  backLabel: string
  sound: boolean
  onSound(): void
  /** 제목을 h1로 그릴지(데일리 시작 화면은 본문 제목이 h1이라 false). */
  heading?: boolean
}) {
  const pathname = usePathname()
  const T = heading ? 'h1' : 'p'
  return (
    <header className="sl-sp-hdr">
      <a href={backHref} className="sl-sp-icon" aria-label={backLabel}>
        <Icon name="back" />
      </a>
      <T className="sl-sp-title">
        <span className="sl-sp-name">{name}</span>
        {badge && <span className="sl-sp-badge">{badge}</span>}
      </T>
      <button type="button" className="sl-sp-icon" aria-label="Sound" aria-pressed={sound} onClick={onSound}>
        <Icon name={sound ? 'sound-on' : 'sound-off'} />
      </button>
      <MenuSheet pathname={pathname} sound={sound} onSound={onSound} />
    </header>
  )
}

function GoalChip({ row, flat }: { row: DockRow; flat?: boolean }) {
  const bad = row.kind === 'bad'
  const hit = bad && row.frac > 0
  const state = row.done ? 'done' : hit ? 'hit' : undefined
  const [name, mat] = row.label.split(' · ')
  return (
    <li className={flat ? 'sl-sp-goal sl-sp-goal-flat' : 'sl-sp-goal'} data-state={state} aria-label={`${row.label}, ${row.value}${row.done ? ', done' : ''}`}>
      <Icon name={row.done ? 'star-full' : bad ? 'info' : 'strata'} size={18} className="sl-sp-goal-i" />
      <span className="sl-sp-goal-l">
        {name}
        {mat && <span className="sl-sp-goal-m"> · {mat}</span>}
      </span>
      <span className="sl-sp-goal-v">{row.value}</span>
      <span className="sl-sp-goal-bar" aria-hidden style={{ '--f': row.frac } as CSSProperties} />
    </li>
  )
}

function GemChip({ got, total, flat }: { got: number; total: number; flat?: boolean }) {
  return (
    <li className={flat ? 'sl-sp-goal sl-sp-goal-flat' : 'sl-sp-goal'} data-state={got >= total ? 'done' : undefined} aria-label={`Gems ${got} of ${total}`}>
      <Icon name="gem" size={18} className="sl-sp-goal-i" />
      {flat && <span className="sl-sp-goal-l">Gems</span>}
      <span className="sl-sp-goal-v">
        {got}/{total}
      </span>
    </li>
  )
}

function Goals({ goals, gems, flat }: { goals: DockRow[]; gems: { got: number; total: number }; flat?: boolean }) {
  // 해골 항아리(피해야 할 것)를 앞에 — 지금 GoalDock과 같은 순서
  const rows = [...goals].sort((a, b) => Number(b.kind === 'bad') - Number(a.kind === 'bad'))
  return (
    // 가로 스크롤 목록은 키보드로도 스크롤되게 포커스를 받는다(axe scrollable-region-focusable)
    <ul className={flat ? 'sl-sp-goals-flat' : 'sl-sp-goals'} aria-label="Goals" tabIndex={flat ? undefined : 0}>
      {rows.map((r, k) => (
        <GoalChip key={k} row={r} flat={flat} />
      ))}
      {gems.total > 0 && <GemChip got={gems.got} total={gems.total} flat={flat} />}
    </ul>
  )
}

function RetryButton({ onRetry, onClearAll }: { onRetry(): void; onClearAll(): void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const long = useRef(false)
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  return (
    <button
      type="button"
      className="sl-sp-tool"
      aria-label="Retry (hold to clear all)"
      onPointerDown={() => {
        long.current = false
        cancel()
        timer.current = setTimeout(() => {
          long.current = true
          onClearAll()
        }, LONG_PRESS_MS)
      }}
      onPointerUp={() => {
        cancel()
        if (!long.current) onRetry()
      }}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onRetry()
        }
      }}
    >
      <Icon name="retry" />
    </button>
  )
}

function VerbButton({ v, selected, compact, onVerb }: { v: TrayVerb; selected: boolean; compact: boolean; onVerb(v: Verb): void }) {
  const mode = v.verb !== 'trigger'
  return (
    <button
      type="button"
      className="sl-sp-verb"
      data-on={mode && selected ? '1' : undefined}
      data-out={v.left === 0 ? '1' : undefined}
      aria-pressed={mode ? selected : undefined}
      aria-label={`${v.label}${v.left !== null ? `, ${v.left} left` : ''}`}
      onClick={() => onVerb(v.verb)}
    >
      <Icon name={VERB_ICON[v.verb]} />
      {!compact && <span>{v.label}</span>}
      {!compact && v.left !== null && <span className="sl-sp-verb-n">{v.left}</span>}
    </button>
  )
}

export function Frame(p: SpillFrameProps) {
  const l = p.layout
  const desk = l.desktop
  const frame = desk ? HUD.frameDesk : HUD.frame
  const face = runFace(p.run.action, p.run.watching)
  // 좁은 화면 + 동사 2개 이상이면 동사를 아이콘 44칸으로 접는다(라벨·남은 수는 접근 이름에) — 도구 줄이 한 줄에 들어가게(360 실측: Retry 라벨일 때 RUN이 가장 넓다)
  const compactVerbs = p.verbs.length > 1 && l.stageW < 420
  return (
    <div className="sl-spill" data-desk={desk ? '1' : undefined}>
      <IconSprite />
      <div className="sl-sp-main" onPointerDownCapture={p.onPointer} onPointerUpCapture={p.onPointer}>
        <SpillHeader badge={p.title.badge} name={p.title.name} backHref={p.title.backHref} backLabel={p.title.backLabel} sound={p.sound} onSound={p.onSound} />
        {!desk && (
          <div className="sl-sp-goalrow">
            <Goals goals={p.goals} gems={p.gems} />
          </div>
        )}
        <div className="sl-sp-stage" style={{ height: l.cssH + frame * 2 }}>
          <div className="sl-sp-glass" style={{ width: l.cssW + frame * 2, height: l.cssH + frame * 2, padding: frame }}>
            <div className="sl-sp-board" data-spill-board style={{ width: l.cssW, height: l.cssH }}>
              {p.board}
            </div>
          </div>
        </div>
        <div className="sl-sp-tray" style={{ height: Math.max(0, l.trayH - frame) + l.safeBottom, paddingBottom: HUD.padBottom + l.safeBottom }}>
          <div className="sl-sp-line" style={{ height: HUD.line }}>
            <div className="sl-sp-lt">
              {p.progress && (
                <span className="sl-sp-prog" data-testid="hud-moves" data-over={p.progress.over ? '1' : undefined}>
                  {hudLine(p.progress.moves, p.progress.par)}
                </span>
              )}
              <span className="sl-sp-msg" role="status" aria-live="polite" data-tone={p.message?.tone}>
                {p.message && (
                  <>
                    {p.message.tone === 'fail' && <Icon name="info" size={16} className="sl-sp-msg-i" />}
                    <span className="sl-sp-msg-t">{p.message.text}</span>
                  </>
                )}
              </span>
            </div>
            {p.onWatch && (
              <button type="button" className="sl-sp-watch" onClick={p.onWatch}>
                Watch
              </button>
            )}
          </div>
          <div className="sl-sp-tools" style={{ height: HUD.tools, visibility: p.toolsHidden ? 'hidden' : undefined }} data-compact={compactVerbs ? '1' : undefined}>
            <div className="sl-sp-verbs">
              {p.verbs.map((v) => (
                <VerbButton key={v.verb} v={v} selected={p.selected === v.verb} compact={compactVerbs} onVerb={p.onVerb} />
              ))}
            </div>
            <button type="button" className="sl-sp-tool" aria-label="Undo" disabled={!p.canUndo} onClick={p.onUndo}>
              <Icon name="undo" />
            </button>
            <RetryButton onRetry={p.onRetry} onClearAll={p.onClearAll} />
            <button type="button" className="sl-sp-tool sl-sp-speed" aria-label={`Speed ${p.speed}x`} disabled={!p.speedOn} onClick={p.onSpeed}>
              {p.speed}x
            </button>
            <button
              type="button"
              data-spill-run
              className="sl-sp-run"
              data-primary={face.primary ? '1' : undefined}
              data-glow={p.runHighlight ? '1' : undefined}
              onClick={() => p.onRun(p.run.action)}
            >
              <Icon name={face.icon} />
              <span>{face.label}</span>
            </button>
          </div>
        </div>
        {p.overlay}
      </div>
      <aside className="sl-sp-aside">
        {desk && (
          <section className="sl-sp-card" aria-label="Goal">
            <h2 className="sl-sp-card-h">Goal</h2>
            <Goals goals={p.goals} gems={p.gems} flat />
          </section>
        )}
        {p.aside}
      </aside>
    </div>
  )
}

export const SpillHud: SpillHudKit = { chrome: spillChrome, Frame }
