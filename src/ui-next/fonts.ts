import localFont from 'next/font/local'

/*
 * 리디자인 v2 서체(S8). 파일은 scripts/fonts/build-fonts.py로 만든 정적 인스턴스 + 라틴 서브셋(OFL.txt 동봉).
 * - preload: false — P1에서는 아직 화면에 쓰지 않는다. 새 셸이 첫 화면에 쓰기 시작하면(P3)
 *   Display만 preload로 바꾸고 LCP를 실측한다(DECISIONS 2026-11-19 웹폰트 도입).
 * - adjustFontFallback: 폴백(Arial) 메트릭을 size-adjust로 맞춰 swap 때 CLS를 줄인다.
 * - 이 모듈은 새 셸(shell/next.ts)에서만 import한다. prod 빌드 그래프에 들어가면 @font-face CSS가 모든 페이지에 붙는다.
 */
export const bricolage = localFont({
  src: [
    { path: './fonts/bricolage-grotesque-400-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/bricolage-grotesque-700-latin.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--sl-font-bricolage',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

export const jetbrainsMono = localFont({
  src: [{ path: './fonts/jetbrains-mono-500-latin.woff2', weight: '500', style: 'normal' }],
  variable: '--sl-font-jbmono',
  display: 'swap',
  preload: false,
  // 모노 폴백은 Arial 메트릭 보정이 오히려 어긋나므로 끈다(고정폭 → 고정폭 폴백)
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
})
