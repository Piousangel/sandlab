/**
 * 리디자인 셸 전환 플래그(S6). 런타임 쿠키 분기는 하지 않는다 — 정적 export에서 깜빡임·하이드레이션 문제.
 *
 * - `NEXT_PUBLIC_UI=next` 로 빌드하면 새 셸(Glass & Grain), 아니면 옛 화면(classic).
 * - Next가 빌드 때 `process.env.NEXT_PUBLIC_UI`를 상수로 굽는다 → 분기는 빌드마다 한쪽만 남는다.
 * - 새 셸의 모듈(폰트·토큰 CSS)은 next.config.ts의 `@ui-shell` 별칭으로만 들어온다. classic 빌드 그래프에는 없다.
 * - 컷오버(P12, 11-20): prod 빌드(package.json `build:prod`)가 `NEXT_PUBLIC_UI=${SANDLAB_UI:-next}` — 기본이 새 셸.
 *   #108(72시간 판정 '유지')에서 옛 홈·갤러리·결과 카드를 지웠다 — `SANDLAB_UI=classic` 빌드는 next.config.ts가 멈추고, 되돌리기는 revert PR(런북: DECISIONS 'P12 컷오버').
 * - 색인 금지는 UI와 따로 `NEXT_PUBLIC_NOINDEX=1`(프리뷰 빌드만) — 컷오버 전에는 UI_NEXT가 곧 프리뷰라 noindex를 겸했다.
 */
export type UiMode = 'classic' | 'next'

export function uiMode(value: string | undefined = process.env.NEXT_PUBLIC_UI): UiMode {
  return value === 'next' ? 'next' : 'classic'
}

export const UI_NEXT: boolean = uiMode() === 'next'

/** 프리뷰 Worker 빌드(build:preview)만 1 — robots.txt 전체 차단 + 메타 robots noindex. prod(build:prod)는 비운다(verify-ads가 확인). */
export function noIndex(value: string | undefined = process.env.NEXT_PUBLIC_NOINDEX): boolean {
  return value === '1'
}

export const NOINDEX: boolean = noIndex()
