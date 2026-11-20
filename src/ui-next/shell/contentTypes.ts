/**
 * 글 페이지(리디자인 P10) 계약 타입 — classic.ts(null)·next.ts(실제 컴포넌트)가 같이 쓴다. 타입만(런타임 import 0).
 *
 * 원칙: 본문 문장은 페이지가 넘긴 데이터(기사·공략·재료 문구)에서만 나온다 → prod와 단어·링크·h1이 같다.
 * 새 셸이 더하는 글자(목차 제목, 이전/다음 라벨)는 `data-sl-chrome` 안에만 둔다(parity 검사가 따로 센다).
 */
import type { ReactNode } from 'react'

export type ContentFrameProps = {
  /** 이 페이지가 광고 로더를 싣는가(ContentShell의 ads). */
  ads: boolean
  /** 'index' = 목록 페이지(Learn 허브) — 첫 목록을 카드로. */
  kind?: 'prose' | 'index'
  children: ReactNode
}

export type PageLink = { href: string; label: string }

export type ArticleSectionData = { heading: string; paragraphs: string[]; code?: string }

/** /learn/[slug] — prod 페이지와 같은 문장(제목·바이라인·섹션·출처·Keep reading). */
export type LearnArticleProps = {
  /** JSON-LD(<JsonLd>)를 그대로 받는다(prod와 같은 스크립트). */
  children: ReactNode
  title: string
  /** 바이라인 문자열 그대로 — "By Piousangel · Published 1 May 2026 · Updated …" */
  byline: string
  sections: ArticleSectionData[]
  sources: { label: string; url: string }[]
  others: { slug: string; title: string }[]
  prev: PageLink | null
  next: PageLink | null
}

/** /play/[id]/guide — prod 페이지와 같은 문장(카드·섹션·힌트·이전/다음). */
export type GuideArticleProps = {
  children: ReactNode
  title: string
  byline: string
  lesson: string
  /** 카드 목록 줄(Goal: …, Avoid: …, 동사, par) — prod 순서 그대로 */
  facts: string[]
  play: { href: string; label: string }
  sections: ArticleSectionData[]
  hints: string[]
  prev: PageLink | null
  next: PageLink | null
}

export type MaterialRef = { slug: string; name: string; color: string }

export type ReactionRow = { text: string; chance: string; percent: number; partner: string; href: string }

/** /materials/[slug] */
export type MaterialPageProps = {
  children: ReactNode
  material: MaterialRef
  summary: string
  facts: { label: string; value: string }[]
  body: string[]
  experiments: { title: string; steps: string }[]
  /** "When {lower} touches something" 등 prod 제목과 같은 문자열 */
  undergoesTitle: string
  causesTitle: string
  undergoes: ReactionRow[]
  causes: ReactionRow[]
  noReactions: string
  oddsNote: string
  tip: string
  cta: string
  prev: PageLink | null
  next: PageLink | null
}

/** /materials */
export type MaterialsIndexProps = {
  /** 소개 문단(prod와 같은 JSX — 링크 포함) */
  intro: ReactNode
  groups: {
    label: string
    items: (MaterialRef & { summary: string; page: boolean; body: string[]; tip: string })[]
  }[]
  reactionsTitle: string
  reactionsIntro: string
  /** 표 머리 3칸(prod 그대로) */
  columns: [string, string, string]
  pairs: { key: string; a: MaterialRef; text: string; percent: number }[]
}
