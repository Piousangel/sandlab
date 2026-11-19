/**
 * 새 셸 /play/[id] 설명 패널(리디자인 P8 — DailyAside(P7)와 같은 방식). classic은 null → 페이지가 지금 패널을 그대로 그린다.
 *
 * - 패널 순서 = 목표 → 방법: SpillPlayer가 패널 머리에 "How to win"(목표)·"Stars"를 먼저 그리고, 이 컴포넌트는 바로 이어서
 *   "How to play"(방법)부터 그린다. prod는 그 사이에 "About this level"(요약 — 목표 문장을 또 말한다)이 끼어 있었다 → 뒤로.
 * - 인라인 색·opacity 없음 → spill.css의 `.sl-sp-aside a[style]`·`p[style*='opacity']` !important 덮어쓰기를 지웠다.
 * - 문장·링크는 prod 패널과 같다(요약·동사·재료 링크·힌트·월드·All levels·공략·다음 레벨). 프리뷰 읽기 전용이면 한 줄 안내.
 */
import { PREVIEW_READ_ONLY } from '../shell/ReadOnlyNote'
import type { LevelAsideProps } from '../shell/playTypes'

/** 프리뷰(읽기 전용)에서 레벨 클리어가 어디에 남는지 — 별은 이 브라우저에 저장되지만 서버 분포(히스토그램) 제출은 403. */
export const LEVEL_READ_ONLY_NOTE = "Preview is read-only: your stars stay in this browser, but clears aren't added to the shared stats."

export function LevelAside(p: LevelAsideProps & { readOnly?: boolean }) {
  const readOnly = p.readOnly ?? PREVIEW_READ_ONLY
  return (
    <section className="sl-la">
      <h2>How to play</h2>
      <ul>
        {p.verbs.map((v) => (
          <li key={v}>{v}</li>
        ))}
        <li>Press Run to start the scene. Undo is free before you run; Retry keeps your placements.</li>
      </ul>
      {readOnly && (
        <p className="sl-la-note" role="note" data-sl-read-only="">
          {LEVEL_READ_ONLY_NOTE}
        </p>
      )}
      {p.hint && (
        <details className="sl-la-hint">
          <summary>Show a hint</summary>
          <p>{p.hint}</p>
        </details>
      )}
      <h2>About this level</h2>
      <p>{p.summary}</p>
      {p.materials.length > 0 && (
        <>
          <h2>Materials</h2>
          <ul>
            {p.materials.map((m) => (
              <li key={m.slug}>{m.page ? <a href={`/materials/${m.slug}`}>{m.slug}</a> : m.slug}</li>
            ))}
          </ul>
        </>
      )}
      <p className="sl-la-links">
        <span>
          World {p.world}: {p.worldName}
        </span>
        {' · '}
        <a href="/play">All levels</a>
        {p.guide && (
          <>
            {' · '}
            <a href={`/play/${p.id}/guide`}>Read the {p.id} guide</a>
          </>
        )}
        {p.next && (
          <>
            {' · '}
            <a href={`/play/${p.next.id}`}>
              Next: {p.next.id} {p.next.name}
            </a>
          </>
        )}
      </p>
    </section>
  )
}
