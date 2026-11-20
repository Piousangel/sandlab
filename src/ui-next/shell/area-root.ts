/**
 * 새 셸 영역: 루트 layout(모든 페이지). 토큰·셸 크롬(헤더·시트·푸터·광고 안내판) CSS와 서체 변수만.
 * 페이지별 CSS·컴포넌트는 같은 폴더의 area-*.ts — `@ui-shell`을 누가 import하느냐로 next.config.ts가 고른다(P11 LCP).
 */
import '../tokens.css'
import './shell.css'
import { bricolage, jetbrainsMono } from '../fonts'

export const shellHtmlProps: { className?: string } = { className: `${bricolage.variable} ${jetbrainsMono.variable}` }
