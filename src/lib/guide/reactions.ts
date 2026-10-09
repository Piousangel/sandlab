/**
 * 재료 가이드용 반응 문장 — materials.ts(SSOT)에서 유도한다.
 *
 * 반응 의미(셰이더와 동일): self 재료가 `with`에 닿으면 틱당 `chance` 확률로
 * self → `become`, 닿은 이웃 → `other`. 'self' = 그대로(이웃 쪽이면 self 재료로 바뀜), 'empty' = 사라짐.
 * 각 반응은 두 페이지에 한 번씩 나온다: self 페이지의 undergoes, with 페이지의 causes.
 * 수치만 자동이고, 설명문은 copy.ts에 손으로 쓴다(템플릿 문장은 저가치 판정 위험).
 */
import { PRESETS, type Material, type Reaction } from '@/lib/sand/materials'
import { COPY } from './copy'

export interface ReactionLine {
  partner: string
  chance: number
  text: string
}

export function guideMaterials(): Material[] {
  return PRESETS.filter((m) => m.slug !== 'empty')
}

export function materialBySlug(slug: string): Material | undefined {
  return guideMaterials().find((m) => m.slug === slug)
}

const nameOf = (slug: string) => PRESETS.find((m) => m.slug === slug)?.name ?? slug

/** 반응 결과(slug 또는 'empty')를 동사구로. */
function phrase(result: string): string {
  return result === 'empty' ? 'dissolves away' : `turns into ${nameOf(result)}`
}

/**
 * 반응 하나를 두 페이지용 문장으로. 바뀌지 않는 쪽은 문장에서 뺀다("the Water stays Water" 같은
 * 군더더기는 자동 생성 티가 나서 AdSense 저가치 판정 근거가 된다 — 2026-10-09 적대적 감사).
 */
function lines(self: Material, r: Reaction) {
  const W = nameOf(r.with)
  const S = self.name
  const selfR = r.become === 'self' ? self.slug : r.become
  const otherR = r.other === 'self' ? self.slug : r.other
  const selfChanges = selfR !== self.slug
  const otherChanges = otherR !== r.with
  let undergoes: string
  let causes: string
  if (selfChanges && otherChanges) {
    undergoes = `Touching ${W}: ${phrase(selfR)}, and the ${W} ${phrase(otherR)}.`
    causes = `Touching ${S}: the ${S} ${phrase(selfR)}, and this ${W} ${phrase(otherR)}.`
  } else if (selfChanges) {
    undergoes = `Touching ${W}: ${phrase(selfR)}.`
    causes = `Touching ${S}: the ${S} ${phrase(selfR)}.`
  } else {
    undergoes =
      otherR === 'empty' ? `Touching ${W}: dissolves the ${W}.` : `Touching ${W}: turns the ${W} into ${nameOf(otherR)}.`
    causes = `Touching ${S}: this ${W} ${phrase(otherR)}.`
  }
  return { undergoes, causes }
}

export function reactionsOf(slug: string): { causes: ReactionLine[]; undergoes: ReactionLine[] } {
  const causes: ReactionLine[] = []
  const undergoes: ReactionLine[] = []
  for (const m of PRESETS) {
    for (const r of m.reactions) {
      const t = lines(m, r)
      if (m.slug === slug) undergoes.push({ partner: r.with, chance: r.chance, text: t.undergoes })
      if (r.with === slug) causes.push({ partner: m.slug, chance: r.chance, text: t.causes })
    }
  }
  return { causes, undergoes }
}

export function chanceLabel(chance: number): string {
  if (chance >= 0.7) return 'almost instant'
  if (chance >= 0.3) return 'fast'
  if (chance >= 0.1) return 'steady'
  if (chance >= 0.03) return 'slow'
  return 'very slow'
}

/**
 * /materials/[slug] 정적 생성 목록. 설명문이 page:true인 재료만 개별 페이지를 갖는다 —
 * 할 말이 적은 재료(벽·재·증기·연기)까지 페이지를 만들면 얇은 템플릿 페이지가 된다(2026-10-09 감사).
 */
export function materialStaticParams(): { slug: string }[] {
  return guideMaterials()
    .filter((m) => COPY[m.slug]?.page)
    .map((m) => ({ slug: m.slug }))
}
