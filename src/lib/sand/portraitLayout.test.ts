import { describe, it, expect } from 'vitest'
import { isPortraitLayout, PORTRAIT_CSS, TAP_MIN } from './portraitLayout'

describe('isPortraitLayout — 세로 폰 레이아웃 판정', () => {
  it('세로 폰·카톡 인앱 높이·세로 태블릿은 세로 레이아웃', () => {
    expect(isPortraitLayout(360, 640)).toBe(true)
    expect(isPortraitLayout(390, 844)).toBe(true)
    expect(isPortraitLayout(360, 540)).toBe(true)
    expect(isPortraitLayout(820, 1180)).toBe(true)
  })
  it('데스크톱(폭 900 이상)은 정사각에 가까운 세로 창이어도 데스크톱 레이아웃(리뷰 12)', () => {
    expect(isPortraitLayout(1440, 900)).toBe(false)
    expect(isPortraitLayout(1000, 1040)).toBe(false)
    expect(isPortraitLayout(900, 1200)).toBe(false)
  })
  it('가로 폰은 세로 레이아웃이 아니다', () => {
    expect(isPortraitLayout(844, 390)).toBe(false)
  })
})

describe('PORTRAIT_CSS — 세로 폰 탭 타깃(스펙 §3: 최소 44px, 리뷰 1)', () => {
  it('탭 타깃 최소값은 44', () => {
    expect(TAP_MIN).toBeGreaterThanOrEqual(44)
  })
  it('컨트롤 버튼·링크는 min-height 44px', () => {
    expect(PORTRAIT_CSS).toMatch(/\.sl-controls-n > button,\s*\.sl-controls-n > a\s*\{[^}]*min-height:\s*44px/)
  })
  it('브러시 슬라이더도 44px 높이의 터치 영역', () => {
    expect(PORTRAIT_CSS).toMatch(/\.sl-controls-n input\[type=range\]\s*\{[^}]*height:\s*44px/)
  })
  it('컨트롤 글자는 13px 이상', () => {
    const m = PORTRAIT_CSS.match(/\.sl-controls-n > button,\s*\.sl-controls-n > a\s*\{[^}]*font-size:\s*([\d.]+)px/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(13)
  })
})
