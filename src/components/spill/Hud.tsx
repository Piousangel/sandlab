'use client'

import { useState } from 'react'
import type { Phase } from '@/lib/spill/play/controller'
import type { HudParts } from '@/lib/spill/client/view'
import { C, iconBtn } from './ui'

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

export default function Hud({ id, name, parts, showMoves, phase, sound, navCollapsed, onSound, onPause }: Props) {
  const [menu, setMenu] = useState(false)
  const running = phase === 'run' || phase === 'paused'
  return (
    <header
      style={{
        height: 44, display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px', borderBottom: `1px solid ${C.line}`,
        background: C.bg, position: 'relative', zIndex: 5, fontSize: 14,
      }}
    >
      {navCollapsed ? (
        <button type="button" aria-label="Menu" aria-expanded={menu} style={iconBtn} onClick={() => setMenu((m) => !m)}>☰</button>
      ) : (
        <a href="/play" aria-label="All levels" style={{ ...iconBtn, textDecoration: 'none', padding: '0 8px', gap: 6, fontSize: 15 }}>
          ← <span style={{ fontSize: 13, opacity: 0.75 }}>Levels</span>
        </a>
      )}
      <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
        <span style={{ opacity: 0.55, marginRight: 6 }}>{id}</span>
        {name}
      </h1>
      {showMoves && (
        <span data-testid="hud-moves" style={{ marginLeft: 'auto', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
          <span style={{ color: parts.movesOver ? C.red : C.text }}>{parts.moves}</span>
          {parts.par && (
            <span style={{ opacity: 0.75 }}>
              {' · '}
              <span style={{ color: parts.movesOver || parts.timeOver ? C.red : undefined }}>{parts.par}</span>
            </span>
          )}
        </span>
      )}
      <span style={{ marginLeft: showMoves ? 0 : 'auto', display: 'flex' }}>
        <button type="button" aria-label={sound ? 'Mute sound' : 'Turn sound on'} aria-pressed={sound} style={iconBtn} onClick={onSound}>
          {sound ? '🔊' : '🔇'}
        </button>
        <button
          type="button"
          aria-label={phase === 'paused' ? 'Resume' : 'Pause'}
          disabled={!running}
          style={{ ...iconBtn, opacity: running ? 1 : 0.3 }}
          onClick={onPause}
        >
          {phase === 'paused' ? '▶' : '⏸'}
        </button>
      </span>
      {navCollapsed && menu && (
        <nav
          style={{
            position: 'absolute', top: 44, left: 4, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12,
            padding: 6, display: 'grid', minWidth: 180, boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          }}
        >
          {NAV.map((n) => (
            <a key={n.href} href={n.href} style={{ color: C.text, textDecoration: 'none', padding: '12px 14px', minHeight: 44, boxSizing: 'border-box' }}>
              {n.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
