import Link from 'next/link'
import { notFound } from 'next/navigation'
import ContentShell from '@/components/ContentShell'
import JsonLd, { breadcrumbs } from '@/components/JsonLd'
import { chanceLabel, materialBySlug, materialStaticParams, reactionsOf, type ReactionLine } from '@/lib/guide/reactions'
import { COPY } from '@/lib/guide/copy'
import { SITE } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return materialStaticParams()
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const m = materialBySlug(slug)
  if (!m || !COPY[slug]?.page) return {}
  const title = `${m.name} in Sandlab — how it moves and what it reacts with`
  return {
    title,
    description: COPY[slug].summary,
    alternates: { canonical: `/materials/${slug}` },
    openGraph: { title, description: COPY[slug].summary, url: `/materials/${slug}` },
    twitter: { card: 'summary_large_image', title, description: COPY[slug].summary },
  }
}

const MOVES: Record<string, string> = {
  static: 'Solid — stays where you paint it',
  powder: 'Powder — falls and piles up',
  liquid: 'Liquid — flows and levels out',
  gas: 'Gas — rises, then fades',
}

const pageSlugs = new Set(materialStaticParams().map((p) => p.slug))
const hrefOf = (slug: string) => (pageSlugs.has(slug) ? `/materials/${slug}` : `/materials#${slug}`)

export default async function Page({ params }: Props) {
  const { slug } = await params
  const m = materialBySlug(slug)
  const copy = COPY[slug]
  if (!m || !copy?.page) notFound()
  const { causes, undergoes } = reactionsOf(slug)
  const lower = m.name.toLowerCase()
  const row = (r: ReactionLine) => (
    <li key={r.partner + r.text} style={{ marginBottom: 6 }}>
      {r.text}{' '}
      <span style={{ opacity: 0.6, fontSize: 14 }}>
        ({chanceLabel(r.chance)}, {Math.round(r.chance * 100)}% per contact check)
      </span>{' '}
      <Link href={hrefOf(r.partner)} style={{ color: '#eef1f6', opacity: 0.7, fontSize: 14 }} aria-label={`About ${r.partner}`}>
        →
      </Link>
    </li>
  )
  return (
    <ContentShell>
      <JsonLd data={breadcrumbs(SITE, [{ name: 'Materials', path: '/materials' }, { name: m.name, path: `/materials/${slug}` }])} />
      <p style={{ margin: '0 0 8px', fontSize: 14 }}>
        <Link href="/materials" style={{ color: '#eef1f6', opacity: 0.6 }}>← All materials</Link>
      </p>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-hidden style={{ width: 22, height: 22, borderRadius: 5, background: m.color }} />
        {m.name}
      </h1>
      <p style={{ fontSize: 18, opacity: 0.9 }}>{copy.summary}</p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px', fontSize: 14, opacity: 0.8 }}>
        <dt>Movement</dt>
        <dd style={{ margin: 0 }}>{MOVES[m.movement]}</dd>
        <dt>Weight</dt>
        <dd style={{ margin: 0 }}>{m.density} / 9 (heavier sinks through lighter)</dd>
        <dt>Lifetime</dt>
        <dd style={{ margin: 0 }}>{m.lifetime === null ? 'Permanent' : 'Short-lived — fades into empty space'}</dd>
        <dt>Glow</dt>
        <dd style={{ margin: 0 }}>{m.emissive === 0 ? 'None' : m.emissive >= 2 ? 'Bright' : 'Faint'}</dd>
      </dl>
      {copy.body.map((p) => (
        <p key={p}>{p}</p>
      ))}

      {copy.experiments && copy.experiments.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, marginTop: 28 }}>Try it yourself</h2>
          <ol style={{ paddingLeft: 20 }}>
            {copy.experiments.map((e) => (
              <li key={e.title} style={{ marginBottom: 10 }}>
                <strong>{e.title}.</strong> {e.steps}
              </li>
            ))}
          </ol>
        </>
      )}

      <h2 style={{ fontSize: 20, marginTop: 28 }}>Reactions</h2>
      {causes.length + undergoes.length === 0 ? (
        <p style={{ opacity: 0.85 }}>
          {m.name} has no reactions in Sandlab: nothing it touches changes it, and it changes nothing. What it does
          depends only on its weight and how it moves.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 14, opacity: 0.7 }}>
            Odds are per contact check: each tick, touching cells inside the same two-by-two block are checked
            against the reaction table, so even a small chance happens soon after contact.
          </p>
          {undergoes.length > 0 && (
            <>
              <h3 style={{ fontSize: 17, marginTop: 18 }}>When {lower} touches something</h3>
              <ul style={{ paddingLeft: 20 }}>{undergoes.map(row)}</ul>
            </>
          )}
          {causes.length > 0 && (
            <>
              <h3 style={{ fontSize: 17, marginTop: 18 }}>When something touches {lower}</h3>
              <ul style={{ paddingLeft: 20 }}>{causes.map(row)}</ul>
            </>
          )}
        </>
      )}
      <h2 style={{ fontSize: 20, marginTop: 28 }}>Tip</h2>
      <p>{copy.tip}</p>
      <p style={{ marginTop: 28 }}>
        <a href="/" style={{ color: '#07090D', background: '#eef1f6', padding: '10px 16px', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>
          Try {lower} in the sandbox
        </a>
      </p>
    </ContentShell>
  )
}
