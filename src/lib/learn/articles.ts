/** /learn 기사 레지스트리. 새 글 = src/content/learn/*.ts 하나 + 여기 한 줄. 순서 = 허브 노출 순서. */
import type { Article } from './types'
import { margolus } from '@/content/learn/margolus'
import { materialsAsData } from '@/content/learn/materials-as-data'
import { history } from '@/content/learn/history'

export const ARTICLES: Article[] = [margolus, materialsAsData, history]

export function articleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug)
}

export function wordCount(a: Article): number {
  return a.sections
    .flatMap((s) => [s.heading, ...s.paragraphs])
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
}
