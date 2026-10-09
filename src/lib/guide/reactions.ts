/**
 * 재료 가이드용 반응 문장 — materials.ts(SSOT)에서 유도한다.
 *
 * 반응 의미(셰이더와 동일): self 재료가 `with`에 닿으면 틱당 `chance` 확률로
 * self → `become`, 닿은 이웃 → `other`. 'self' = 그대로(이웃 쪽이면 self 재료로 바뀜), 'empty' = 사라짐.
 * 각 반응은 두 페이지에 한 번씩 나온다: self 페이지의 undergoes, with 페이지의 causes.
 * 수치만 자동이고, 설명문은 copy.ts에 손으로 쓴다(템플릿 문장은 저가치 판정 위험).
 */
import { PRESETS, type Material, type Reaction } from '@/lib/sand/materials'

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

/** subject(재료 slug)가 result로 바뀌는 것을 서술. 'self'는 subject 그대로. */
function outcome(subject: string, result: string, selfSlug: string): string {
  if (result === 'empty') return 'dissolves away'
  const target = result === 'self' ? selfSlug : result
  if (target === subject) return `stays ${nameOf(subject)}`
  return `turns into ${nameOf(target)}`
}

function lines(self: Material, r: Reaction) {
  const selfName = self.name
  const withName = nameOf(r.with)
  const selfOut = r.become === 'self' ? `stays ${selfName}` : outcome(self.slug, r.become, self.slug)
  const otherOut = outcome(r.with, r.other, self.slug)
  return {
    undergoes: `Touching ${withName}: ${selfOut}; the ${withName} ${otherOut}.`,
    causes: `Touching ${selfName}: the ${selfName} ${selfOut}; this ${withName} ${otherOut}.`,
  }
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
