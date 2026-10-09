import Link from 'next/link'
import { notFound } from 'next/navigation'
import ContentShell from '@/components/ContentShell'
import JsonLd, { AUTHOR, breadcrumbs } from '@/components/JsonLd'
import { ARTICLES, articleBySlug } from '@/lib/learn/articles'
import { SITE } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const a = articleBySlug(slug)
  if (!a) return {}
  return {
    title: `${a.title} — Sandlab`,
    description: a.description,
    alternates: { canonical: `/learn/${a.slug}` },
    openGraph: { title: a.title, description: a.description, type: 'article', url: `/learn/${a.slug}`, publishedTime: a.published, modifiedTime: a.updated, authors: ['Piousangel'] },
    twitter: { card: 'summary_large_image', title: a.title, description: a.description },
  }
}

const fmt = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export default async function Page({ params }: Props) {
  const { slug } = await params
  const a = articleBySlug(slug)
  if (!a) notFound()
  const others = ARTICLES.filter((o) => o.slug !== a.slug)
  return (
    <ContentShell>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.title,
          description: a.description,
          datePublished: a.published,
          dateModified: a.updated,
          author: AUTHOR,
          publisher: { '@type': 'Organization', name: 'Sandlab', url: SITE },
          mainEntityOfPage: `${SITE}/learn/${a.slug}`,
        }}
      />
      <JsonLd data={breadcrumbs(SITE, [{ name: 'Learn', path: '/learn' }, { name: a.title, path: `/learn/${a.slug}` }])} />
      <p style={{ margin: '0 0 8px', fontSize: 14 }}>
        <Link href="/learn" style={{ color: '#eef1f6', opacity: 0.6 }}>← Learn</Link>
      </p>
      <article>
        <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 10px' }}>{a.title}</h1>
        <p style={{ fontSize: 13.5, opacity: 0.55, margin: '0 0 24px' }}>
          By Piousangel · Published {fmt(a.published)}
          {a.updated !== a.published && ` · Updated ${fmt(a.updated)}`}
        </p>
        {a.sections.map((s) => (
          <section key={s.heading}>
            <h2 style={{ fontSize: 21, marginTop: 30 }}>{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {s.code && (
              <pre
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  overflowX: 'auto',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <code>{s.code}</code>
              </pre>
            )}
          </section>
        ))}
        <h2 style={{ fontSize: 18, marginTop: 36 }}>Sources</h2>
        <ul style={{ paddingLeft: 20, fontSize: 14, opacity: 0.8 }}>
          {a.sources.map((s) =>
            s.url ? (
              <li key={s.label}>
                <a href={s.url} style={{ color: '#eef1f6' }} rel="noopener">{s.label}</a>
              </li>
            ) : (
              <li key={s.label}>{s.label} (Sandlab source code)</li>
            ),
          )}
        </ul>
      </article>
      <h2 style={{ fontSize: 18, marginTop: 36 }}>Keep reading</h2>
      <ul style={{ paddingLeft: 20 }}>
        {others.map((o) => (
          <li key={o.slug}>
            <Link href={`/learn/${o.slug}`} style={{ color: '#eef1f6' }}>{o.title}</Link>
          </li>
        ))}
        <li>
          <Link href="/materials" style={{ color: '#eef1f6' }}>Materials guide</Link>
        </li>
      </ul>
    </ContentShell>
  )
}
