import Link from 'next/link'
import { notFound } from 'next/navigation'
import ContentShell from '@/components/ContentShell'
import JsonLd, { AUTHOR, breadcrumbs } from '@/components/JsonLd'
import { LEVELS } from '@/lib/spill/levels'
import { levelById, ordered, worldName } from '@/lib/spill/client/catalog'
import { describeLevel } from '@/lib/spill/client/describe'
import { GUIDES, guideFor } from '@/lib/spill/guide/guides'
import { SITE } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return GUIDES.filter((g) => levelById(LEVELS, g.id)).map((g) => ({ id: g.id }))
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const g = guideFor(id)
  if (!g) return {}
  const path = `/play/${g.id}/guide`
  return {
    title: `${g.title} — Sandlab Spill`,
    description: g.description,
    alternates: { canonical: path },
    openGraph: { title: g.title, description: g.description, type: 'article', url: path, publishedTime: g.published, modifiedTime: g.updated, authors: ['Piousangel'] },
    twitter: { card: 'summary_large_image', title: g.title, description: g.description },
  }
}

const fmt = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const a = { color: '#eef1f6' } as const
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' } as const

export default async function Page({ params }: Props) {
  const { id } = await params
  const g = guideFor(id)
  const level = levelById(LEVELS, id)
  if (!g || !level) notFound()
  const d = describeLevel(level)
  const levels = ordered(LEVELS)
  const i = levels.findIndex((l) => l.id === id)
  const prev = i > 0 ? levels[i - 1] : null
  const next = levels[i + 1] ?? null
  const path = `/play/${g.id}/guide`
  return (
    <ContentShell>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: g.title,
          description: g.description,
          datePublished: g.published,
          dateModified: g.updated,
          author: AUTHOR,
          publisher: { '@type': 'Organization', name: 'Sandlab', url: SITE },
          mainEntityOfPage: `${SITE}${path}`,
        }}
      />
      <JsonLd
        data={breadcrumbs(SITE, [
          { name: 'Challenges', path: '/play' },
          { name: `${level.id} ${level.name}`, path: `/play/${level.id}` },
          { name: 'Guide', path },
        ])}
      />
      <p style={{ margin: '0 0 8px', fontSize: 14 }}>
        <a href="/play" style={{ ...a, opacity: 0.6 }}>← All levels</a>
      </p>
      <article>
        <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 10px' }}>{g.title}</h1>
        <p style={{ fontSize: 13.5, opacity: 0.55, margin: '0 0 20px' }}>
          World {level.world}: {worldName(level.world)} · By Piousangel · Published {fmt(g.published)}
          {g.updated !== g.published && ` · Updated ${fmt(g.updated)}`}
        </p>

        <div style={card}>
          <p style={{ margin: '0 0 8px' }}><strong>What this level teaches:</strong> {g.lesson}</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {d.goals.map((t) => <li key={t}>Goal: {t}</li>)}
            {d.warnings.map((t) => <li key={t}>Avoid: {t}</li>)}
            {d.verbs.map((t) => <li key={t}>{t}</li>)}
            {d.par && <li>{d.par}</li>}
          </ul>
          {/* 캔버스 화면으로 가는 링크는 일반 <a> — 광고 로더가 next/link로 따라가면 안 된다(ContentShell 주석) */}
          <a
            href={`/play/${level.id}`}
            style={{ display: 'inline-block', marginTop: 12, background: '#f5a623', color: '#141414', fontWeight: 700, padding: '10px 16px', borderRadius: 10, textDecoration: 'none' }}
          >
            ▶ Play {level.id} {level.name}
          </a>
        </div>

        {g.sections.map((s) => (
          <section key={s.heading}>
            <h2 style={{ fontSize: 21, marginTop: 30 }}>{s.heading}</h2>
            {s.paragraphs.map((p) => <p key={p}>{p}</p>)}
          </section>
        ))}

        <h2 style={{ fontSize: 21, marginTop: 30 }}>Hints</h2>
        <p style={{ opacity: 0.75 }}>Open one at a time. The second one nearly gives it away.</p>
        {g.hints.map((h, k) => (
          <details key={h} style={{ ...card, marginTop: 10 }}>
            <summary style={{ cursor: 'pointer' }}>Hint {k + 1}</summary>
            <p style={{ margin: '10px 0 0' }}>{h}</p>
          </details>
        ))}
      </article>

      <nav style={{ marginTop: 36, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 15 }}>
        {prev && <Link href={`/play/${prev.id}/guide`} style={a}>← {prev.id} {prev.name} guide</Link>}
        {next && <Link href={`/play/${next.id}/guide`} style={a}>{next.id} {next.name} guide →</Link>}
        <Link href="/learn" style={a}>How the physics works</Link>
      </nav>
    </ContentShell>
  )
}
