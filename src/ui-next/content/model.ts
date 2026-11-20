/**
 * 글 페이지(리디자인 P10) 순수 함수 — 목차 id, 광고 자리, 이전/다음, 인라인 style 걷어내기.
 * 화면 규칙의 근거는 content.css 머리 주석과 DECISIONS 2026-11-20 P10.
 */
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

/** 제목 → 앵커 id(영문 소문자·숫자·하이픈). 같은 문서 안에서 겹치면 -2, -3을 붙인다. */
export function sectionIds(headings: readonly string[]): string[] {
  const seen = new Map<string, number>()
  return headings.map((h) => {
    const base =
      h
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'section'
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  })
}

/** 목차를 보일지 — 섹션이 3개 이상일 때만(짧은 글에 목차는 군더더기). */
export const TOC_MIN = 3
export function showToc(n: number): boolean {
  return n >= TOC_MIN
}

/**
 * 본문 중간 광고를 넣을 섹션 인덱스(이 섹션 **뒤**). 섹션 2개 미만이면 -1(중간 광고 없음 — 글 끝 광고와 붙는다).
 * 가운데에서 앞쪽으로 반올림: 4개 → 1(둘째 뒤), 5개 → 2, 2개 → 0.
 */
export function midAfter(n: number): number {
  return n >= 2 ? Math.ceil(n / 2) - 1 : -1
}

/** 순서 목록에서 이전·다음. 처음·끝은 null. */
export function neighbours<T>(list: readonly T[], i: number): { prev: T | null; next: T | null } {
  if (i < 0) return { prev: null, next: null }
  return { prev: i > 0 ? list[i - 1] : null, next: i + 1 < list.length ? list[i + 1] : null }
}

type WithStyle = { style?: unknown; children?: ReactNode }

/**
 * 옛 다크 화면용 인라인 style을 걷어낸다(새 셸 CSS가 모양을 맡는다). 글자·링크·속성(id·href·aria)은 그대로.
 * ContentShell을 쓰는 산문 페이지(About·Privacy·Terms·Contact·Learn 허브·404)는 prod와 같은 JSX를 받으므로
 * 본문 문장은 손대지 않고 Bone 위 대비만 바로잡는다 — `!important` 덮어쓰기(P4 `.sl-sp-aside`) 대신.
 * 제약: Children.map은 함수(render-prop) children을 버린다 — 대상 페이지는 요소·문자열만 쓴다.
 */
export function stripStyles(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement<WithStyle>(child)) return child
    const { style, children } = child.props
    const next: Partial<WithStyle> & Record<string, unknown> = {}
    if (style !== undefined) next.style = undefined
    if (children !== undefined) next.children = stripStyles(children)
    return Object.keys(next).length ? cloneElement(child as ReactElement<WithStyle>, next) : child
  })
}

/**
 * 산문 페이지의 중간 광고 자리: 최상위 h2 중 가운데 것 **앞**(목록 인덱스). h2가 2개 미만이면 -1.
 * 6개 → 넷째 h2 앞(About: "The gallery").
 */
export function proseMidIndex(nodes: readonly ReactNode[]): number {
  const h2 = nodes.flatMap((n, i) => (isValidElement(n) && n.type === 'h2' ? [i] : []))
  return h2.length >= 2 ? h2[Math.floor(h2.length / 2)] : -1
}
