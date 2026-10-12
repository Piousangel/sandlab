import { notFound } from 'next/navigation'
import SpillPlayer from '@/components/spill/SpillPlayer'
import { LEVELS } from '@/lib/spill/levels'
import { levelById, nextLevel, ordered, worldName } from '@/lib/spill/client/catalog'
import { describeLevel } from '@/lib/spill/client/describe'
import { materialStaticParams } from '@/lib/guide/reactions'

export const dynamicParams = false

export function generateStaticParams() {
  return ordered(LEVELS).map((l) => ({ id: l.id }))
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const l = levelById(LEVELS, id)
  if (!l) return {}
  const d = describeLevel(l)
  return {
    title: `${l.id} ${l.name} — Sandlab Spill`,
    description: d.summary.slice(0, 155).replace(/\s\S*$/, '') + '…',
    alternates: { canonical: `/play/${l.id}` },
  }
}

const guidePages = new Set(materialStaticParams().map((p) => p.slug))
const a = { color: '#eef1f6' } as const

export default async function Page({ params }: Props) {
  const { id } = await params
  const level = levelById(LEVELS, id)
  if (!level) notFound()
  const d = describeLevel(level)
  const next = nextLevel(LEVELS, level.id)
  return (
    <SpillPlayer level={level} nextId={next?.id ?? null}>
      <section>
        <h2>About this level</h2>
        <p>{d.summary}</p>
        <h2>How to play</h2>
        <ul>
          {d.verbs.map((v) => (
            <li key={v}>{v}</li>
          ))}
          <li>Press Run to start the scene. Undo is free before you run; Retry keeps your placements.</li>
        </ul>
        {d.materials.length > 0 && (
          <>
            <h2>Materials</h2>
            <ul>
              {d.materials.map((m) => (
                <li key={m}>{guidePages.has(m) ? <a href={`/materials/${m}`} style={a}>{m}</a> : m}</li>
              ))}
            </ul>
          </>
        )}
        {level.hint && (
          <details style={{ marginTop: 18 }}>
            <summary style={{ cursor: 'pointer' }}>Show a hint</summary>
            <p>{level.hint}</p>
          </details>
        )}
        <p style={{ marginTop: 22, opacity: 0.75 }}>
          World {level.world}: {worldName(level.world)} · <a href="/play" style={a}>All levels</a>
          {next && (
            <>
              {' · '}
              <a href={`/play/${next.id}`} style={a}>Next: {next.id} {next.name}</a>
            </>
          )}
        </p>
      </section>
    </SpillPlayer>
  )
}
