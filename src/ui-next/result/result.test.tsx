import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { computeLayout } from '@/lib/spill/render/layout'
import { POT_LEVEL } from '@/lib/spill/play/fixtures'
import { LEVELS } from '@/lib/spill/levels'
import { DAILY_POOL_IDS, dailyIdFor } from '@/lib/spill/client/daily'
import { levelShareText, shareTextV2 } from '@/lib/spill/client/share'
import { findViolations } from '../../../scripts/lint-ui-rules.mjs'
import { spillChrome } from '../spill/chrome'
import {
  MIN_STANDING_SAMPLE, MOBILE_STACK, PNG_BUDGET, SHARE_FORMATS, caption, officialNote, practiceLabel, resultBoardScale, shareFileName, shareLayout, shareRoute, standingLine,
  type ShareFormat,
} from './model'
import { SpillResult, recordStat } from './SpillResult'
import type { SpillResultProps } from '../shell/spillTypes'

const STARS2 = { clear: true, gems: true, par: false, count: 2 }

describe('캡션 문구(caption)', () => {
  it('데일리는 Daily No.N · World, 레벨 모드는 World만 — 레벨 id 없음', () => {
    for (const id of DAILY_POOL_IDS) {
      const lv = LEVELS.find((x) => x.id === id)!
      const d = caption({ name: lv.name, world: lv.world, moves: 2, ticks: 366, stars: STARS2, daily: { n: 43 }, solution: false })
      expect(d.kicker).toBe(`Daily No.43 · World ${lv.world}`)
      const all = [d.kicker, d.title, d.starsLabel, d.stat, ...d.parts.map((x) => x.label)].join(' ')
      expect(all.includes(id), id).toBe(false)
    }
    const l = caption({ name: 'First Dig', world: 1, moves: 1, ticks: 348, stars: { clear: true, gems: true, par: true, count: 3 }, daily: null, solution: false })
    expect(l).toMatchObject({ kicker: 'World 1', title: 'First Dig', starsLabel: '3 of 3 stars', stat: '1 move · 5.8s' })
  })
  it('별 내역은 Clear·Gems·Par 순서, 받은 것만 got', () => {
    const c = caption({ name: 'x', world: 1, moves: 2, ticks: 60, stars: STARS2, daily: null, solution: false })
    expect(c.parts).toEqual([
      { label: 'Clear', got: true },
      { label: 'Gems', got: true },
      { label: 'Par', got: false },
    ])
  })
})

describe('상위 N% 한 줄(standingLine) — 자리와 인터페이스만, 가짜 수치 금지', () => {
  it('데이터가 없으면 null(줄 자체를 그리지 않는다)', () => {
    expect(standingLine(null)).toBeNull()
    expect(standingLine(undefined)).toBeNull()
  })
  it('표본이 작거나 값이 이상하면 null', () => {
    expect(standingLine({ topPercent: 18, sample: MIN_STANDING_SAMPLE - 1 })).toBeNull()
    expect(standingLine({ topPercent: 0, sample: 100 })).toBeNull()
    expect(standingLine({ topPercent: 101, sample: 100 })).toBeNull()
    expect(standingLine({ topPercent: Number.NaN, sample: 100 })).toBeNull()
  })
  it('값이 있으면 반올림한 정수 퍼센트(최소 1)', () => {
    expect(standingLine({ topPercent: 17.6, sample: 40 })).toBe('Top 18% of today’s clears')
    expect(standingLine({ topPercent: 0.2, sample: 400 })).toBe('Top 1% of today’s clears')
  })
})

describe('보조 문구(S4)', () => {
  it('데일리 재도전 = 연습, 공식 기록은 첫 클리어라고 문구로 말한다', () => {
    expect(practiceLabel(true, 2)).toBe('Practice for 3 stars')
    expect(practiceLabel(true, 3)).toBe('Practice again')
    expect(practiceLabel(false, 1)).toBe('Retry for 3 stars')
    expect(officialNote({ official: true })).toMatch(/first clear stays today.s official record/)
    expect(officialNote({ official: false })).toMatch(/^Practice run\./)
    expect(officialNote(null)).toBeNull()
  })
  it('공식 기록의 수·시간(시간은 ticks가 있을 때만)', () => {
    expect(recordStat({ stars: 2, moves: 2, ticks: 366, mask: 3 })).toBe('2 moves · 6.1s')
    expect(recordStat({ stars: 1, moves: 1 })).toBe('1 move')
  })
})

