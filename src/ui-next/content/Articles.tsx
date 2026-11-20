/**
 * 새 셸 글 페이지 — /learn/[slug](LearnArticle)·/play/[id]/guide(GuideArticle). 리디자인 P10, S1 = A 라이트(Bone 한 면).
 * prod(classic)에서는 `@ui-shell`의 두 export가 null → 페이지가 지금 ContentShell 화면을 그대로 그린다.
 *
 * 글자는 page.tsx가 넘긴 데이터만 쓴다(제목·바이라인·섹션·출처·힌트) → prod와 단어·링크·h1·JSON-LD가 같다.
 * 광고(S11): 본문 중간 1곳(가운데 섹션 뒤, 띠) + 글 끝 1곳(article 뒤, 300×250). 둘 다 AD_SLOTS id가 없으면 렌더 0.
 * 글 안 라이브 데모(캔버스)는 지금 없다 — 생기면 광고와 24px+ 간격·동시 라이브 1개 이하(DECISIONS P10).
 */
import type { GuideArticleProps, LearnArticleProps } from '../shell/contentTypes'
import { Icon } from '../icons/Icon'
import { BackLink, ContentPage, EndAd, PrevNext, Sections, Toc, tocOf } from './parts'

export function LearnArticle({ children, title, byline, sections, sources, others, prev, next }: LearnArticleProps) {
  const ads = true
  const { ids, items } = tocOf(sections)
  return (
    <ContentPage ads={ads} variant="article">
      {children}
      <BackLink link={{ href: '/learn', label: 'Learn' }} />
      <article className="sl-cs-article">
        <header className="sl-cs-head">
          <h1>{title}</h1>
          <p className="sl-cs-meta">{byline}</p>
        </header>
        <Toc items={items} />
        <Sections sections={sections} ads={ads} ids={ids} />
        <h2 className="sl-cs-h2s">Sources</h2>
        <ul className="sl-cs-sources">
          {sources.map((s) =>
            s.url ? (
              <li key={s.label}>
                <a href={s.url} rel="noopener">
                  {s.label}
                </a>
              </li>
            ) : (
              <li key={s.label}>{s.label} (Sandlab source code)</li>
            ),
          )}
        </ul>
      </article>
      <EndAd ads={ads} />
      <PrevNext prev={prev} next={next} label="Articles" added />
      <section className="sl-cs-more" aria-labelledby="sl-cs-more-h">
        <h2 id="sl-cs-more-h" className="sl-cs-h2s">
          Keep reading
        </h2>
        <ul>
          {others.map((o) => (
            <li key={o.slug}>
              <a href={`/learn/${o.slug}`}>{o.title}</a>
            </li>
          ))}
          <li>
            <a href="/materials">Materials guide</a>
          </li>
        </ul>
      </section>
    </ContentPage>
  )
}

export function GuideArticle({ children, title, byline, lesson, facts, play, sections, hints, prev, next }: GuideArticleProps) {
  const ads = true
  const { ids, items } = tocOf(sections)
  return (
    <ContentPage ads={ads} variant="article">
      {children}
      <BackLink link={{ href: '/play', label: 'All levels' }} />
      <article className="sl-cs-article">
        <header className="sl-cs-head">
          <h1>{title}</h1>
          <p className="sl-cs-meta">{byline}</p>
        </header>
        <div className="sl-cs-card">
          <p>
            <strong>What this level teaches:</strong> {lesson}
          </p>
          <ul>
            {facts.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {/* 퍼즐(캔버스) 화면으로 — 일반 <a>(광고 로더가 따라가지 않게). 화면의 주 행동 하나(Ember). */}
          <a href={play.href} className="sl-cs-cta">
            <Icon name="pour" size={18} />
            {play.label}
          </a>
        </div>
        <Toc items={items} />
        <Sections sections={sections} ads={ads} ids={ids} />
        <h2 className="sl-cs-h2s">Hints</h2>
        <p className="sl-cs-note">Open one at a time. The second one nearly gives it away.</p>
        {hints.map((h, k) => (
          <details key={h} className="sl-cs-hint">
            <summary>Hint {k + 1}</summary>
            <p>{h}</p>
          </details>
        ))}
      </article>
      <EndAd ads={ads} />
      <PrevNext prev={prev} next={next} label="Level guides" />
      <p className="sl-cs-also">
        <a href="/learn">How the physics works</a>
      </p>
    </ContentPage>
  )
}
