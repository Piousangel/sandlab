import Link from 'next/link'
import { notFound } from 'next/navigation'
import ContentShell from '@/components/ContentShell'
import JsonLd, { breadcrumbs } from '@/components/JsonLd'
import { chanceLabel, materialBySlug, materialStaticParams, reactionsOf, type ReactionLine } from '@/lib/guide/reactions'
import { COPY } from '@/lib/guide/copy'
import { SITE } from '@/lib/site'
import { PRESETS } from '@/lib/sand/materials'
// 리디자인 P10: 새 셸(프리뷰)은 Bone 재료 화면(MaterialPage), classic(prod)은 null → 아래 지금 화면 그대로
import { MaterialPage } from '@ui-shell'

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

// 두 화면(prod·새 셸)이 같이 쓰는 문장 — 단어 수 diff 0
const ODDS_NOTE =
  'Odds are per contact check: each tick, touching cells inside the same two-by-two block are checked against the reaction table, so even a small chance happens soon after contact.'
const NO_REACTIONS =
  'has no reactions in Sandlab: nothing it touches changes it, and it changes nothing. What it does depends only on its weight and how it moves.'

const pageSlugs = new Set(materialStaticParams().map((p) => p.slug))
const hrefOf = (slug: string) => (pageSlugs.has(slug) ? `/materials/${slug}` : `/materials#${slug}`)

export default async function Page({ params }: Props) {
  const { slug } = await params
  const m = materialBySlug(slug)
  const copy = COPY[slug]
  if (!m || !copy?.page) notFound()
  const { causes, undergoes } = reactionsOf(slug)
  const lower = m.name.toLowerCase()
  const crumbsLd = breadcrumbs(SITE, [{ name: 'Materials', path: '/materials' }, { name: m.name, path: `/materials/${slug}` }])
  if (MaterialPage) {
    // 이전/다음 = 전용 페이지가 있는 재료끼리, 재료 표(PRESETS) 순서
    const order = PRESETS.filter((p) => pageSlugs.has(p.slug))
    const i = order.findIndex((p) => p.slug === slug)
    const link = (p: (typeof order)[number] | undefined) => (p ? { href: `/materials/${p.slug}`, label: p.name } : null)
    const rows = (list: ReactionLine[]) =>
      list.map((r) => ({ text: r.text, chance: chanceLabel(r.chance), percent: Math.round(r.chance * 100), partner: r.partner, href: hrefOf(r.partner) }))
    return (
      <MaterialPage
        material={{ slug: m.slug, name: m.name, color: m.color }}
        summary={copy.summary}
        facts={[
          { label: 'Movement', value: MOVES[m.movement] },
          { label: 'Weight', value: `${m.density} / 9 (heavier sinks through lighter)` },
          { label: 'Lifetime', value: m.lifetime === null ? 'Permanent' : 'Short-lived — fades into empty space' },
          { label: 'Glow', value: m.emissive === 0 ? 'None' : m.emissive >= 2 ? 'Bright' : 'Faint' },
        ]}
        body={copy.body}
        experiments={copy.experiments ?? []}
        undergoesTitle={`When ${lower} touches something`}
        causesTitle={`When something touches ${lower}`}
        undergoes={rows(undergoes)}
        causes={rows(causes)}
        noReactions={`${m.name} ${NO_REACTIONS}`}
        oddsNote={ODDS_NOTE}
        tip={copy.tip}
        cta={`Try ${lower} in the sandbox`}
        prev={link(order[i - 1])}
        next={link(order[i + 1])}
      >
        <JsonLd data={crumbsLd} />
      </MaterialPage>
    )
  }
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
      <JsonLd data={crumbsLd} />
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
