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

/** 크림 크롬 토큰(UI 개편 1단계). 보드 캔버스는 C(어두운 배경)를 유지해 재료 대비를 지킨다. */
export const K = {
  bg: '#FFF6E3',
  panel: '#FFFDF6',
  line: '#EAD9B8',
  ink: '#3B2A1A',
  dim: 'rgba(59,42,26,0.62)',
  accent: '#F28A1B',
  accentDeep: '#C96A08',
  coral: '#E5544B',
  coralText: '#B83229',
  green: '#2E9E5B',
  blue: '#2F7FD6',
  gem: '#16A2B8',
  gemText: '#0B6F82',
  greenText: '#1F7A44',
  r12: 12,
  r20: 20,
  lift: '0 3px 0 rgba(59,42,26,0.22)',
} as const

export const iconBtn: CSSProperties = {
  minWidth: 44, height: 44, padding: 0, border: 0, background: 'transparent', color: K.ink,
  fontSize: 20, lineHeight: '44px', cursor: 'pointer', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

export const pill = (active: boolean, disabled = false): CSSProperties => ({
  minWidth: 44, minHeight: 44, padding: '0 14px', borderRadius: 999, border: `2px solid ${active ? K.accent : K.line}`,
  background: active ? '#FFE3BC' : K.panel, color: disabled ? 'rgba(59,42,26,0.35)' : K.ink,
  fontSize: 15, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  whiteSpace: 'nowrap', touchAction: 'manipulation', boxShadow: disabled ? 'none' : K.lift,
})

export const starRow = (n: number, of = 3) => '★'.repeat(n) + '☆'.repeat(Math.max(0, of - n))
