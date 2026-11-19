'use client'

import { useState } from 'react'
import type { Phase } from '@/lib/spill/play/controller'
import type { HudParts } from '@/lib/spill/client/view'
import { K, iconBtn } from './ui'

interface Props {
  id: string
  name: string
  parts: HudParts
  showMoves: boolean
  phase: Phase
  sound: boolean
  navCollapsed: boolean
  onSound(): void
  onPause(): void
}

const NAV = [
  { href: '/play', label: 'All levels' },
  { href: '/', label: 'Sandbox' },
  { href: '/learn', label: 'Learn' },
]

const svg = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

const Back = () => <svg {...svg}><path d="M15 5l-7 7 7 7" /></svg>
const Menu = () => <svg {...svg}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
const SoundOn = () => <svg {...svg}><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></svg>
const SoundOff = () => <svg {...svg}><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M17 9l4 6M21 9l-4 6" /></svg>
const Pause = () => <svg {...svg}><path d="M8 5v14M16 5v14" /></svg>
const Play = () => <svg {...svg}><path d="M8 5l11 7-11 7z" fill="currentColor" /></svg>

export default function Hud({ id, name, parts, showMoves, phase, sound, navCollapsed, onSound, onPause }: Props) {
  const [menu, setMenu] = useState(false)
  const running = phase === 'run' || phase === 'paused'
  const chip = { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: K.panel, border: `2px solid ${K.line}` } as const
  return (
    <header
      style={{
        height: 44, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px', borderBottom: `2px solid ${K.line}`,
        background: K.bg, color: K.ink, position: 'relative', zIndex: 5, fontSize: 14,
      }}
    >
      {navCollapsed ? (
        <button type="button" aria-label="Menu" aria-expanded={menu} style={iconBtn} onClick={() => setMenu((m) => !m)}><Menu /></button>
      ) : (
        <a href="/play" aria-label="All levels" style={{ ...iconBtn, textDecoration: 'none', padding: '0 8px', gap: 4, fontSize: 13 }}>
          <Back /> <span style={{ opacity: 0.75, fontWeight: 700 }}>Levels</span>
        </a>
      )}
      <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
        <span style={{ color: K.accentText, marginRight: 6 }}>{id}</span>
        {name}
      </h1>
      {showMoves && (
        <span data-testid="hud-moves" style={{ ...chip, marginLeft: 'auto' }}>
          <span style={{ color: parts.movesOver ? K.coralText : K.ink }}>{parts.moves}</span>
          {parts.par && (
            <span style={{ color: K.dim }}>
              {' · '}
              <span style={{ color: parts.movesOver || parts.timeOver ? K.coralText : undefined }}>{parts.par}</span>
            </span>
          )}
        </span>
      )}
      <span style={{ marginLeft: showMoves ? 0 : 'auto', display: 'flex' }}>
        <button type="button" aria-label={sound ? 'Mute sound' : 'Turn sound on'} aria-pressed={sound} style={iconBtn} onClick={onSound}>
          {sound ? <SoundOn /> : <SoundOff />}
        </button>
        <button
          type="button"
          aria-label={phase === 'paused' ? 'Resume' : 'Pause'}
          disabled={!running}
          style={{ ...iconBtn, opacity: running ? 1 : 0.3 }}
          onClick={onPause}
        >
          {phase === 'paused' ? <Play /> : <Pause />}
        </button>
      </span>
      {navCollapsed && menu && (
        <nav
          style={{
            position: 'absolute', top: 44, left: 4, background: K.panel, border: `2px solid ${K.line}`, borderRadius: K.r20,
            padding: 6, display: 'grid', minWidth: 180, boxShadow: '0 12px 30px rgba(59,42,26,0.25)',
          }}
        >
          {NAV.map((n) => (
            <a key={n.href} href={n.href} style={{ color: K.ink, fontWeight: 700, textDecoration: 'none', padding: '12px 14px', minHeight: 44, boxSizing: 'border-box' }}>
              {n.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
