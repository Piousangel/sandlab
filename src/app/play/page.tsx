import ContentShell from '@/components/ContentShell'
import JsonLd from '@/components/JsonLd'
import { gameJsonLd } from '@/lib/gameJsonLd'
import LevelList from '@/components/spill/LevelList'
import { LEVELS } from '@/lib/spill/levels'
import { ordered, worldName } from '@/lib/spill/client/catalog'
import { describeLevel } from '@/lib/spill/client/describe'
import { guideFor } from '@/lib/spill/guide/guides'
// 리디자인 P8: 새 셸(프리뷰 빌드)은 전시실(PlayGallery), classic(prod)은 null → 아래 지금 화면 그대로
import { PlayGallery } from '@ui-shell'

const DESCRIPTION =
  'Dig a channel, open a gate, and let water and sand do the rest. Short physics puzzles on a falling-sand simulation, scored by moves and time.'

export const metadata = {
  title: 'Sandlab Spill — falling-sand physics puzzles',
  description: DESCRIPTION,
  alternates: { canonical: '/play' },
}

// Spill 엔진(CPU) — WebGPU 불필요.
const JSON_LD = gameJsonLd('puzzle', { name: 'Sandlab Spill', path: '/play', description: DESCRIPTION })

// 소개 2문단 — prod 화면과 전시실(새 셸)이 같은 문자열을 쓴다(단어 수 diff 0). 줄바꿈은 정적 HTML에서 공백 하나로 접히던 것과 같게.
const INTRO = [
  'Spill is a set of short physics puzzles built on a falling-sand simulation. Each level is a tall scene with a tank of water or a heap of sand, a few pots to fill, and some dirt in the way. You plan first: dig a straight channel through the dirt, place what the level gives you, and Undo as often as you like. Then press Run and watch the materials find their own way down. A pot that fills locks in with a ding, and the level is cleared the moment the last one locks. If the flow stalls, you know within a second and a half, and Retry puts you straight back at the planning stage with your placements kept.',
  'Every level awards three stars: one for clearing it, one for collecting every gem, and one for matching par, which means using no more moves than the par count and finishing within the par time. Because every move snaps to a grid of tiles, the clock rewards the path you chose rather than quick fingers, so even a one-move level has a better and a worse answer. Your stars are saved in this browser only, and the next world opens once you have earned two stars per level in the one before it.',
]

export default function Page() {
  const levels = ordered(LEVELS)
  if (PlayGallery)
    return (
      <PlayGallery
        levels={levels.map((l) => ({
          id: l.id,
          world: l.world,
          name: l.name,
          line: `${worldName(l.world)}. ${describeLevel(l).goals.join('. ')}.`,
          guide: !!guideFor(l.id),
        }))}
        intro={INTRO}
      >
        <JsonLd data={JSON_LD} />
      </PlayGallery>
    )
  const items = levels.map((l) => ({ id: l.id, world: l.world, name: l.name }))
  return (
    <ContentShell>
      <JsonLd data={JSON_LD} />
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Sandlab Spill</h1>
      <p style={{ opacity: 0.85 }}>{INTRO[0]}</p>
      <p style={{ opacity: 0.85 }}>{INTRO[1]}</p>
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
        One new puzzle every day, the same for everyone. <a href="/daily" style={{ color: '#f5a623' }}>Play today&apos;s daily →</a>
      </p>
    </ContentShell>
  )
}
