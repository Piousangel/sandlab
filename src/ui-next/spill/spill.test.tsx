import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { computeLayout } from '@/lib/spill/render/layout'
import { POT_LEVEL, GATE_LEVEL } from '@/lib/spill/play/fixtures'
import { LEVELS } from '@/lib/spill/levels'
import { findViolations } from '../../../scripts/lint-ui-rules.mjs'
import { HUD, spillChrome } from './chrome'
import { SpillHud as Kit, runFace } from './SpillHud'
import { DailyStart as Start } from './DailyStart'
import { goalLine } from './goalLine'

// DailyStart의 플레이 화면 미리 받기(P12 LCP)가 테스트가 끝난 뒤 SpillPlayer를 import하지 않게 막는다
vi.mock('../daily/LazySpillPlayer', () => ({ preloadSpillPlayer: () => {}, default: () => null }))

// SpillPlayer·DailySpill이 새 HUD로 그려지는지 보려고 @ui-shell을 프리뷰 빌드(next.ts)와 같은 모양으로 바꾼다.
// next.ts 자체는 CSS·next/font를 불러 테스트 환경에서 못 읽으므로 같은 export만 직접 넣는다.
vi.mock('@ui-shell', async () => ({
  shellHtmlProps: {},
  ShellHeader: null,
  ShellFooter: null,
  SpillHud: (await import('./SpillHud')).SpillHud,
  DailyStart: (await import('./DailyStart')).DailyStart,
  SpillResult: (await import('../result/SpillResult')).SpillResult,
  DailyAside: (await import('../daily/DailyAside')).DailyAside,
}))

const { default: SpillPlayer } = await import('@/components/spill/SpillPlayer')

const VIEWS = [
  { vw: 390, vh: 844, dpr: 3 },
  { vw: 360, vh: 640, dpr: 3 },
  { vw: 360, vh: 640, dpr: 2 },
  { vw: 1440, vh: 900, dpr: 1 },
  { vw: 1440, vh: 900, dpr: 2 },
]

describe('새 HUD 세로 예산(chrome.ts)', () => {
  it('보드 + 위아래 크롬이 한 화면에 들어간다(스크롤 없이 RUN), 보드는 2:3 정수 장치 픽셀 배율', () => {
    for (const v of VIEWS) {
      const c = spillChrome(v.vw)
      const l = computeLayout({ ...v, chrome: c })
      expect(l.headerH + l.cssH + l.trayH, JSON.stringify(v)).toBeLessThanOrEqual(v.vh)
      expect(l.trayH, JSON.stringify(v)).toBeGreaterThanOrEqual(c.bottom)
      expect(l.cssH / l.cssW).toBeCloseTo(1.5, 6)
      expect(Number.isInteger(l.devicePerCell)).toBe(true)
      expect(l.cssW + c.side).toBeLessThanOrEqual(l.stageW)
    }
  })
  it('390x844(3x)는 지금 HUD와 같은 보드 크기, 1440x900은 보드 가운데(좌우 Bone)', () => {
    const now = computeLayout({ vw: 390, vh: 844, dpr: 3 })
    const next = computeLayout({ vw: 390, vh: 844, dpr: 3, chrome: spillChrome(390) })
    expect(next.cssW).toBe(now.cssW)
    const d = computeLayout({ vw: 1440, vh: 900, dpr: 1, chrome: spillChrome(1440) })
    expect(d.desktop).toBe(true)
    expect(d.cssW).toBe(480)
    expect(d.canvasLeft).toBeGreaterThan(200)
  })
  it('모바일 top = 헤더 + 목표 줄 + 테두리, 데스크톱은 목표 줄 없음(오른쪽 카드)', () => {
    expect(spillChrome(390).top).toBe(HUD.header + HUD.goals + HUD.frame)
    expect(spillChrome(1440).top).toBe(HUD.headerDesk + HUD.frameDesk)
  })
})

