import { notFound } from 'next/navigation'
import ChallengePlayer from '@/components/ChallengePlayer'
import { LEVELS, levelById } from '@/lib/challenge/levels'
import { describeGoal } from '@/lib/challenge/judge'
import { materialStaticParams } from '@/lib/guide/reactions'
import { PRESETS } from '@/lib/sand/materials'

export const dynamicParams = false

export function generateStaticParams() {
  return LEVELS.map((l) => ({ id: l.id }))
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const l = levelById(id)
  if (!l) return {}
  const n = LEVELS.indexOf(l) + 1
  return {
    title: `${l.title} — Sandlab challenge ${n}`,
    description: l.blurb.slice(0, 155).replace(/\s\S*$/, '') + '…',
    alternates: { canonical: `/play/${l.id}` },
  }
}

const nameOf = (slug: string) => PRESETS.find((m) => m.slug === slug)?.name ?? slug
const guidePages = new Set(materialStaticParams().map((p) => p.slug))
const a = { color: '#eef1f6' } as const

// 캔버스 페이지 — 광고 없음(ContentShell 미사용). 레벨 설명은 캔버스 아래 정적 HTML로 남긴다.
export default async function Page({ params }: Props) {
  const { id } = await params
  const level = levelById(id)
  if (!level) notFound()
  const i = LEVELS.indexOf(level)
  const next = LEVELS[i + 1]?.id
  const used = new Set<string>([...Object.keys(level.palette), ...level.shapes.map((s) => s.mat)])
  used.delete('wall')
  return (
    <div style={{ minHeight: '100vh', overflowY: 'auto' }}>
      <header style={{ maxWidth: 980, margin: '0 auto', padding: '18px 18px 0', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', fontSize: 14 }}>
        <a href="/" style={{ ...a, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>Sandlab</a>
        <a href="/play" style={{ ...a, opacity: 0.75, textDecoration: 'none' }}>← All challenges</a>
        <span style={{ marginLeft: 'auto', opacity: 0.5 }}>Challenge {i + 1} of {LEVELS.length}</span>
      </header>
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '14px 18px 48px', lineHeight: 1.6 }}>
        <h1 style={{ fontSize: 26, margin: '0 0 10px' }}>{level.title}</h1>
        <ChallengePlayer level={level} nextId={next} />
        <section style={{ maxWidth: 720, marginTop: 28 }}>
          <h2 style={{ fontSize: 19 }}>About this challenge</h2>
          <p>{level.blurb}</p>
          <h2 style={{ fontSize: 19, marginTop: 22 }}>Goal</h2>
          <ul style={{ paddingLeft: 20 }}>
            {level.goals.map((g, k) => (
              <li key={k}>{describeGoal(g)}</li>
            ))}
            <li>Keep it that way for about two seconds.</li>
          </ul>
          <h2 style={{ fontSize: 19, marginTop: 22 }}>Materials in this level</h2>
          <ul style={{ paddingLeft: 20 }}>
            {[...used].map((m) => (
              <li key={m}>
                {guidePages.has(m) ? <a href={`/materials/${m}`} style={a}>{nameOf(m)}</a> : <a href={`/materials#${m}`} style={a}>{nameOf(m)}</a>}
                {m in level.palette && ` — yours to paint, ${level.palette[m].toLocaleString('en-US')} ink`}
              </li>
            ))}
          </ul>
          <details style={{ marginTop: 18 }}>
            <summary style={{ cursor: 'pointer' }}>Show a hint</summary>
            <p>{level.hint}</p>
          </details>
        </section>
      </main>
    </div>
  )
}
