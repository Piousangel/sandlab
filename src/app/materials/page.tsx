import Link from 'next/link'
import ContentShell from '@/components/ContentShell'
import { guideMaterials, reactionsOf } from '@/lib/guide/reactions'
import { COPY } from '@/lib/guide/copy'
import { PRESETS } from '@/lib/sand/materials'

export const metadata = {
  title: 'Sandlab materials guide — every element and how it reacts',
  description:
    'All 18 Sandlab materials explained: how sand, water, lava, acid, fire and the rest move, and exactly what happens when two of them touch.',
  alternates: { canonical: '/materials' },
}

const GROUPS: { label: string; movement: string }[] = [
  { label: 'Solids', movement: 'static' },
  { label: 'Powders', movement: 'powder' },
  { label: 'Liquids', movement: 'liquid' },
  { label: 'Gases', movement: 'gas' },
]

const nameOf = (slug: string) => PRESETS.find((m) => m.slug === slug)?.name ?? slug

export default function Page() {
  const mats = guideMaterials()
  // 반응 매트릭스: 반응이 하나라도 있는 쌍만 행으로 나열(18×18 표는 대부분 빈칸이라 읽기 어렵다)
  const pairs = PRESETS.flatMap((m) =>
    m.reactions.map((r) => ({ a: m.slug, b: r.with, chance: r.chance, text: reactionsOf(m.slug).undergoes.find((u) => u.partner === r.with)!.text })),
  )
  return (
    <ContentShell>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Materials guide</h1>
      <p style={{ opacity: 0.8 }}>
        Sandlab simulates about 720,000 cells at once, and every cell is one of the materials below. Each
        material has a weight, a way of moving and a short list of reactions. Heavier materials sink through
        lighter ones, powders pile up, liquids find their level and gases rise. When two materials touch,
        the reaction table decides what happens next. This guide explains each material in plain words and
        lists every reaction with how quickly it happens.
      </p>
      {GROUPS.map((g) => (
        <section key={g.label}>
          <h2 style={{ fontSize: 20, marginTop: 32 }}>{g.label}</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {mats
              .filter((m) => m.movement === g.movement)
              .map((m) => (
                <li key={m.slug} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span
                    aria-hidden
                    style={{ width: 12, height: 12, borderRadius: 3, background: m.color, flex: '0 0 auto', transform: 'translateY(1px)' }}
                  />
                  <span>
                    <Link href={`/materials/${m.slug}`} style={{ color: '#eef1f6', fontWeight: 600 }}>
                      {m.name}
                    </Link>
                    <span style={{ opacity: 0.7 }}> — {COPY[m.slug].summary}</span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <section>
        <h2 style={{ fontSize: 20, marginTop: 32 }}>Every reaction</h2>
        <p style={{ opacity: 0.8 }}>
          Reactions happen when two cells touch. The chance is per simulation tick, and the simulation runs
          about sixty ticks a second, so even a 5% chance happens within a second or two of contact.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.6 }}>
              <th style={{ padding: '6px 8px 6px 0' }}>Material</th>
              <th style={{ padding: '6px 8px' }}>What happens</th>
              <th style={{ padding: '6px 0 6px 8px', textAlign: 'right' }}>Chance / tick</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((p) => (
              <tr key={`${p.a}-${p.b}`} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '6px 8px 6px 0', whiteSpace: 'nowrap' }}>{nameOf(p.a)}</td>
                <td style={{ padding: '6px 8px' }}>{p.text}</td>
                <td style={{ padding: '6px 0 6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(p.chance * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ContentShell>
  )
}
