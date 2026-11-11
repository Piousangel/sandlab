/** 레벨 공략 레지스트리. 새 레벨 = 레벨 파일 + src/content/guides/<world>.ts에 공략 하나(테스트가 누락을 막는다). */
import type { LevelGuide } from './types'
import { W1_GUIDES } from '@/content/guides/w1'

export const GUIDES: LevelGuide[] = [...W1_GUIDES]

export function guideFor(id: string): LevelGuide | undefined {
  return GUIDES.find((g) => g.id === id)
}

/** 공략 본문 전체(단어 수·중복 검사가 같은 텍스트를 보도록 한 곳에서 정의) */
export function guideText(g: LevelGuide): string {
  return [g.lesson, ...g.sections.flatMap((s) => [s.heading, ...s.paragraphs]), ...g.hints].join(' ')
}

export function guideWords(g: LevelGuide): number {
  return guideText(g).split(/\s+/).filter(Boolean).length
}