describe('결과 화면 보드 크기(resultBoardScale)', () => {
  it('정수 장치 픽셀 배율, 2:3, 모바일은 화면 폭 안, 데스크톱 1440x900은 320x480', () => {
    for (const [vw, vh, dpr] of [[390, 844, 3], [360, 640, 3], [360, 640, 2], [375, 667, 2]] as const) {
      const s = resultBoardScale(vw, vh, dpr, false)
      expect(Number.isInteger(s.devicePerCell)).toBe(true)
      expect(s.cssH / s.cssW).toBeCloseTo(1.5, 6)
      expect(s.cssW + 16 + 32).toBeLessThanOrEqual(vw)
      // 보드 + 나머지 세로 예산(헤더·못·줄·캡션·stratum·Share image)이 화면 높이 안 — Share image가 첫 화면에 든다
      expect(s.cssH + MOBILE_STACK, `${vw}x${vh}@${dpr}`).toBeLessThanOrEqual(vh)
      expect(s.cssW).toBeGreaterThanOrEqual(160)
    }
    expect(resultBoardScale(390, 844, 3, false).cssW).toBeGreaterThanOrEqual(200)
    const d = resultBoardScale(1440, 900, 1, true)
    expect([d.cssW, d.cssH]).toEqual([320, 480])
    const d2 = resultBoardScale(1440, 900, 2, true)
    expect(d2.cssH).toBeLessThanOrEqual(900 - 56 - 150)
    expect(d2.cssW).toBeGreaterThanOrEqual(320)
  })
})

describe('공유 이미지 배치(shareLayout)', () => {
  it('1:1 = 1080x1080, OG = 1200x630 두 포맷만', () => {
    expect(Object.keys(SHARE_FORMATS)).toEqual(['square', 'wide'])
    expect(SHARE_FORMATS.square).toMatchObject({ w: 1080, h: 1080 })
    expect(SHARE_FORMATS.wide).toMatchObject({ w: 1200, h: 630 })
  })
  it('액자·못·글 칸이 캔버스 안에 있고 서로 겹치지 않는다(배율을 낮춰도)', () => {
    for (const f of ['square', 'wide'] as ShareFormat[]) {
      for (let k = f === 'square' ? 3 : 2; k >= 1; k--) {
        const L = shareLayout(f, k)
        const F = L.frame
        expect(F.w).toBe(160 * k + F.mat * 2)
        expect(F.h).toBe(240 * k + F.mat * 2)
        expect(F.x).toBeGreaterThanOrEqual(0)
        expect(F.y + F.h).toBeLessThanOrEqual(L.h)
        expect(L.nail.y - L.nail.r).toBeGreaterThanOrEqual(0)
        expect(L.nail.y).toBeLessThan(F.y)
        expect(F.x + F.w).toBeLessThan(L.text.x)
        expect(L.text.x + L.text.w).toBeLessThanOrEqual(L.w)
        expect(L.text.siteY).toBeLessThanOrEqual(L.h)
        for (const y of [L.text.kickerY, L.text.titleY, L.text.beadsY, L.text.statY]) expect(y).toBeLessThan(L.text.siteY)
      }
    }
  })
})

describe('공유 경로(shareRoute)', () => {
  it('Web Share Level 2(files)면 파일 공유, 아니면 데스크톱 다운로드, 폰은 텍스트 복사', () => {
    expect(shareRoute({ canShareFiles: true, finePointer: true })).toBe('share-file')
    expect(shareRoute({ canShareFiles: true, finePointer: false })).toBe('share-file')
    expect(shareRoute({ canShareFiles: false, finePointer: true })).toBe('download')
    expect(shareRoute({ canShareFiles: false, finePointer: false })).toBe('copy-text')
  })
  it('파일 이름에 레벨 id가 없다', () => {
    expect(shareFileName({ n: 43 }, 'Two Pots', 'square')).toBe('sandlab-daily-43-square.png')
    expect(shareFileName(null, 'First Dig!', 'wide')).toBe('sandlab-spill-first-dig-wide.png')
  })
})

describe('공유 텍스트', () => {
  it('데일리 텍스트(shareTextV2)에 레벨 id가 없다 — prod 결과 카드·새 결과 화면이 같은 것을 쓴다', () => {
    for (let n = 1; n <= 9; n++) expect(shareTextV2({ stars: 2, moves: 2, ticks: 366, mask: 3 }, n).includes(dailyIdFor(n))).toBe(false)
  })
  it('레벨 모드 텍스트는 이름·레벨 링크(이모지 없음, 글자 단위 검사는 share.test.ts)', () => {
    const t = levelShareText({ id: '1-1', name: 'First Dig' }, 3, 1, 348)
    expect(t.startsWith('Sandlab Spill · First Dig ')).toBe(true)
    expect(t.endsWith(' 1 move · 5.8s\nhttps://sandlab.app/play/1-1')).toBe(true)
    expect(/\p{Extended_Pictographic}/u.test(t)).toBe(false)
  })
})

