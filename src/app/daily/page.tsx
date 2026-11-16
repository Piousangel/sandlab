import DailySpill from '@/components/spill/DailySpill'

export const metadata = {
  title: 'Sandlab Daily — one falling-sand puzzle a day',
  description:
    'A new physics puzzle every day, the same for everyone. Solve it in as few moves as you can and share your result. Works on phones.',
  alternates: { canonical: '/daily' },
}

// 캔버스 페이지 — 광고 없음. 오늘의 레벨은 클라이언트가 날짜(UTC)로 고른다(정적 export).
export default function Page() {
  return (
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
  )
}
