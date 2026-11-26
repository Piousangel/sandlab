import DailySpill from '@/components/spill/DailySpill'
import JsonLd from '@/components/JsonLd'
import { gameJsonLd } from '@/lib/gameJsonLd'

const DESCRIPTION =
  'A new physics puzzle every day, the same for everyone. Solve it in as few moves as you can and share your result. Works on phones.'

export const metadata = {
  title: 'Sandlab Daily — one falling-sand puzzle a day',
  description: DESCRIPTION,
  alternates: { canonical: '/daily' },
}

// Spill 엔진(CPU) — WebGPU 불필요. 구조화 데이터도 그렇게 말한다.
// DailySpill은 날짜를 클라이언트에서 고르므로 정적 HTML에 children이 없다 — JSON-LD는 바깥에 둔다.
const JSON_LD = gameJsonLd('puzzle', { name: 'Sandlab Daily', path: '/daily', description: DESCRIPTION })

// 캔버스 페이지 — 광고 없음. 오늘의 레벨은 클라이언트가 날짜(UTC)로 고른다(정적 export).
export default function Page() {
  return (
    <>
      <JsonLd data={JSON_LD} />
      {/* 규칙 설명은 아래 정적 절 하나로(#112 리뷰: 플레이 패널 children과 같은 문단이 두 번 보였다) */}
      <DailySpill />
      <section className="sl-dr" aria-labelledby="daily-rules-h">
        <h2 id="daily-rules-h">The rules of the daily puzzle</h2>
        <p>
          The daily puzzle is a Spill level chosen by the date. At midnight UTC the day number goes up by one and the
          level changes, so a player in Seoul and a player in Lisbon are always looking at the same glass, the same
          stream of material and the same goal. The goal is written on the start screen.
        </p>
        <h3>Moves and stars</h3>
        <p>
          You steer the falling material with a few moves, such as digging a channel or tapping a gate, and each one counts. There are
          three stars: one for clearing the level, one for collecting every gem, and one for finishing within par. Your first clear of the day is the official one: it is saved on your device and turned into a short
          share text with the day number, your stars and your moves. Replaying the level is free practice and does
          not overwrite that record.
        </p>
        <h3>Can I get stuck?</h3>
        <p>
          No. Every level, including each daily, is run through a solver before it ships, so a solution always
          exists. If you are stuck, open the hint on the play screen, or read the written walkthrough for the same
          level in the <a href="/play">level list</a>. Spill runs on a plain 2D canvas, so you do not need WebGPU
          or a graphics card, and it works on phones.
        </p>
        <h3>Past days and your streak</h3>
        <p>
          Each day you clear adds a layer to your strata, a colored band stored in this browser and shown on the
          home page. There is no account and no leaderboard, so nothing about your play leaves your device unless you
          choose to share the text. Missed days show as thin bands. Want to try the physics sandbox the puzzles are built
          on? Open the <a href="/">home page</a>, or read how the engine works in the <a href="/learn">Learn</a>{' '}
          section.
        </p>
      </section>
    </>
  )
}
