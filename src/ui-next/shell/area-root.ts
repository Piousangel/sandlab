/**
 * 새 셸 영역: 루트 layout(모든 페이지). 토큰·서체·셸 크롬(헤더·시트·푸터·광고 안내판) CSS만.
 * 페이지별 CSS·컴포넌트는 같은 폴더의 area-*.ts — `@ui-shell`을 누가 import하느냐로 next.config.ts가 고른다(P11 LCP).
 * 서체는 next/font가 아니라 fonts.css의 @font-face(글자 범위 core/ext 분리 — P12 LCP). <html> class는 프리뷰 빌드 표식이다
 * (scripts/preview-headers.mjs·qa:preview가 `<html class>`로 새 셸이 들어갔는지 본다).
 */
import '../tokens.css'
import '../fonts.css'
import './shell.css'

export const shellHtmlProps: { className?: string } = { className: 'sl-next' }
