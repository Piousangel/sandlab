'use client'

interface Pt {
  x: number
  y: number
}

interface Props {
  step: 'drag' | 'run'
  from: Pt
  to: Pt
  run: Pt
}

function Hand() {
  return (
    <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden>
      <path
        d="M11 2c2.2 0 4 1.8 4 4v11l1.4-.6c1.9-.8 4 .1 4.8 2l.2.5.7-.2c1.9-.6 4 .4 4.6 2.3l.3.9c1.9-.3 3.8.9 4.2 2.8l.8 4.2c.6 3.3-.2 6.6-2.4 9.1L27 40H12.6L4.3 29.6c-1.4-1.8-1.2-4.4.5-5.9 1.6-1.4 4-1.3 5.5.2l-3.3-.1V6c0-2.2 1.8-4 4-4z"
        fill="rgba(238,241,246,0.92)"
        stroke="#07090D"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export default function Onboarding({ step, from, to, run }: Props) {
  const style: React.CSSProperties & Record<string, string | number> =
    step === 'drag'
      ? { '--fx': `${from.x}px`, '--fy': `${from.y}px`, '--tx': `${to.x}px`, '--ty': `${to.y}px`, animation: 'spill-hand-drag 2.2s ease-in-out infinite' }
      : { '--fx': `${run.x}px`, '--fy': `${run.y}px`, animation: 'spill-hand-tap 1.1s ease-in-out infinite' }
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6, overflow: 'hidden' }}>
      {step === 'drag' && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(238,241,246,0.35)" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 9" />
        </svg>
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, marginLeft: -11, marginTop: -2, ...style }}>
        <Hand />
      </div>
    </div>
  )
}
