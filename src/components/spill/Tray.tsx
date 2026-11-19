'use client'

import type { ReactNode } from 'react'
import type { Verb } from '@/lib/spill/level/define'
import type { TrayVerb, RunAction } from '@/lib/spill/client/view'
import { K, pill } from './ui'

interface Props {
  height: number
  safeBottom: number
  verbs: TrayVerb[]
  selected: Verb | null
  run: { label: string; action: RunAction }
  runHighlight: boolean
  onVerb(v: Verb): void
  onRun(a: RunAction): void
  dock?: ReactNode
}

export const TRAY_ROW = 62
export const RUN_CENTER_Y = 7 + 24

export default function Tray({ height, safeBottom, verbs, selected, run, runHighlight, onVerb, onRun, dock }: Props) {
  return (
    <div
      style={{
        height, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
        padding: `0 0 ${safeBottom}px`, borderTop: `2px solid ${K.line}`, background: K.bg, color: K.ink,
      }}
    >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px 0', flexShrink: 0 }}>
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
          minHeight: 48, minWidth: 108, padding: '0 18px', borderRadius: 999, border: 0, fontSize: 17, fontWeight: 800, letterSpacing: 0.5,
          background: run.action === 'run' || run.action === 'next' ? K.accent : K.panel, color: K.ink,
          cursor: 'pointer', boxShadow: `${run.action === 'run' || run.action === 'next' ? '0 4px 0 ' + K.accentDeep : K.lift}${runHighlight ? ', 0 0 0 4px rgba(242,138,27,0.4)' : ''}`, touchAction: 'manipulation', whiteSpace: 'nowrap',
        }}
      >
        {run.label}
      </button>
    </div>
    {dock}
    </div>
  )
}
