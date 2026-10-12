import { computeScale } from './canvas'

export const HEADER_H = 44
export const TRAY_MIN = 64
export const PANEL_W = 320
export const DESKTOP_MIN = 900
export const NAV_COLLAPSE = 400
export const FLOAT_BTN = 44

export interface LayoutInput {
  vw: number
  vh: number
  dpr: number
  safeBottom?: number
}

export interface Layout {
  vw: number
  vh: number
  desktop: boolean
  navCollapsed: boolean
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
  const availH = vh - HEADER_H - TRAY_MIN - safeBottom
  const s = computeScale(Math.max(0, stageW), Math.max(0, availH), dpr)
  const trayH = Math.max(TRAY_MIN, vh - HEADER_H - s.cssH - safeBottom)
  return {
    vw,
    vh,
    desktop,
    navCollapsed: vw < NAV_COLLAPSE,
    headerH: HEADER_H,
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
