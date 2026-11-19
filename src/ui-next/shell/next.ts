/**
 * 새 셸(NEXT_PUBLIC_UI=next 빌드에서만 `@ui-shell`이 이 파일로 바뀐다 — next.config.ts).
 * P1: 토큰 CSS와 서체 변수만 단다(화면에 쓰는 곳은 아직 없음). P3부터 헤더·내비·푸터가 여기로 들어온다.
 */
import '../tokens.css'
import { bricolage, jetbrainsMono } from '../fonts'

export const shellHtmlProps: { className?: string } = { className: `${bricolage.variable} ${jetbrainsMono.variable}` }
