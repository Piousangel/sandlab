/**
 * 리디자인 셸 전환 플래그(S6). 런타임 쿠키 분기는 하지 않는다 — 정적 export에서 깜빡임·하이드레이션 문제.
 *
 * - `NEXT_PUBLIC_UI=next` 로 빌드하면 새 셸(프리뷰 Worker `sandlab-preview`), 없으면 지금 화면(classic, prod).
 * - Next가 빌드 때 `process.env.NEXT_PUBLIC_UI`를 상수로 굽는다 → 분기는 빌드마다 한쪽만 남는다.
 * - 새 셸의 모듈(폰트·토큰 CSS)은 next.config.ts의 `@ui-shell` 별칭으로만 들어온다. prod 빌드 그래프에는 없다.
 * - 컷오버(P12) = prod 빌드에 이 변수 1줄 추가, 롤백 = 그 줄 삭제.
 */
export type UiMode = 'classic' | 'next'

export function uiMode(value: string | undefined = process.env.NEXT_PUBLIC_UI): UiMode {
  return value === 'next' ? 'next' : 'classic'
}

export const UI_NEXT: boolean = uiMode() === 'next'
