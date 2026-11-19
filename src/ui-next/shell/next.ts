/**
 * 새 셸(NEXT_PUBLIC_UI=next 빌드에서만 `@ui-shell`이 이 파일로 바뀐다 — next.config.ts).
 * P1: 토큰 CSS와 서체 변수. P3: 헤더(wordmark·내비·데일리 pill·메뉴 시트)·푸터와 그 스타일.
 * P4: Spill 플레이 HUD(헤더·목표 줄·보드 유리·도구 트레이)와 데일리 시작 화면.
 * 새 셸 코드는 전부 이 파일에서부터 import 그래프로 들어온다 — 기존 페이지·layout이 ui-next 모듈을 직접 import하지 않는다.
 * 내보내는 모양은 classic.ts와 같아야 한다(shell/contract.ts가 타입으로 검사).
 */
import '../tokens.css'
import './shell.css'
import '../spill/spill.css'
import { bricolage, jetbrainsMono } from '../fonts'

export const shellHtmlProps: { className?: string } = { className: `${bricolage.variable} ${jetbrainsMono.variable}` }

export { ShellHeader } from './ShellHeader'
export { ShellFooter } from './ShellFooter'
export { SpillHud } from '../spill/SpillHud'
export { DailyStart } from '../spill/DailyStart'