describe('새 HUD 렌더(SSR)', () => {
  const html = renderToStaticMarkup(<SpillPlayer level={POT_LEVEL} nextId="t-gate"><p>static description text</p></SpillPlayer>)

  it('보드 칸 안에는 캔버스 2장뿐 — 버튼·메시지·보석 0(보드 가림 0)', () => {
    const m = html.match(/data-spill-board="true"[^>]*>([\s\S]*?)<\/div><\/div><\/div>/)
    expect(m).not.toBeNull()
    const inner = m![1]
    expect(inner.match(/<canvas/g)?.length).toBe(2)
    expect(inner).not.toContain('<button')
    expect(inner).not.toContain('role="status"')
  })
  it('도구는 트레이에: Undo·Retry(길게=전부 지우기)·속도·RUN, 목표 줄에 목표·보석', () => {
    expect(html).toContain('aria-label="Undo"')
    expect(html).toContain('aria-label="Retry (hold to clear all)"')
    expect(html).toContain('aria-label="Speed 1x"')
    expect(html).toMatch(/data-spill-run="true"[^>]*data-primary="1"/)
    expect(html).toContain('aria-label="Goals"')
    expect(html).toContain('aria-label="Gems 0 of 1"')
    expect(html).toContain('static description text')
    expect(html).toContain('Fill the pot with 400 cells of water')
    expect(html).toContain('<h1')
    expect(html).toContain('touch-action:none')
  })
  it('이모지·유니코드 기호 0(아이콘은 <Icon>), 지금 HUD의 원형 버튼·글리프 없음', () => {
    expect(findViolations(html, 'out.html')).toEqual([])
    expect(html).not.toContain('\u25b6') // lint-ui-allow: 지금 HUD 글리프가 없는지 검사
    expect(html).not.toContain('\u27f2') // lint-ui-allow: 지금 HUD 글리프가 없는지 검사
  })
  it('Ember 주 행동은 하나(RUN)', () => {
    expect(html.match(/data-primary="1"/g)?.length).toBe(1)
  })
  it('Gate 레벨: Gate 동사 칩', () => {
    expect(renderToStaticMarkup(<SpillPlayer level={GATE_LEVEL} nextId={null} />)).toContain('Gate')
  })
  it('runFace: 모든 행동에 아이콘 + 글자, 기호 없음', () => {
    for (const a of ['run', 'pause', 'resume', 'retry', 'next'] as const) {
      const f = runFace(a, false)
      expect(f.label).toMatch(/^[A-Za-z ]+$/)
    }
    expect(runFace('pause', false).primary).toBe(false)
    expect(runFace('retry', true).label).toBe('Try it')
  })
  it('Kit 모양: chrome·Frame', () => {
    expect(typeof Kit.chrome).toBe('function')
    expect(typeof Kit.Frame).toBe('function')
  })
})

describe('데일리 시작 화면(S4·S5)', () => {
  const level = LEVELS.find((l) => l.gems?.length && l.par) ?? LEVELS[1]
  const html = renderToStaticMarkup(<Start dayNumber={42} level={level} solved={false} onStart={() => {}} />)
  it('실루엣 미리보기 + 이름판 + Solve today + 공식 기록 한 줄', () => {
    expect(html).toContain('Solve today')
    expect(html).toContain('Your first clear is today&#x27;s official record.')
    expect(html).toContain('<figcaption')
    expect(html).toContain('sl-ds-canvas')
    expect(html).toContain('No.42 · Thu 19 Nov')
  })
  it('스포일러 없음: par·별·보석 개수가 안 보인다(보이는 글자·접근 이름 기준)', () => {
    const text = html.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ') + [...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]).join(' ')
    expect(level.gems?.length).toBeGreaterThan(0)
    expect(text).not.toMatch(/\bpar\b/i)
    expect(text).not.toMatch(/\bgems?\b/i)
    expect(text).not.toMatch(/\bstars?\b/i)
    expect(findViolations(html, 'out.html')).toEqual([])
  })
  it('이미 풀었으면 Practice(연습) 문구', () => {
    const s = renderToStaticMarkup(<Start dayNumber={42} level={level} solved onStart={() => {}} />)
    expect(s).toContain('Practice')
    expect(s).toContain('Replays are practice')
  })
})

describe('goalLine', () => {
  it('같은 목표 문장은 한 번으로 묶는다', () => {
    expect(goalLine(['Fill the pot with 300 cells of water', 'Fill the pot with 300 cells of water'])).toBe('Fill each of the 2 pots with 300 cells of water.')
    expect(goalLine(['Light the torch'])).toBe('Light the torch.')
    expect(goalLine(['Light the torch', 'Light the torch'])).toBe('Light the torch (2 times).')
  })
})
