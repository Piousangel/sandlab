/**
 * 새 셸 전체 모양(타입 계약용 — shell/contract.ts가 classic.ts와 대조한다). 런타임에는 쓰지 않는다:
 * 프리뷰 빌드(NEXT_PUBLIC_UI=next)는 `@ui-shell`을 import한 파일마다 그 페이지 영역(area-*.ts)으로 치환한다(next.config.ts SHELL_AREAS).
 * P11 전에는 이 파일 하나로 치환해 모든 페이지가 모든 화면의 JS·CSS를 실었다(글 페이지에 엔진 청크, CSS 56KB).
 *
 * 영역: root(layout — 토큰·셸 크롬 CSS·서체), content(P10 글 페이지·P3 헤더/푸터), home(P6), gallery(P9),
 * play(P8), spill(P4 HUD·P5 결과), daily(P4 시작 화면·P7 지층). 영역끼리 이름이 겹치면 `export *`가 TS2308로 막는다.
 */
export * from './area-root'
export * from './area-content'
export * from './area-home'
export * from './area-gallery'
export * from './area-play'
export * from './area-spill'
export * from './area-daily'
