/**
 * 새 셸 /play 「전시실」(리디자인 P8, S1 = A 라이트: 화면 전체 Bone, 레벨 보드 썸네일만 어두운 유리).
 * prod(classic)에서는 `@ui-shell`의 PlayGallery가 null → /play 페이지가 지금 ContentShell 화면을 그대로 그린다.
 *
 * - ContentShell과 같은 뼈대(광고 로더·새 셸 헤더·푸터)를 직접 그린다 — ContentShell의 main은 옛 다크 인라인 스타일이라
 *   Bone 한 면을 깔 수 없다(ContentShell은 prod 화면이라 건드리지 않는다). 광고 로더는 그대로 실린다(verify-ads 허용 페이지).
 * - 본문 문장은 page.tsx가 넘긴 것만 쓴다(prod와 같은 소개 2문단·'All levels' 목록·데일리 줄 → 단어·링크 수 감소 0).
 * - 광고 안내판(S11)은 월드 카드 아래 1곳, 주변 인터랙티브와 32px. 광고 단위 id(AD_SLOTS.play)가 없으면 렌더 0.
 * - h1은 prod와 같은 "Sandlab Spill"(SEO diff 0). 내비 라벨 Solve와는 h1 위 눈썹 라벨로 맞춘다(S10, DECISIONS P8).
 */
import AdLoader from '@/components/AdLoader'
import { AdPlate } from '../ads/AdPlate'
import { AD_SLOTS } from '../ads/config'
import { Icon } from '../icons/Icon'
import { ShellFooter } from '../shell/ShellFooter'
import { ShellHeader } from '../shell/ShellHeader'
import type { PlayGalleryProps } from '../shell/playTypes'
import { PlayWorlds } from './PlayWorlds'

/** "How Spill works" 카드의 Learn 글 — 시뮬레이션 규칙을 설명하는 글(Spill 보드도 같은 Margolus 낙사 규칙). */
export const LEARN_HREF = '/learn/margolus-falling-sand'

export function PlayGallery({ levels, intro, children }: PlayGalleryProps) {
  const first = levels[0]
  return (
    <div className="sl-pg-page">
      <AdLoader />
      <ShellHeader />
      <main className="sl-pg">
        {children}
        <header className="sl-pg-head">
          <p className="sl-pg-lbl sl-pg-eyebrow">Solve</p>
          <h1>Sandlab Spill</h1>
          <p className="sl-pg-lead">Dig, then pour. Each room is one idea about how things fall.</p>
        </header>
        <PlayWorlds levels={levels} />
        <AdPlate ads slot={AD_SLOTS.play} format="rect" clearance={32} />
        <section className="sl-pg-how" aria-labelledby="sl-pg-how-h">
          <h2 id="sl-pg-how-h" className="sl-pg-lbl">
            How Spill works
          </h2>
          {intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="sl-pg-how-links">
            {first && (
              <a href={`/play/${first.id}/guide`}>
                Read the {first.id} guide
                <Icon name="next" size={16} />
              </a>
            )}
            <a href={LEARN_HREF}>
              How the falling sand moves
              <Icon name="next" size={16} />
            </a>
          </p>
        </section>
        {levels.length > 0 && (
          <section className="sl-pg-index" aria-labelledby="sl-pg-index-h">
            <h2 id="sl-pg-index-h">All levels</h2>
            <ol>
              {levels.map((l) => (
                <li key={l.id}>
                  <a href={`/play/${l.id}`}>
                    {l.id} {l.name}
                  </a>
                  <span> — {l.line}</span>
                  {l.guide && (
                    <>
                      {' '}
                      <a href={`/play/${l.id}/guide`} className="sl-pg-guide">
                        Guide
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
        <p className="sl-pg-daily">
          One new puzzle every day, the same for everyone. <a href="/daily">Play today&apos;s daily</a>
        </p>
      </main>
      <ShellFooter />
    </div>
  )
}
