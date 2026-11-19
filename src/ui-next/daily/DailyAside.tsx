/**
 * 새 셸 /daily 플레이 화면의 설명 패널(리디자인 P7 — 데스크톱 오른쪽, 모바일 보드 아래).
 * prod(classic) 패널과 다른 점: 레벨 id 없음(describeLevel 요약의 "1-3 Two Pots is…"·"Open 1-3" 링크 — 풀 9개라 id가 주기를 드러낸다),
 * 옛 주황 Share result 버튼 없음(공유는 결과 화면 P5의 Share image·Copy text 하나로), 인라인 색·opacity 없음(.sl-sp-aside !important 덮어쓰기 불필요).
 */
import { describeLevel } from '@/lib/spill/client/describe'
import type { DailyAsideProps } from '../shell/spillTypes'

export function DailyAside({ n, level, mine, children }: DailyAsideProps) {
  const d = describeLevel(level)
  const stars = mine ? Math.max(0, Math.min(3, Math.round(mine.stars))) : 0
  return (
    <section className="sl-da">
      <h2>
        Daily No.{n}: {level.name}
      </h2>
      <p className="sl-da-note">
        {mine
          ? `Solved today in ${mine.moves} ${mine.moves === 1 ? 'move' : 'moves'}, ${stars} of 3 stars. Replays are practice; your first clear is the one you share.`
          : 'Everyone gets the same puzzle today. A new one starts at midnight UTC.'}
      </p>
      {/* 목표 문장은 플레이 화면 목표 줄·목표 카드(How to win)에 이미 있다 — 여기서 또 쓰지 않는다(리뷰) */}
      {d.verbs.length > 0 && (
        <>
          <h2>How to play</h2>
          <ul>
            {d.verbs.map((v) => (
              <li key={v}>{v}</li>
            ))}
            <li>Press Run to start the scene. Undo is free before you run; Retry keeps your placements.</li>
          </ul>
        </>
      )}
      {level.hint && (
        <details className="sl-da-hint">
          <summary>Show a hint</summary>
          <p>{level.hint}</p>
        </details>
      )}
      <p className="sl-da-links">
        <a href="/daily">Daily start and strata</a> · <a href="/play">All levels</a>
      </p>
      {children}
    </section>
  )
}
