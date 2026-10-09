import Link from 'next/link'
import ContentShell from '@/components/ContentShell'
import { guideMaterials, materialStaticParams, reactionsOf } from '@/lib/guide/reactions'
import { COPY } from '@/lib/guide/copy'
import { PRESETS } from '@/lib/sand/materials'

const COUNT = guideMaterials().length

export const metadata = {
  title: 'Sandlab materials guide — every element and how it reacts',
  description: `All ${COUNT} Sandlab materials explained: how sand, water, lava, acid, fire and the rest move, and exactly what happens when two of them touch.`,
  alternates: { canonical: '/materials' },
}

const GROUPS: { label: string; movement: string }[] = [
  { label: 'Solids', movement: 'static' },
  { label: 'Powders', movement: 'powder' },
  { label: 'Liquids', movement: 'liquid' },
  { label: 'Gases', movement: 'gas' },
]

const nameOf = (slug: string) => PRESETS.find((m) => m.slug === slug)?.name ?? slug
const pageSlugs = new Set(materialStaticParams().map((p) => p.slug))

export default function Page() {
  const mats = guideMaterials()
  // 반응 목록: 반응이 있는 쌍만 행으로(18×18 표는 대부분 빈칸이라 읽기 어렵다)
  const pairs = PRESETS.flatMap((m) =>
    m.reactions.map((r) => ({
      a: m.slug,
      b: r.with,
      chance: r.chance,
      text: reactionsOf(m.slug).undergoes.find((u) => u.partner === r.with)!.text,
    })),
  )
  return (
    <ContentShell>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Materials guide</h1>
      <p style={{ opacity: 0.85 }}>
        Sandlab simulates 720,000 cells at once, and every cell holds one of the {COUNT} materials below or
        nothing at all. Each material has a weight, a way of moving and a short list of reactions. Heavier
        materials sink through lighter ones, powders pile up, liquids find their level and gases rise. When two
        materials touch, the reaction table decides what happens next. The materials with the most going on have
        their own page with experiments to try; the rest are described here. How the table itself works is
        explained in <Link href="/learn/materials-as-data" style={{ color: '#eef1f6' }}>Materials as data</Link>.
      </p>
      {GROUPS.map((g) => (
        <section key={g.label}>
          <h2 style={{ fontSize: 20, marginTop: 32 }}>{g.label}</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 14 }}>
            {mats
              .filter((m) => m.movement === g.movement)
              .map((m) => (
                <li key={m.slug} id={m.slug} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span
                    aria-hidden
                    style={{ width: 12, height: 12, borderRadius: 3, background: m.color, flex: '0 0 auto', transform: 'translateY(1px)' }}
                  />
                  <span>
                    {pageSlugs.has(m.slug) ? (
                      <Link href={`/materials/${m.slug}`} style={{ color: '#eef1f6', fontWeight: 600 }}>
                        {m.name}
                      </Link>
                    ) : (
                      <strong>{m.name}</strong>
                    )}
                    <span style={{ opacity: 0.75 }}> — {COPY[m.slug].summary}</span>
                    {!pageSlugs.has(m.slug) && (
                      <>
                        {COPY[m.slug].body.map((p) => (
                          <span key={p} style={{ display: 'block', marginTop: 6, opacity: 0.75, fontSize: 15 }}>
                            {p}
                          </span>
                        ))}
                        <span style={{ display: 'block', marginTop: 6, opacity: 0.65, fontSize: 14 }}>
                          Tip: {COPY[m.slug].tip}
                        </span>
                      </>
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <section>
        <h2 style={{ fontSize: 20, marginTop: 32 }}>Every reaction</h2>
        <p style={{ opacity: 0.85 }}>
          Reactions happen when two cells touch. The odds are per contact check: each tick, cells that touch
          inside the same two-by-two block of the grid are checked against the table, so even a small chance
          tends to happen soon after contact. This table is generated from the same data the simulation runs on.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', opacity: 0.6 }}>
                <th style={{ padding: '6px 8px 6px 0' }}>Material</th>
                <th style={{ padding: '6px 8px' }}>What happens</th>
                <th style={{ padding: '6px 0 6px 8px', textAlign: 'right' }}>Odds per check</th>
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
        </div>
      </section>
    </ContentShell>
  )
}
