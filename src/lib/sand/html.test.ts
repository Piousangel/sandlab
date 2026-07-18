import { describe, it, expect } from 'vitest'
import { escapeHtml } from './html'

describe('escapeHtml (OG 인젝션 방어)', () => {
  it('다섯 위험 문자를 전부 이스케이프한다', () => {
    expect(escapeHtml('&')).toBe('&amp;')
    expect(escapeHtml('<')).toBe('&lt;')
    expect(escapeHtml('>')).toBe('&gt;')
    expect(escapeHtml('"')).toBe('&quot;')
    expect(escapeHtml("'")).toBe('&#39;')
  })

  it('& 를 먼저 처리해 이중 이스케이프하지 않는다', () => {
    // <를 &lt;로 바꾼 뒤 &를 처리하면 &amp;lt;가 되는 순서 버그를 막는다.
    expect(escapeHtml('<')).toBe('&lt;')
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('속성 탈출(인젝션) 벡터를 무력화한다', () => {
    const evil = '"><script>alert(1)</script>'
    const out = escapeHtml(evil)
    expect(out).not.toContain('<script>')
    expect(out).not.toContain('">')
    expect(out).toBe('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('이미지 onerror 벡터를 무력화한다', () => {
    const out = escapeHtml('<img src=x onerror=alert(1)>')
    expect(out).not.toMatch(/<img/)
    expect(out.startsWith('&lt;img')).toBe(true)
  })

  it('평범한 텍스트는 그대로 둔다', () => {
    expect(escapeHtml('My cool dune 42')).toBe('My cool dune 42')
    expect(escapeHtml('')).toBe('')
  })
})
