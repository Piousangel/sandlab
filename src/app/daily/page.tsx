import DailyPlayer from '@/components/DailyPlayer'

export const metadata = {
  title: 'Sandlab Daily — one falling-sand puzzle a day',
  description:
    'A new physics puzzle every day, the same for everyone. Solve it with as little material as possible and share your result.',
  alternates: { canonical: '/daily' },
}

const a = { color: '#eef1f6' } as const

// 캔버스 페이지 — 광고 없음. 오늘의 레벨은 클라이언트가 날짜(UTC)로 고른다(정적 export).
export default function Page() {
  return (
    <div style={{ minHeight: '100vh', overflowY: 'auto' }}>
      <header style={{ maxWidth: 980, margin: '0 auto', padding: '18px 18px 0', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', fontSize: 14 }}>
        <a href="/" style={{ ...a, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>Sandlab</a>
        <a href="/play" style={{ ...a, opacity: 0.75, textDecoration: 'none' }}>All challenges</a>
      </header>
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '14px 18px 48px', lineHeight: 1.6 }}>
        <DailyPlayer />
        <section style={{ maxWidth: 720, marginTop: 28 }}>
          <h2 style={{ fontSize: 19 }}>How the daily works</h2>
          <p>
            Every day at midnight UTC a new puzzle appears, and everyone in the world gets the same one. It is
            built from the same falling-sand simulation as the sandbox, so the materials behave exactly as they
            do there: water levels out, sand sinks, lava hardens into stone when it meets water. Each daily is
            checked on a real graphics card before it goes live, so it can always be solved and never solves
            itself if you wait.
          </p>
          <p>
            Your first clear of the day is counted. The fewer cells of material you use, the more stars you get,
            and after you finish you can see roughly where you landed among everyone who solved it today. There
            is no leaderboard and no account: results are stored without names, and your own history stays in
            your browser.
          </p>
        </section>
      </main>
    </div>
  )
}
