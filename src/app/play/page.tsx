import ContentShell from '@/components/ContentShell'
import LevelList from '@/components/spill/LevelList'
import { LEVELS } from '@/lib/spill/levels'
import { ordered, worldName } from '@/lib/spill/client/catalog'
import { describeLevel } from '@/lib/spill/client/describe'
import { guideFor } from '@/lib/spill/guide/guides'

export const metadata = {
  title: 'Sandlab Spill — falling-sand physics puzzles',
  description: 'Dig a channel, open a gate, and let water and sand do the rest. Short physics puzzles on a falling-sand simulation, scored by moves and time.',
  alternates: { canonical: '/play' },
}

export default function Page() {
  const levels = ordered(LEVELS)
  const items = levels.map((l) => ({ id: l.id, world: l.world, name: l.name }))
  return (
    <ContentShell>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Sandlab Spill</h1>
      <p style={{ opacity: 0.85 }}>
        Spill is a set of short physics puzzles built on a falling-sand simulation. Each level is a tall scene with
        a tank of water or a heap of sand, a few pots to fill, and some dirt in the way. You plan first: dig a straight
        channel through the dirt, place what the level gives you, and Undo as often as you like. Then press Run and
        watch the materials find their own way down. A pot that fills locks in with a ding, and the level is cleared
        the moment the last one locks. If the flow stalls, you know within a second and a half, and Retry puts you
        straight back at the planning stage with your placements kept.
      </p>
      <p style={{ opacity: 0.85 }}>
        Every level awards three stars: one for clearing it, one for collecting every gem, and one for matching par,
        which means using no more moves than the par count and finishing within the par time. Because every move
        snaps to a grid of tiles, the clock rewards the path you chose rather than quick fingers, so even a one-move
        level has a better and a worse answer. Your stars are saved in this browser only, and the next world opens
        once you have earned two stars per level in the one before it.
      </p>
      <LevelList items={items} />
      {levels.length > 0 && (
        <section style={{ marginTop: 12 }}>
          <h2 style={{ fontSize: 20 }}>All levels</h2>
          <ol style={{ paddingLeft: 20 }}>
            {levels.map((l) => {
              const d = describeLevel(l)
              return (
                <li key={l.id} style={{ marginBottom: 8 }}>
                  <a href={`/play/${l.id}`} style={{ color: '#eef1f6', fontWeight: 650 }}>{l.id} {l.name}</a>
                  <span style={{ opacity: 0.7 }}> — {worldName(l.world)}. {d.goals.join('. ')}.</span>{guideFor(l.id) && (
                    <>
                      {' '}
                      <a href={`/play/${l.id}/guide`} style={{ color: '#f5a623', fontSize: 14 }}>Guide</a>
                    </>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      )}
      <p style={{ marginTop: 24, opacity: 0.8 }}>
        Looking for the classic daily challenge? <a href="/daily" style={{ color: '#f5a623' }}>Play today&apos;s daily →</a>
      </p>
    </ContentShell>
  )
}
