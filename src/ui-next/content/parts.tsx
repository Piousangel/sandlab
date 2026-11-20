/**
 * 글 페이지 공용 조각(리디자인 P10) — 페이지 뼈대·목차·이전/다음·광고 자리·섹션.
 * 서버 컴포넌트. 새 셸이 더하는 글자(목차 제목·Previous/Next 라벨)는 data-sl-chrome 안에만 둔다(parity 검사가 본문과 따로 센다).
 */
import type { ReactNode } from 'react'
import AdLoader from '@/components/AdLoader'
import { AdPlate } from '../ads/AdPlate'
import { AD_SLOTS } from '../ads/config'
import { Icon } from '../icons/Icon'
import { ShellFooter } from '../shell/ShellFooter'
import { ShellHeader } from '../shell/ShellHeader'
import type { ArticleSectionData, PageLink } from '../shell/contentTypes'
import { midAfter, sectionIds, showToc } from './model'

/** Bone 한 면 + 새 셸 헤더·푸터. ads면 광고 로더(verify-ads 허용 페이지와 같은 조건 — 페이지가 정한다). */
export function ContentPage({ ads, variant, children }: { ads: boolean; variant: string; children: ReactNode }) {
  return (
    <div className="sl-cs-page">
      {ads && <AdLoader />}
      <ShellHeader />
      <main className={`sl-cs sl-cs--${variant}`}>{children}</main>
      <ShellFooter />
    </div>
  )
}

/** 본문 중간 광고(띠 320×100 / 728×90). 단위 id 없으면 렌더 0. */
export function MidAd({ ads }: { ads: boolean }) {
  return <AdPlate ads={ads} slot={AD_SLOTS.contentMid} format="strip" clearance={32} />
}

/** 글 끝 광고(300×250). 바로 아래가 이전/다음 카드라 간격 48px(내비 옆 광고 = 실수 클릭 유도 위험, P10 리뷰). */
export function EndAd({ ads }: { ads: boolean }) {
  return <AdPlate ads={ads} slot={AD_SLOTS.contentEnd} format="rect" clearance={48} />
}

/** 뒤로 가기 줄 — prod의 "← Learn"과 같은 글자(화살표는 아이콘). 캔버스 화면으로 나갈 수 있는 링크는 일반 <a>(광고 로더가 따라가지 않게). */
export function BackLink({ link }: { link: PageLink }) {
  return (
    <p className="sl-cs-back">
      <a href={link.href}>
        <Icon name="back" size={16} />
        {link.label}
      </a>
    </p>
  )
}

export function Toc({ items }: { items: { id: string; label: string }[] }) {
  if (!showToc(items.length)) return null
  return (
    <nav className="sl-cs-toc" aria-labelledby="sl-cs-toc-h" data-sl-chrome="toc">
      <p id="sl-cs-toc-h" className="sl-cs-lbl">
        On this page
      </p>
      <ol>
        {items.map((t) => (
          <li key={t.id}>
            <a href={`#${t.id}`}>{t.label}</a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** 섹션들 + 중간 광고 1곳(가운데 섹션 뒤). 코드 블록은 bone-2 카드(모노). */
export function Sections({ sections, ads, ids }: { sections: ArticleSectionData[]; ads: boolean; ids: string[] }) {
  const mid = midAfter(sections.length)
  return (
    <>
      {sections.map((s, i) => (
        <SectionWithAd key={s.heading} s={s} id={ids[i]} ad={ads && i === mid} ads={ads} />
      ))}
    </>
  )
}

function SectionWithAd({ s, id, ad, ads }: { s: ArticleSectionData; id: string; ad: boolean; ads: boolean }) {
  return (
    <>
      <section className="sl-cs-sec" aria-labelledby={id}>
        <h2 id={id}>{s.heading}</h2>
        {s.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {s.code && (
          // 가로 스크롤 영역 — 키보드로 닿게(axe scrollable-region-focusable)
          <pre className="sl-cs-code" tabIndex={0}>
            <code>{s.code}</code>
          </pre>
        )}
      </section>
      {ad && <MidAd ads={ads} />}
    </>
  )
}

export function tocOf(sections: { heading: string }[]): { ids: string[]; items: { id: string; label: string }[] } {
  const ids = sectionIds(sections.map((s) => s.heading))
  return { ids, items: sections.map((s, i) => ({ id: ids[i], label: s.heading })) }
}

/**
 * 이전/다음 카드 — 라벨(Previous/Next)은 chrome. `added`면 prod에 없던 탐색이라 nav 전체가 chrome(Learn 글·재료),
 * 아니면 링크 글자는 prod 본문(레벨 공략의 이전/다음 공략 링크).
 */
export function PrevNext({ prev, next, label, added = false }: { prev: PageLink | null; next: PageLink | null; label: string; added?: boolean }) {
  if (!prev && !next) return null
  return (
    <nav className="sl-cs-pn" aria-label={label} data-sl-chrome={added ? 'pn-nav' : undefined}>
      {prev ? (
        <a href={prev.href} className="sl-cs-pn-card" rel="prev">
          <span className="sl-cs-lbl" data-sl-chrome="pn">
            <Icon name="back" size={14} />
            Previous
          </span>
          <span className="sl-cs-pn-t">{prev.label}</span>
        </a>
      ) : (
        <span aria-hidden className="sl-cs-pn-gap" />
      )}
      {next && (
        <a href={next.href} className="sl-cs-pn-card is-next" rel="next">
          <span className="sl-cs-lbl" data-sl-chrome="pn">
            Next
            <Icon name="next" size={14} />
          </span>
          <span className="sl-cs-pn-t">{next.label}</span>
        </a>
      )}
    </nav>
  )
}
