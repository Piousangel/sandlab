import Link from 'next/link'
import { notFound } from 'next/navigation'
import ContentShell from '@/components/ContentShell'
import { chanceLabel, materialBySlug, materialStaticParams, reactionsOf } from '@/lib/guide/reactions'
import { COPY } from '@/lib/guide/copy'

export const dynamicParams = false

export function generateStaticParams() {
  return materialStaticParams()
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const m = materialBySlug(slug)
  if (!m) return {}
  return {
    title: `${m.name} in Sandlab — how it moves and what it reacts with`,
    description: COPY[slug].summary,
    alternates: { canonical: `/materials/${slug}` },
  }
}

const MOVES: Record<string, string> = {
  static: 'Solid — stays where you paint it',
  powder: 'Powder — falls and piles up',
  liquid: 'Liquid — flows and levels out',
  gas: 'Gas — rises and drifts',
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const m = materialBySlug(slug)
  if (!m) notFound()
  const copy = COPY[slug]
  const { causes, undergoes } = reactionsOf(slug)
  const row = (r: { partner: string; chance: number; text: string }) => (
    <li key={r.partner + r.text} style={{ marginBottom: 6 }}>
      {r.text}{' '}
      <span style={{ opacity: 0.6, fontSize: 14 }}>
        ({chanceLabel(r.chance)}, {Math.round(r.chance * 100)}% per tick)
      </span>{' '}
      <Link href={`/materials/${r.partner}`} style={{ color: '#eef1f6', opacity: 0.7, fontSize: 14 }}>
        →
      </Link>
    </li>
  )
  return (
    <ContentShell>
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
        <dd style={{ margin: 0 }}>{m.lifetime === null ? 'Permanent' : `Fades after about ${Math.round(m.lifetime / 60 * 10) / 10} s`}</dd>
        <dt>Glow</dt>
        <dd style={{ margin: 0 }}>{m.emissive === 0 ? 'None' : m.emissive >= 2 ? 'Bright' : 'Faint'}</dd>
      </dl>
      {copy.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <h2 style={{ fontSize: 20, marginTop: 28 }}>What {m.name.toLowerCase()} does to other materials</h2>
      {causes.length + undergoes.length === 0 ? (
        <p style={{ opacity: 0.8 }}>{m.name} has no reactions. It only moves.</p>
      ) : (
        <>
          {undergoes.length > 0 && <ul style={{ paddingLeft: 20 }}>{undergoes.map(row)}</ul>}
          {causes.length > 0 && (
            <>
              <h2 style={{ fontSize: 20, marginTop: 28 }}>What other materials do to {m.name.toLowerCase()}</h2>
              <ul style={{ paddingLeft: 20 }}>{causes.map(row)}</ul>
            </>
          )}
        </>
      )}
      <h2 style={{ fontSize: 20, marginTop: 28 }}>Tip</h2>
      <p>{copy.tip}</p>
      <p style={{ marginTop: 28 }}>
        <Link href="/" style={{ color: '#07090D', background: '#eef1f6', padding: '10px 16px', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>
          Try {m.name.toLowerCase()} in the sandbox
        </Link>
      </p>
    </ContentShell>
  )
}
