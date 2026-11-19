import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GoalDock from './GoalDock'

const rows = [
  { kind: 'goal' as const, label: 'Pot 1 · water', value: '100/100', frac: 1, done: true },
  { kind: 'bad' as const, label: 'Skull pot', value: 'hit', frac: 0.3, done: false },
]

describe('GoalDock 칩', () => {
  it('상태를 색 외에 aria-label·모양(체크/X)으로도 전달하고 한 줄(nowrap)이라 높이 예산을 넘지 않는다', () => {
    const html = renderToStaticMarkup(<GoalDock rows={rows} gems={{ got: 1, total: 2 }} par="Par 2 moves in 5.0s" over={false} compact={false} />)
    expect(html).toContain('aria-label="Pot 1 · water, 100/100, done"')
    expect(html).toContain('aria-label="Skull pot, hit, hit"')
    expect(html).toContain('flex-wrap:nowrap')
    expect(html).toContain('1/2 gems')
  })
  it('compact도 요약 칩을 낸다', () => {
    const html = renderToStaticMarkup(<GoalDock rows={rows} gems={{ got: 0, total: 0 }} par={null} over={false} compact />)
    expect(html).toContain('1/1 pot')
    expect(html).toContain('hit')
  })
})
