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
      <DailySpill>
        <h2>How the daily works</h2>
        <p>
          Every day at midnight UTC a new puzzle appears, and everyone in the world gets the same one. It uses the
          same Spill levels as the level list, so it runs on phones too and needs no graphics card. Every level is
          checked by a solver before it ships, so it can always be solved.
        </p>
        <p>
          Your first clear of the day is saved on your device and turned into a share text with the daily number,
          stars and moves. There is no account and no leaderboard.
        </p>
      </DailySpill>
    </>
  )
}
