import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SpillPlayer from './SpillPlayer'
import LevelList from './LevelList'
import ResultCard from './ResultCard'
import { simulate, devActions } from '@/lib/spill/play/attempt'
import { stars } from '@/lib/spill/play/score'
import { POT_LEVEL, GATE_LEVEL } from '@/lib/spill/play/fixtures'

describe('정적 렌더(SSR) — 광고 없는 캔버스 화면, 설명 텍스트는 HTML에', () => {
  it('SpillPlayer: 헤더 레벨명·트레이 RUN·플로팅 버튼·설명 children·목표', () => {
    const html = renderToStaticMarkup(
      <SpillPlayer level={POT_LEVEL} nextId="t-gate">
        <p>static description text</p>
      </SpillPlayer>,
    )
    expect(html).toContain('<h1')
    expect(html).toContain('Test Pot')
    expect(html).toContain('▶ RUN')
    expect(html).toContain('aria-label="Undo"')
    expect(html).toContain('aria-label="Retry (hold to clear all)"')
    expect(html).toContain('static description text')
    expect(html).toContain('Fill the pot with 400 cells of water')
    expect(html).toContain('touch-action:none')
    expect(html).not.toContain('adsbygoogle')
  })
  it('Trigger 레벨은 트레이에 Gate 칩', () => {
    const html = renderToStaticMarkup(<SpillPlayer level={GATE_LEVEL} nextId={null} />)
    expect(html).toContain('Gate')
  })
  it('LevelList: 월드 섹션·노드 링크·첫 레벨 시작 버튼', () => {
    const html = renderToStaticMarkup(
      <LevelList items={[{ id: '1-1', world: 1, name: 'First Drop' }, { id: '1-2', world: 1, name: 'Detour' }, { id: '2-1', world: 2, name: 'Spark' }]} />,
    )
    expect(html).toContain('W1 · Flow')
    expect(html).toContain('href="/play/1-1"')
    expect(html).toContain('Start with 1-1 First Drop')
    expect(html).toContain('locked')
  })
  it('ResultCard solution 모드: 별·Next·Share 없이 SOLUTION과 직접 해 보기만', () => {
    const r = simulate(POT_LEVEL, devActions(POT_LEVEL))
    const props = { def: POT_LEVEL, result: r, stars: stars(r, POT_LEVEL), newBest: false, starGapMs: 0, nextId: 't-gate', hist: null, onStar: () => {}, onRetry: () => {}, onSkip: () => {} }
    const normal = renderToStaticMarkup(<ResultCard {...props} />)
    expect(normal).toContain('CLEARED!')
    expect(normal).toContain('Next ▶')
    const sol = renderToStaticMarkup(<ResultCard {...props} solution />)
    expect(sol).toContain('SOLUTION')
    expect(sol).toContain('Try it yourself')
    expect(sol).not.toContain('CLEARED!')
    expect(sol).not.toContain('★')
    expect(sol).not.toContain('Next ▶')
    expect(sol).not.toContain('Share')
  })
  it('LevelList: 레벨이 없으면 안내 문구', () => {
    expect(renderToStaticMarkup(<LevelList items={[]} />)).toContain('being built')
  })
})
