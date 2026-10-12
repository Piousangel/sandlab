'use client'

import { useEffect, useState } from 'react'
import type { RunResult } from '@/lib/spill/play/attempt'
import type { Stars } from '@/lib/spill/play/score'
import type { HistBars } from '@/lib/spill/client/hist'
import { shareText } from '@/lib/spill/client/hist'
import { resultLines } from '@/lib/spill/client/view'
import type { LevelDef } from '@/lib/spill/level/define'
import { C } from './ui'

interface Props {
  def: LevelDef
  result: RunResult
  stars: Stars
  newBest: boolean
  starGapMs: number
  nextId: string | null
  hist: HistBars | null
  onStar(i: number): void
  onRetry(): void
  onSkip(): void
}

const LABELS = ['Clear', 'Gems', 'Par'] as const

export default function ResultCard({ def, result, stars, newBest, starGapMs, nextId, hist, onStar, onRetry, onSkip }: Props) {
  const got = [stars.clear, stars.gems, stars.par]
  const [shown, setShown] = useState(starGapMs > 0 ? 0 : 3)
  const [copy, setCopy] = useState<string | null>(null)
  const lines = resultLines(result, def)

  useEffect(() => {
    if (starGapMs <= 0) {
      got.forEach((g, i) => g && onStar(i))
      return
    }
    const ts = [0, 1, 2].map((i) =>
      setTimeout(() => {
        setShown(i + 1)
        if (got[i]) onStar(i)
      }, i * starGapMs + 120),
    )
    return () => ts.forEach(clearTimeout)
  }, [])

  const share = async () => {
    const text = shareText(def.id, stars.count, result.moves, result.ticks, location.host || 'sandlab.app')
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (nav.share) {
      try {
        await nav.share({ text })
        return
      } catch {
        setCopy(text)
        return
      }
    }
    setCopy(text)
    try {
      await navigator.clipboard?.writeText(text)
    } catch {
      return
    }
  }

  const max = hist ? Math.max(1, ...hist.bars.map((b) => b.cnt)) : 1
  return (
    <section
      role="dialog"
      aria-label="Level cleared"
      onClick={() => { if (shown < 3) { setShown(3); onSkip() } }}
      style={{
        position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 4, borderRadius: 18, padding: '16px 16px 14px',
        background: 'rgba(10,14,20,0.86)', border: `1px solid ${C.line}`, backdropFilter: 'blur(6px)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.45)', animation: 'spill-up 260ms ease-out both', color: C.text,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 24, letterSpacing: 1 }}>CLEARED!</h2>
        {newBest && (
          <span style={{ marginLeft: 'auto', border: `2px solid ${C.accent}`, color: C.accent, borderRadius: 6, padding: '1px 6px', fontWeight: 800, fontSize: 12, transform: 'rotate(-6deg)' }}>
            NEW BEST
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, margin: '10px 0 6px', fontSize: 15 }}>
        {LABELS.map((l, i) => (
          <span key={l} style={{ opacity: i < shown ? 1 : 0, transition: 'opacity 160ms', color: got[i] ? '#ffd54a' : 'rgba(238,241,246,0.4)', fontWeight: 700 }}>
            {got[i] ? '★' : '☆'}{l}
          </span>
        ))}
      </div>
      <p style={{ margin: '0 0 2px', fontVariantNumeric: 'tabular-nums', fontSize: 15 }}>{lines.stat}</p>
      {lines.tip && <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{lines.tip}</p>}
      {hist && (
        <div aria-label="Clear time distribution" style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40, marginTop: 10 }}>
          {hist.bars.map((b, i) => (
            <div key={b.bucket} style={{ flex: 1, position: 'relative', height: `${Math.max(4, (b.cnt / max) * 100)}%`, background: i === hist.you ? C.accent : 'rgba(238,241,246,0.22)', borderRadius: 2 }}>
              {i === hist.you && <span style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: C.accent }}>▲you</span>}
            </div>
          ))}
        </div>
      )}
      {copy && (
        <textarea
          readOnly
          value={copy}
          onFocus={(e) => e.currentTarget.select()}
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, background: '#0b1018', color: C.text, border: `1px solid ${C.line}`, borderRadius: 8, padding: 8, fontSize: 13, resize: 'none' }}
          rows={2}
        />
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRetry() }} style={cardBtn(false)}>↺ Retry</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); void share() }} style={cardBtn(false)}>Share</button>
        {nextId ? (
          <a href={`/play/${nextId}`} autoFocus style={{ ...cardBtn(true), textDecoration: 'none' }}>Next ▶</a>
        ) : (
          <a href="/play" style={{ ...cardBtn(true), textDecoration: 'none' }}>All levels</a>
        )}
      </div>
    </section>
  )
}

function cardBtn(primary: boolean): React.CSSProperties {
  return {
    flex: 1, minHeight: 44, borderRadius: 12, border: primary ? 0 : `1px solid #2a3140`, background: primary ? C.accent : '#141a24',
    color: primary ? C.bg : C.text, fontWeight: 750, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }
}
