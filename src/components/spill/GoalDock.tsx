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
    <svg width="28" height="28" viewBox="0 0 30 30" aria-hidden style={{ flexShrink: 0 }}>
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
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '2px 12px 2px 4px', borderRadius: 999, background: K.panel,
  boxSizing: 'border-box', minHeight: 36, fontSize: 13, fontWeight: 700, color: K.ink, whiteSpace: 'nowrap',
} as const

const mini = { padding: '3px 10px', borderRadius: 999, background: K.panel, border: `2px solid ${K.line}` } as const

export default function GoalDock({ rows, gems, par, over, compact }: Props) {
  if (compact) {
    const hit = rows.some((r) => r.kind === 'bad' && r.frac > 0)
    return (
      <div aria-label="Goals" style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <span style={{ ...mini, color: K.ink }}>{dockSummary(rows)}</span>
        {hit && <span style={{ ...mini, color: K.coralText, borderColor: K.coral }}>✕ hit</span>}
        {gems.total > 0 && <span style={{ ...mini, color: K.gemText }}>◆ {gems.got}/{gems.total}</span>}
        {par && <span style={{ ...mini, color: over ? K.coralText : K.ink }}>★ {par}</span>}
      </div>
    )
  }
  return (
    <div
      aria-label="Goals"
      role="group"
      style={{
        flex: 1, minHeight: 0, display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
        padding: '0 24px 0 12px', maskImage: 'linear-gradient(90deg,#000 calc(100% - 20px),transparent)', WebkitMaskImage: 'linear-gradient(90deg,#000 calc(100% - 20px),transparent)',
      }}
    >
      {[...rows].sort((a, b) => Number(b.kind === 'bad') - Number(a.kind === 'bad')).map((r, k) => {
        const bad = r.kind === 'bad'
        const hit = bad && r.frac > 0
        return (
          <div
            key={k}
            data-done={r.done ? '1' : undefined}
            role="group"
            aria-label={`${r.label}, ${r.value}${r.done ? ', done' : ''}`}
            className={r.done ? 'spill-pop' : undefined}
            style={{ ...chipBase, flexShrink: 0, border: `2px solid ${bad ? (hit ? K.coral : '#F3C9C4') : r.done ? K.green : K.line}`, animation: r.done ? 'spill-pop 120ms ease-out' : undefined }}
          >
            <Ring frac={r.frac} done={r.done} bad={bad} />
            <span style={{ color: bad ? K.coralText : K.ink }}>{r.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: hit ? K.coralText : K.dim }}>{r.value}</span>
          </div>
        )
      })}
      {(gems.total > 0 || par) && (
        <div style={{ ...chipBase, flexShrink: 0, border: `2px solid ${K.line}`, paddingLeft: 12, gap: 12 }}>
          {gems.total > 0 && <span style={{ color: K.gemText }}>◆ {gems.got}/{gems.total}</span>}
          {par && <span style={{ color: over ? K.coralText : K.ink }}>★ {par}</span>}
        </div>
      )}
    </div>
  )
}
