import ContentShell from '@/components/ContentShell'
import LevelStars from '@/components/LevelStars'
import { LEVELS } from '@/lib/challenge/levels'

export const metadata = {
  title: 'Sandlab challenges — falling-sand physics puzzles',
  description: `${LEVELS.length} physics puzzles built on Sandlab's falling-sand simulation: fill, bridge, dissolve and burn your way to three stars with as little material as possible.`,
  alternates: { canonical: '/play' },
}

export default function Page() {
  return (
    <ContentShell>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Challenges</h1>
      <p style={{ margin: '0 0 16px' }}>
        <a href="/daily" style={{ color: '#07090D', background: '#f5a623', padding: '8px 14px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>
          Play today&apos;s daily →
        </a>
      </p>
      <p style={{ opacity: 0.85 }}>
        Each challenge is a small scene with a goal: fill a cup, get water across a lava pit, burn a woodpile on
        the far side of a pond. You get one or two materials and a limited amount of each, and you can only paint
        inside the faint dashed box. Everything else is the same simulation as the sandbox, so the solutions come
        from how the materials really behave: sand pushes water up, water turns lava into stone, oil floats and
        carries fire. A goal counts once it has held for about two seconds. Using less material earns more stars,
        and your best result is saved in this browser. Every level has been played through from start to finish
        on a real graphics card, and none of them can be won by waiting.
      </p>
      <ol style={{ listStyle: 'none', padding: 0, margin: '28px 0 0', display: 'grid', gap: 18 }}>
        {LEVELS.map((l, i) => (
          <li key={l.id} style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
            <span style={{ width: 22, opacity: 0.45, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
            <span style={{ flex: 1 }}>
              <a href={`/play/${l.id}`} style={{ color: '#eef1f6', fontSize: 18, fontWeight: 650, textDecoration: 'none' }}>
                {l.title}
              </a>
              <span style={{ display: 'block', marginTop: 4, fontSize: 14.5, opacity: 0.7 }}>{l.blurb.split('. ')[0]}.</span>
            </span>
            <LevelStars id={l.id} />
          </li>
        ))}
      </ol>
    </ContentShell>
  )
}
