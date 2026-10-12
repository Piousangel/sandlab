'use client'

import { useRef } from 'react'
import type { Phase, Speed } from '@/lib/spill/play/controller'
import { FLOAT_BTN, type ChromeBox } from '@/lib/spill/render/layout'

interface Props {
  phase: Phase
  canUndo: boolean
  speed: Speed
  speedCap: Speed
  onUndo(): void
  onRetry(): void
  onClearAll(): void
  onSpeed(): void
  box: ChromeBox
}

export const LONG_PRESS_MS = 600

const btn = (enabled: boolean): React.CSSProperties => ({
  width: FLOAT_BTN, height: FLOAT_BTN, borderRadius: FLOAT_BTN / 2, border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(14,19,27,0.62)', color: '#eef1f6', fontSize: 18, fontWeight: 700, cursor: enabled ? 'pointer' : 'default',
  opacity: enabled ? 1 : 0.35, backdropFilter: 'blur(4px)', touchAction: 'manipulation', padding: 0, userSelect: 'none', WebkitTouchCallout: 'none',
})

export default function FloatButtons({ phase, canUndo, speed, speedCap, onUndo, onRetry, onClearAll, onSpeed, box }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const long = useRef(false)
  const running = phase === 'run' || phase === 'paused'

  const down = () => {
    long.current = false
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      long.current = true
      onClearAll()
    }, LONG_PRESS_MS)
  }
  const up = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!long.current) onRetry()
  }
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  return (
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, display: 'flex', gap: 8, zIndex: 3 }}>
      <button type="button" aria-label="Undo" disabled={!canUndo} style={btn(canUndo)} onClick={onUndo}>⟲</button>
      <button
        type="button"
        aria-label="Retry (hold to clear all)"
        style={btn(true)}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRetry() } }}
      >
        ↺
      </button>
      <button
        type="button"
        aria-label={`Speed ${speed}x`}
        disabled={!running || speedCap === 1}
        style={{ ...btn(running && speedCap > 1), fontSize: 13 }}
        onClick={onSpeed}
      >
        {speed === 1 ? '⏩' : `${speed}x`}
      </button>
    </div>
  )
}
