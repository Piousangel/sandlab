/**
 * classic 셸(prod 기본). `@ui-shell`이 기본으로 가리키는 모듈 — 아무것도 더하지 않는다.
 * 새 셸(next.ts)과 같은 모양을 내보낸다. 빈 객체라 <html>에 속성이 하나도 안 붙고
 * RSC 페이로드(out/*.txt, HTML 안 self.__next_f)도 그대로다(className: undefined로 두면 "$undefined"가 찍힌다).
 */
export const shellHtmlProps: { className?: string } = {}
