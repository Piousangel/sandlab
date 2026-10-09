import Link from 'next/link'
import ContentShell from '@/components/ContentShell'
import { ARTICLES, wordCount } from '@/lib/learn/articles'

export const metadata = {
  title: 'Learn — how Sandlab and falling-sand games work',
  description:
    'Long-form articles on how Sandlab simulates falling sand on the GPU, how its materials are defined, and where the genre came from.',
  alternates: { canonical: '/learn' },
}

const fmt = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export default function Page() {
  return (
    <ContentShell>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Learn</h1>
      <p style={{ opacity: 0.85 }}>
        Sandlab is small enough that one person can explain all of it. These articles go through how the
        simulation actually works, with the code and the test results behind each claim, and where the
        falling-sand genre came from. They are written for curious players and for developers who want to
        build something similar. Every article lists its sources at the end.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '28px 0 0', display: 'grid', gap: 22 }}>
        {ARTICLES.map((a) => (
          <li key={a.slug}>
            <Link href={`/learn/${a.slug}`} style={{ color: '#eef1f6', fontSize: 19, fontWeight: 650, textDecoration: 'none' }}>
              {a.title}
            </Link>
            <p style={{ margin: '6px 0 2px', opacity: 0.75 }}>{a.description}</p>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.5 }}>
              {fmt(a.updated)} · about {Math.round(wordCount(a) / 220)} min read
            </p>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 32, opacity: 0.85 }}>
        Looking for a specific element instead? The <Link href="/materials" style={{ color: '#eef1f6' }}>materials guide</Link>{' '}
        covers every material and what it reacts with.
      </p>
    </ContentShell>
  )
}