// ── 컴포넌트 SSR ──
const layout = computeLayout({ vw: 390, vh: 844, dpr: 3, chrome: spillChrome(390) })
const base: SpillResultProps = {
  layout,
  level: POT_LEVEL,
  moves: 2,
  ticks: 366,
  stars: STARS2,
  board: () => null,
  starGapMs: 0,
  onStar: () => {},
  onSkip: () => {},
  solution: false,
  daily: null,
  nextHref: '/play/t-gate',
  onPractice: () => {},
}
const dailyProps = (official: boolean, standing: SpillResultProps['daily'] extends infer D ? (D extends { standing: infer S } ? S : never) : never = null): SpillResultProps => ({
  ...base,
  daily: { n: 43, official, record: { stars: 2, moves: 2, ticks: 366, mask: 3 }, text: shareTextV2({ stars: 2, moves: 2, ticks: 366, mask: 3 }, 43), standing },
})

describe('SpillResult 렌더(SSR)', () => {
  it('데일리 공식 기록: 액자 캔버스·캡션·+1 stratum·Share image(Ember 하나)·Copy text·Practice, Next level 없음, 레벨 id 없음', () => {
    const html = renderToStaticMarkup(<SpillResult {...dailyProps(true)} />)
    expect(html).toContain('class="sl-rs-board"')
    expect(html).toContain('class="sl-rs-nail"')
    expect(html).toContain('Daily No.43')
    expect(html).toContain('+1 stratum')
    expect(html).toContain('Share image')
    expect(html).toContain('Copy text')
    expect(html).toContain('Practice for 3 stars')
    expect(html).toMatch(/first clear stays today.s official record/)
    expect(html).not.toContain('Next level')
    expect(html.match(/class="sl-rs-share"/g)?.length).toBe(1)
    expect(html.includes(POT_LEVEL.id)).toBe(false)
    expect(html).toContain('aria-label="Level cleared"')
  })
  it('상위 N%: 데이터 없으면 줄이 없다, 있으면 한 줄', () => {
    expect(renderToStaticMarkup(<SpillResult {...dailyProps(true)} />)).not.toContain('sl-rs-standing')
    expect(renderToStaticMarkup(<SpillResult {...dailyProps(true, { topPercent: 18, sample: 50 })} />)).toContain('Top 18% of today')
  })
  it('연습 판: +1 stratum 없음, 연습 문구, 이미지 공유 없음(보드는 연습 판·기록은 공식 — 섞지 않는다), 주 행동 = 공식 기록 텍스트', () => {
    const html = renderToStaticMarkup(<SpillResult {...dailyProps(false)} />)
    expect(html).not.toContain('+1 stratum')
    expect(html).toContain('Practice run.')
    expect(html).not.toContain('Share image')
    expect(html).not.toContain('sl-rs-fmt')
    expect(html).toContain('Copy today&#x27;s result')
    expect(html.match(/class="sl-rs-share"/g)?.length).toBe(1)
  })
  it('레벨 모드: Next level 링크, 데일리 문구 없음', () => {
    const html = renderToStaticMarkup(<SpillResult {...base} />)
    expect(html).toContain('href="/play/t-gate"')
    expect(html).toContain('Next level')
    expect(html).toContain('Retry for 3 stars')
    expect(html).not.toContain('Daily No.')
    expect(html).not.toContain('stratum')
    expect(renderToStaticMarkup(<SpillResult {...base} nextHref={null} />)).toContain('All levels')
  })
  it('해답 보기: 공유 없이 Try it yourself 하나', () => {
    const html = renderToStaticMarkup(<SpillResult {...base} solution />)
    expect(html).toContain('Try it yourself')
    expect(html).not.toContain('Share image')
    expect(html).toContain('aria-label="Solution replay"')
  })
  it('별은 유리알 아이콘(star-full/star-empty), 이모지·기호 없음', () => {
    const html = renderToStaticMarkup(<SpillResult {...dailyProps(true)} />)
    expect(html.match(/#i-star-full/g)?.length).toBe(2)
    expect(html.match(/#i-star-empty/g)?.length).toBe(1)
    // 별·유리알 문자(U+2605·2606·25CF·25CB)를 글자로 그리지 않는다 — 코드포인트로 만들어 검사(이 파일도 린트 대상)
    const glyphs = [0x2605, 0x2606, 0x25cf, 0x25cb].map((c) => String.fromCodePoint(c))
    expect(/\p{Extended_Pictographic}/u.test(html)).toBe(false)
    for (const g of glyphs) expect(html.includes(g), g).toBe(false)
  })
})

describe('금지 규칙 린트', () => {
  it('result 폴더 소스에 이모지·기호·회색 패널 중첩 없음', async () => {
    const { readFileSync, readdirSync } = await import('node:fs')
    const { join } = await import('node:path')
    const dir = join(__dirname)
    for (const f of readdirSync(dir).filter((x) => /\.(tsx?|css)$/.test(x) && !x.endsWith('.test.tsx'))) {
      const src = readFileSync(join(dir, f), 'utf8')
      expect(findViolations(src, f), f).toEqual([])
    }
  })
})

vi.mock('@/lib/sand/gallery', () => ({ trackEvent: () => {} }))
