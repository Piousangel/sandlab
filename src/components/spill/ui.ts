import type { CSSProperties } from 'react'

export const C = {
  bg: '#07090D',
  panel: '#0e131b',
  line: '#1b2230',
  text: '#eef1f6',
  dim: 'rgba(238,241,246,0.6)',
  accent: '#f5a623',
  red: '#ff5a4f',
  green: '#5be38a',
  gem: '#7ff0ff',
} as const

export const iconBtn: CSSProperties = {
  minWidth: 44, height: 44, padding: 0, border: 0, background: 'transparent', color: C.text,
  fontSize: 20, lineHeight: '44px', cursor: 'pointer', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

export const pill = (active: boolean, disabled = false): CSSProperties => ({
  minWidth: 44, minHeight: 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${active ? C.accent : '#2a3140'}`,
  background: active ? 'rgba(245,166,35,0.16)' : '#121823', color: disabled ? 'rgba(238,241,246,0.35)' : C.text,
  fontSize: 15, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  whiteSpace: 'nowrap', touchAction: 'manipulation',
})

export const starRow = (n: number, of = 3) => '★'.repeat(n) + '☆'.repeat(Math.max(0, of - n))
