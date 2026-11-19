/**
 * classic 셸(prod 기본). `@ui-shell`이 기본으로 가리키는 모듈 — 아무것도 더하지 않는다(import 0개를 유지한다).
 * 새 셸(next.ts)과 같은 모양을 내보낸다. 빈 객체라 <html>에 속성이 하나도 안 붙고
 * RSC 페이로드(out/*.txt, HTML 안 self.__next_f)도 그대로다(className: undefined로 두면 "$undefined"가 찍힌다).
 * ShellHeader·ShellFooter = null → ContentShell이 지금 헤더·푸터를 그대로 그린다(P3).
 * SpillHud·DailyStart = null → SpillPlayer·DailySpill이 지금 HUD·화면을 그대로 그린다(P4).
 * 아래 `import type`은 컴파일 때 지워진다(런타임 import 0개 유지 — 번들 그래프에 아무것도 더하지 않는다).
 */
import type { DailyStartProps, SpillHudKit } from './spillTypes'

export const shellHtmlProps: { className?: string } = {}

export const ShellHeader: null | (() => React.JSX.Element) = null
export const ShellFooter: null | (() => React.JSX.Element) = null

export const SpillHud: null | SpillHudKit = null
export const DailyStart: null | ((p: DailyStartProps) => React.JSX.Element) = null
