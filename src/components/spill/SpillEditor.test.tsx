import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SpillEditor from './SpillEditor'

describe('SpillEditor (SSR)', () => {
  it('renders the level picker, both text areas, verify and export, with no ads', () => {
    const html = renderToStaticMarkup(<SpillEditor />)
    expect(html).toContain('Spill level editor')
    expect(html).toContain('1-1 First Drop')
    expect(html).toContain('1-8 Cascade')
    expect(html).toContain('Meta (JSON')
    expect(html).toContain('Map (80 × 120)')
    expect(html).toContain('Run verify')
    expect(html).toContain('Copy level source')
    expect(html).toContain('parsed')
    expect(html).not.toContain('adsbygoogle')
  })
})
