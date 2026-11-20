/**
 * 새 셸 재료 페이지 — /materials(MaterialsIndex)·/materials/[slug](MaterialPage). 리디자인 P10.
 * 재료 표시는 색 네모 대신 작은 시험관(홈 랙과 같은 유리 윤곽 ≥ 3:1) + 옅은 재료(salt·steam·ice·metal)는 관 안 결 패턴(S1 보완).
 * 재료색은 글자 색으로 쓰지 않는다(tokens.css 원칙) — 관 안 채움에만.
 */
import type { CSSProperties } from 'react'
import { Icon } from '../icons/Icon'
import { PALE } from '../home/model'
import type { MaterialPageProps, MaterialRef, MaterialsIndexProps } from '../shell/contentTypes'
import { BackLink, ContentPage, EndAd, MidAd, PrevNext, Toc } from './parts'
import { sectionIds } from './model'

export function MiniTube({ m, size = 'sm' }: { m: MaterialRef; size?: 'sm' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={`sl-mt sl-mt--${size}`}
      data-pale={PALE.has(m.slug) || undefined}
      style={{ '--sl-mt-fill': m.color } as CSSProperties}
    >
      <span className="sl-mt-glass" />
    </span>
  )
}

export function MaterialsIndex({ intro, groups, reactionsTitle, reactionsIntro, columns, pairs }: MaterialsIndexProps) {
  const ads = true
  const heads = [...groups.map((g) => g.label), reactionsTitle]
  const ids = sectionIds(heads)
  // 중간 광고: 무리(Solids…Gases) 가운데 뒤 — 4무리면 Powders 뒤
  const mid = Math.ceil(groups.length / 2) - 1
  return (
    <ContentPage ads={ads} variant="materials">
      <header className="sl-cs-head">
        <h1>Materials guide</h1>
      </header>
      <div className="sl-cs-lead">{intro}</div>
      <Toc items={heads.map((label, i) => ({ id: ids[i], label }))} />
      {groups.map((g, gi) => (
        <div key={g.label}>
          <section className="sl-cs-sec" aria-labelledby={ids[gi]}>
            <h2 id={ids[gi]}>{g.label}</h2>
            <ul className="sl-mat-list">
              {g.items.map((m) => (
                <li key={m.slug} id={m.slug} className="sl-mat">
                  <MiniTube m={m} />
                  <div className="sl-mat-txt">
                    <p className="sl-mat-name">
                      {m.page ? <a href={`/materials/${m.slug}`}>{m.name}</a> : <strong>{m.name}</strong>}
                      <span> — {m.summary}</span>
                    </p>
                    {!m.page && (
                      <>
                        {m.body.map((p) => (
                          <p key={p} className="sl-mat-body">
                            {p}
                          </p>
                        ))}
                        <p className="sl-mat-tip">Tip: {m.tip}</p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {gi === mid && <MidAd ads={ads} />}
        </div>
      ))}
      <section className="sl-cs-sec" aria-labelledby={ids[groups.length]}>
        <h2 id={ids[groups.length]}>{reactionsTitle}</h2>
        <p>{reactionsIntro}</p>
        {/* 표는 좁은 화면에서 가로로만 스크롤(페이지 가로 스크롤 0) — 스크롤 영역은 키보드로 닿게 tabIndex */}
        <div className="sl-rx-wrap" tabIndex={0} role="region" aria-labelledby={ids[groups.length]}>
          <table className="sl-rx">
            <thead>
              <tr>
                <th scope="col">{columns[0]}</th>
                <th scope="col">{columns[1]}</th>
                <th scope="col" className="is-num">
                  {columns[2]}
                </th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.key}>
                  <td className="sl-rx-mat">
                    <MiniTube m={p.a} />
                    {p.a.name}
                  </td>
                  <td>{p.text}</td>
                  <td className="is-num">{p.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <EndAd ads={ads} />
    </ContentPage>
  )
}

export function MaterialPage(p: MaterialPageProps) {
  const ads = true
  const { material: m } = p
  const hasReactions = p.undergoes.length + p.causes.length > 0
  const row = (r: MaterialPageProps['undergoes'][number]) => (
    <li key={r.partner + r.text}>
      <span className="sl-mat-rx-t">
        {r.text}{' '}
        <span className="sl-mat-odds">
          ({r.chance}, {r.percent}% per contact check)
        </span>
      </span>{' '}
      <a href={r.href} className="sl-mat-go" aria-label={`About ${r.partner}`}>
        <Icon name="next" size={16} />
      </a>
    </li>
  )
  return (
    <ContentPage ads={ads} variant="material">
      {p.children}
      <BackLink link={{ href: '/materials', label: 'All materials' }} />
      <article className="sl-cs-article">
        <header className="sl-cs-head sl-mat-head">
          <MiniTube m={m} size="lg" />
          <h1>{m.name}</h1>
        </header>
        <p className="sl-cs-lead">{p.summary}</p>
        <dl className="sl-mat-spec">
          {p.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        {p.body.map((b) => (
          <p key={b}>{b}</p>
        ))}
        {/* 본문이 1문단이면 광고가 글 머리에 몰린다 — 2문단 이상일 때만 */}
        {p.body.length >= 2 && <MidAd ads={ads} />}
        {p.experiments.length > 0 && (
          <section className="sl-cs-sec">
            <h2>Try it yourself</h2>
            <ol className="sl-mat-exp">
              {p.experiments.map((e) => (
                <li key={e.title}>
                  <strong>{e.title}.</strong> {e.steps}
                </li>
              ))}
            </ol>
          </section>
        )}
        <section className="sl-cs-sec">
          <h2>Reactions</h2>
          {!hasReactions ? (
            <p>{p.noReactions}</p>
          ) : (
            <>
              <p className="sl-cs-note">{p.oddsNote}</p>
              {p.undergoes.length > 0 && (
                <>
                  <h3>{p.undergoesTitle}</h3>
                  <ul className="sl-mat-rx">{p.undergoes.map(row)}</ul>
                </>
              )}
              {p.causes.length > 0 && (
                <>
                  <h3>{p.causesTitle}</h3>
                  <ul className="sl-mat-rx">{p.causes.map(row)}</ul>
                </>
              )}
            </>
          )}
        </section>
        <section className="sl-cs-sec">
          <h2>Tip</h2>
          <p>{p.tip}</p>
        </section>
        <p className="sl-cs-cta-row">
          {/* 캔버스 화면으로 — 일반 <a>(광고 로더가 따라가지 않게). 이 화면의 주 행동 하나(Ember). */}
          <a href="/" className="sl-cs-cta">
            <Icon name="pour" size={18} />
            {p.cta}
          </a>
        </p>
      </article>
      <EndAd ads={ads} />
      <PrevNext prev={p.prev} next={p.next} label="Materials" added />
    </ContentPage>
  )
}
