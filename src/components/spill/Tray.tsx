'use client'

import type { Verb } from '@/lib/spill/level/define'
import type { TrayVerb, RunAction } from '@/lib/spill/client/view'
import { C, pill } from './ui'

interface Props {
  height: number
  safeBottom: number
  verbs: TrayVerb[]
  selected: Verb | null
  run: { label: string; action: RunAction }
  runHighlight: boolean
  onVerb(v: Verb): void
  onRun(a: RunAction): void
}

export default function Tray({ height, safeBottom, verbs, selected, run, runHighlight, onVerb, onRun }: Props) {
  return (
    <div
      style={{
        height, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8,
        padding: `0 10px ${safeBottom}px`, borderTop: `1px solid ${C.line}`, background: C.bg,
      }}
    >
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: 1, minWidth: 0, scrollbarWidth: 'none' }}>
        {verbs.map((v) => {
          const mode = v.verb !== 'trigger'
          const out = v.left === 0
          return (
            <button
              key={v.verb}
              type="button"
              aria-pressed={mode ? selected === v.verb : undefined}
              style={pill(mode && selected === v.verb, out)}
              onClick={() => onVerb(v.verb)}
            >
              <span aria-hidden>{v.icon}</span>
              {v.label}
              {v.left !== null && <span style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{v.left}</span>}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        data-spill-run
        onClick={() => onRun(run.action)}
        style={{
          minHeight: 48, minWidth: 108, padding: '0 18px', borderRadius: 14, border: 0, fontSize: 16, fontWeight: 800, letterSpacing: 0.5,
          background: run.action === 'run' || run.action === 'next' ? C.accent : '#1d2533', color: run.action === 'run' || run.action === 'next' ? C.bg : C.text,
          cursor: 'pointer', boxShadow: runHighlight ? `0 0 0 3px rgba(245,166,35,0.45)` : 'none', touchAction: 'manipulation', whiteSpace: 'nowrap',
        }}
      >
        {run.label}
      </button>
    </div>
  )
}
