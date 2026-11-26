import { notFound } from 'next/navigation'
import SpillPlayer from '@/components/spill/SpillPlayer'
import { LEVELS } from '@/lib/spill/levels'
import { levelById, nextLevel, ordered, worldName } from '@/lib/spill/client/catalog'
import { describeLevel } from '@/lib/spill/client/describe'
import { materialStaticParams } from '@/lib/guide/reactions'
import { guideFor } from '@/lib/spill/guide/guides'
import { levelNoteFor } from '@/content/level-notes'
// 리디자인 P8: 새 셸(프리뷰 빌드)은 설명 패널을 LevelAside로(인라인 색 없음, 목표 → 방법 순), classic(prod)은 null → 아래 지금 패널 그대로
import { LevelAside } from '@ui-shell'

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
const a = { color: '#A04F00', fontWeight: 700 } as const

export default async function Page({ params }: Props) {
  const { id } = await params
  const level = levelById(LEVELS, id)
  if (!level) notFound()
  const d = describeLevel(level)
  const next = nextLevel(LEVELS, level.id)
  return (
    <SpillPlayer level={level} nextId={next?.id ?? null}>
      {LevelAside ? (
        <LevelAside
          id={level.id}
          name={level.name}
          world={level.world}
          worldName={worldName(level.world)}
          summary={d.summary}
          verbs={d.verbs}
          materials={d.materials.map((m) => ({ slug: m, page: guidePages.has(m) }))}
          hint={level.hint ?? null}
          notes={levelNoteFor(level.id)}
          guide={!!guideFor(level.id)}
          next={next ? { id: next.id, name: next.name } : null}
        />
      ) : (
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
          {guideFor(level.id) && (
            <>
              {' · '}
              <a href={`/play/${level.id}/guide`} style={a}>Read the {level.id} guide</a>
            </>
          )}
          {next && (
            <>
              {' · '}
              <a href={`/play/${next.id}`} style={a}>Next: {next.id} {next.name}</a>
            </>
          )}
        </p>
      </section>
      )}
    </SpillPlayer>
  )
}
