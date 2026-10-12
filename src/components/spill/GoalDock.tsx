'use client'

import { dockSummary, type DockRow } from '@/lib/spill/client/dock'
import { C } from './ui'

interface Props {
  rows: DockRow[]
  gems: { got: number; total: number }
  par: string | null
  over: boolean
  compact: boolean
}

export default function GoalDock({ rows, gems, par, over, compact }: Props) {
  if (compact) {
    const hit = rows.some((r) => r.kind === 'bad' && r.frac > 0)
    return (
      <div aria-label="Goals" style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px', fontSize: 13, color: C.dim, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <span style={{ color: C.text }}>{dockSummary(rows)}</span>
        {hit && <span style={{ color: C.red }}>☠ hit</span>}
        {gems.total > 0 && <span style={{ color: C.gem }}>◆ {gems.got}/{gems.total}</span>}
        {par && <span style={{ color: over ? C.red : undefined }}>★ {par}</span>}
      </div>
    )
  }
  return (
    <div
      aria-label="Goals"
      style={{
        flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8,
        padding: '10px 14px', fontSize: 13, color: C.dim,
      }}
    >
      {rows.map((r, k) => (
        <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,7.5em) 1fr auto', alignItems: 'center', gap: 10 }}>
          <span style={{ color: r.kind === 'bad' ? '#ffb3ad' : r.done ? C.green : C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.kind === 'bad' ? '☠ ' : r.done ? '✓ ' : ''}{r.label}
          </span>
          <span style={{ height: 8, borderRadius: 4, background: '#151c28', overflow: 'hidden' }}>
            <span
              style={{
                display: 'block', height: '100%', width: `${Math.round(r.frac * 100)}%`, borderRadius: 4, transition: 'width 120ms linear',
                background: r.kind === 'bad' ? C.red : r.done ? C.green : '#4aa3ff',
              }}
            />
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: r.kind === 'bad' && r.frac > 0 ? C.red : undefined }}>{r.value}</span>
        </div>
      ))}
      {(gems.total > 0 || par) && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {gems.total > 0 && <span style={{ color: C.gem }}>◆ {gems.got}/{gems.total} gems</span>}
          {par && <span style={{ color: over ? C.red : undefined }}>★ {par}</span>}
        </div>
      )}
    </div>
  )
}
