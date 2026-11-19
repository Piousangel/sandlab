import { computeScale } from './canvas'

export const HEADER_H = 44
export const TRAY_MIN = 64
export const PANEL_W = 320
export const DESKTOP_MIN = 900
export const NAV_COLLAPSE = 400
export const FLOAT_BTN = 44
export const COMPACT_HUD = 600

export interface LayoutInput {
  vw: number
  vh: number
  dpr: number
  safeBottom?: number
  /** 새 HUD(리디자인 P4)가 보드 위·아래·옆에 예약하는 높이·폭. 없으면 지금 HUD(HEADER_H·TRAY_MIN) 그대로. */
  chrome?: LayoutChrome
}

export interface LayoutChrome {
  /** 보드(캔버스) 위쪽 y — 헤더·목표 줄·보드 테두리 합. */
  top: number
  /** 보드 아래 최소 높이(safe-area 제외) — 보드 테두리·진행 줄·도구 줄 합. */
  bottom: number
  /** 보드 좌우 테두리 합(가로에서 캔버스가 쓸 수 없는 폭). */
  side: number
}

export interface Layout {
  vw: number
  vh: number
  desktop: boolean
  navCollapsed: boolean
  compactHud: boolean
  headerH: number
  trayH: number
  safeBottom: number
  stageW: number
  panelW: number
  cssW: number
  cssH: number
  cssPerCell: number
  devicePerCell: number
  canvasLeft: number
}

const finite = (n: number, d: number) => (Number.isFinite(n) && n > 0 ? n : d)

export function computeLayout(input: LayoutInput): Layout {
  const vw = finite(input.vw, 0)
  const vh = finite(input.vh, 0)
  const dpr = finite(input.dpr, 1)
  const safeBottom = finite(input.safeBottom ?? 0, 0)
  const desktop = vw >= DESKTOP_MIN
  const panelW = desktop ? PANEL_W : 0
  const stageW = vw - panelW
  const top = input.chrome ? input.chrome.top : HEADER_H
  const trayMin = input.chrome ? input.chrome.bottom : TRAY_MIN
  const side = input.chrome ? input.chrome.side : 0
  const availH = vh - top - trayMin - safeBottom
  const s = computeScale(Math.max(0, stageW - side), Math.max(0, availH), dpr)
  const trayH = Math.max(trayMin, vh - top - s.cssH - safeBottom)
  return {
    vw,
    vh,
    desktop,
    navCollapsed: vw < NAV_COLLAPSE,
    compactHud: stageW < COMPACT_HUD,
    headerH: top,
    trayH,
    safeBottom,
    stageW,
    panelW,
    cssW: s.cssW,
    cssH: s.cssH,
    cssPerCell: s.cssPerCell,
    devicePerCell: s.devicePerCell,
    canvasLeft: Math.max(0, (stageW - s.cssW) / 2),
  }
}

export const CHROME_PAD = 8
export const GEM_PILL_W = 64
export const GEM_PILL_H = 28

export interface ChromeBox {
  x: number
  y: number
  w: number
  h: number
}

export interface Chrome {
  buttons: ChromeBox
  gems: ChromeBox
  messageTop: number
}

export function chromeBoxes(l: Pick<Layout, 'cssW'>): Chrome {
  const w = FLOAT_BTN * 3 + CHROME_PAD * 2
  return {
    buttons: { x: l.cssW - CHROME_PAD - w, y: CHROME_PAD, w, h: FLOAT_BTN },
    gems: { x: CHROME_PAD, y: CHROME_PAD, w: GEM_PILL_W, h: GEM_PILL_H },
    messageTop: CHROME_PAD * 2 + FLOAT_BTN,
  }
}
