/**
 * 세로 폰 레이아웃 판정과 주입 CSS(스펙 §3 공통 규칙·§9 S1).
 * 인라인 스타일은 자식 선택자·의사 요소를 못 써서 탭 타깃 규칙만 CSS 문자열로 주입한다.
 */

/** 스펙 §3: 탭 타깃 최소 44px */
export const TAP_MIN = 44

/** 데스크톱 기준 폭(스펙 §3: 900px 이상은 데스크톱) */
const DESKTOP_MIN_W = 900

/**
 * 세로(h>w)이면서 데스크톱 폭 미만일 때만 세로 레이아웃. 정사각에 가까운 데스크톱 창(예 1000×1040)은
 * 예전처럼 데스크톱 레이아웃을 쓴다.
 */
export function isPortraitLayout(w: number, h: number): boolean {
  return w < DESKTOP_MIN_W && h > w
}

/**
 * 세로 폰 컨트롤 줄 — 버튼·링크·슬라이더 모두 44px 터치 영역(데스크톱 도크는 그대로).
 * 글자·좌우 여백은 인라인 스타일(S.ghost 등)을 이겨야 해서 !important.
 */
export const PORTRAIT_CSS = `
        .sl-controls-n > button, .sl-controls-n > a { min-height: ${TAP_MIN}px; font-size: 13px !important; padding-left: 10px !important; padding-right: 10px !important; display: inline-flex; align-items: center; justify-content: center; }
        .sl-controls-n input[type=range] { height: ${TAP_MIN}px; width: 88px !important; margin: 0; }
        .sl-controls-n label { min-height: ${TAP_MIN}px; }
`
