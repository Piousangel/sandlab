'use client'

import { dockSummary, type DockRow } from '@/lib/spill/client/dock'
import { K } from './ui'

interface Props {
  rows: DockRow[]
  gems: { got: number; total: number }
  par: string | null
  over: boolean
  compact: boolean
}

/** 원형 진행 링 + 가운데 모양(색만으로 구분하지 않음: 체크·해골·점). */
function Ring({ frac, done, bad }: { frac: number; done: boolean; bad: boolean }) {
  const r = 11
  const c = 2 * Math.PI * r
  const color = bad ? K.coral : done ? K.green : K.blue
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="15" cy="15" r={r} fill="none" stroke={K.line} strokeWidth="4" />
      <circle
        cx="15" cy="15" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${c * Math.min(1, Math.max(0, frac))} ${c}`} transform="rotate(-90 15 15)"
        style={{ transition: 'stroke-dasharray 120ms linear' }}
      />
      {bad ? (
        <path d="M11 11l8 8M19 11l-8 8" stroke={K.coral} strokeWidth="2.4" strokeLinecap="round" />
      ) : done ? (
        <path d="M10.5 15.5l3 3 6-6.5" fill="none" stroke={K.green} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <circle cx="15" cy="15" r="3" fill={color} />
      )}
    </svg>
  )
}

const chipBase = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px 4px 6px', borderRadius: 999, background: K.panel,
  boxSizing: 'border-box', minHeight: 40, fontSize: 13, fontWeight: 700, color: K.ink, whiteSpace: 'nowrap',
} as const

export default function GoalDock({ rows, gems, par, over, compact }: Props) {
  if (compact) {
    const hit = rows.some((r) => r.kind === 'bad' && r.frac > 0)
    return (
      <div aria-label="Goals" style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', fontSize: 13, color: K.dim, whiteSpace: 'nowrap', overflow: 'hidden', fontWeight: 700 }}>
        <span style={{ color: K.ink }}>{dockSummary(rows)}</span>
        {hit && <span style={{ color: K.coral }}>☠ hit</span>}
        {gems.total > 0 && <span style={{ color: K.gem }}>◆ {gems.got}/{gems.total}</span>}
        {par && <span style={{ color: over ? K.coral : undefined }}>★ {par}</span>}
      </div>
    )
  }
  return (
    <div
      aria-label="Goals"
      style={{
        flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexWrap: 'wrap', alignContent: 'center', gap: 8,
        padding: '8px 12px',
      }}
    >
      {rows.map((r, k) => {
        const bad = r.kind === 'bad'
        const hit = bad && r.frac > 0
        return (
          <div
            key={k}
            data-done={r.done ? '1' : undefined}
            className={r.done ? 'spill-pop' : undefined}
            style={{ ...chipBase, border: `2px solid ${bad ? (hit ? K.coral : '#F3C9C4') : r.done ? K.green : K.line}`, animation: r.done ? 'spill-pop 120ms ease-out' : undefined }}
          >
            <Ring frac={r.frac} done={r.done} bad={bad} />
            <span style={{ color: bad ? K.coral : K.ink, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '9em' }}>{r.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: hit ? K.coral : K.dim }}>{r.value}</span>
          </div>
        )
      })}
      {gems.total > 0 && <div style={{ ...chipBase, border: `2px solid ${K.line}`, color: K.gem, paddingLeft: 12 }}>◆ {gems.got}/{gems.total} gems</div>}
      {par && <div style={{ ...chipBase, border: `2px solid ${K.line}`, paddingLeft: 12, color: over ? K.coral : K.ink }}>★ {par}</div>}
    </div>
  )
}
