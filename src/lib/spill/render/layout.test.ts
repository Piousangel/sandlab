import { describe, it, expect } from 'vitest'
import { computeLayout, HEADER_H, TRAY_MIN, PANEL_W, DESKTOP_MIN, NAV_COLLAPSE } from './layout'

const SNAPSHOTS: [number, number, number][] = [
  [360, 640, 3],
  [390, 844, 2.8125],
  [360, 540, 3],
  [1440, 900, 1],
  [412, 915, 2.625],
  [1440, 900, 2],
]

describe('computeLayout (§3 공통 레이아웃)', () => {
  for (const [vw, vh, dpr] of SNAPSHOTS) {
    describe(`${vw}×${vh} @${dpr}`, () => {
      const l = computeLayout({ vw, vh, dpr, safeBottom: 0 })
      it('헤더 + 캔버스 + 트레이 + 안전영역 = 100dvh (남는 세로 공간 0)', () => {
        expect(l.headerH + l.cssH + l.trayH + l.safeBottom).toBeCloseTo(vh, 6)
      })
      it('트레이는 최소 64px, 남는 공간은 트레이가 흡수', () => {
        expect(l.trayH).toBeGreaterThanOrEqual(TRAY_MIN - 1e-9)
      })
      it('캔버스는 기기 픽셀 정수 배율이고 가용 폭 안', () => {
        expect(Number.isInteger(l.devicePerCell)).toBe(true)
        expect(l.cssPerCell * dpr).toBeCloseTo(l.devicePerCell, 9)
        expect(l.cssW).toBeLessThanOrEqual(l.stageW + 1e-9)
        expect(l.canvasLeft).toBeGreaterThanOrEqual(0)
        expect(l.canvasLeft + l.cssW).toBeLessThanOrEqual(l.stageW + 1e-9)
      })
      it('캔버스와 패널이 겹치지 않는다', () => {
        if (l.desktop) expect(l.stageW + l.panelW).toBeLessThanOrEqual(vw + 1e-9)
        else expect(l.panelW).toBe(0)
      })
    })
  }

  it('데스크톱(≥900px)만 오른쪽 패널', () => {
    expect(computeLayout({ vw: DESKTOP_MIN, vh: 800, dpr: 1 }).desktop).toBe(true)
    expect(computeLayout({ vw: DESKTOP_MIN - 1, vh: 800, dpr: 1 }).desktop).toBe(false)
    expect(computeLayout({ vw: 1440, vh: 900, dpr: 1 }).panelW).toBe(PANEL_W)
    expect(computeLayout({ vw: 1440, vh: 900, dpr: 1 }).stageW).toBe(1440 - PANEL_W)
  })

  it('400px 미만이면 내비게이션을 ☰로 접는다', () => {
    expect(computeLayout({ vw: NAV_COLLAPSE - 1, vh: 700, dpr: 2 }).navCollapsed).toBe(true)
    expect(computeLayout({ vw: NAV_COLLAPSE, vh: 700, dpr: 2 }).navCollapsed).toBe(false)
  })

  it('안전영역 하단 인셋만큼 트레이 아래를 비운다', () => {
    const a = computeLayout({ vw: 390, vh: 844, dpr: 3, safeBottom: 0 })
    const b = computeLayout({ vw: 390, vh: 844, dpr: 3, safeBottom: 34 })
    expect(b.headerH + b.cssH + b.trayH + 34).toBeCloseTo(844, 6)
    expect(b.cssH).toBeLessThanOrEqual(a.cssH)
  })

  it('사용자 폰(DPR 2.8125) 셀은 약 1.8~2.2 CSS px', () => {
    const l = computeLayout({ vw: 384, vh: 780, dpr: 2.8125 })
    expect(l.cssPerCell).toBeGreaterThan(1.7)
    expect(l.cssPerCell).toBeLessThan(2.3)
  })

  it('헤더는 44px 고정', () => {
    expect(computeLayout({ vw: 360, vh: 640, dpr: 3 }).headerH).toBe(HEADER_H)
  })

  it('NaN·0 입력에도 최소 1 기기 픽셀', () => {
    const l = computeLayout({ vw: 0, vh: 0, dpr: 0 })
    expect(l.devicePerCell).toBe(1)
    expect(l.cssW).toBeGreaterThan(0)
  })
})
