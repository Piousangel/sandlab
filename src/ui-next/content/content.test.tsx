import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { ARTICLES } from '@/lib/learn/articles'
import { AdPlate } from '../ads/AdPlate'
import { AD_FORMATS, AD_SLOTS } from '../ads/config'
import { LearnArticle } from './Articles'
import { ContentFrame } from './ContentFrame'
import { midAfter, neighbours, proseMidIndex, sectionIds, showToc, stripStyles } from './model'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const words = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w))
/** 새 셸이 더한 글자(목차 제목·Previous/Next)를 뺀 HTML */
const withoutChrome = (html: string) =>
  html
    .replace(/<nav[^>]*data-sl-chrome="toc"[\s\S]*?<\/nav>/g, ' ')
    .replace(/<aside[^>]*data-sl-chrome="ad"[\s\S]*?<\/aside>/g, ' ')
    .replace(/<span[^>]*data-sl-chrome="pn"[^>]*>[\s\S]*?<\/span>/g, ' ')

describe('글 페이지 모델', () => {
  it('섹션 id: 소문자·하이픈, 겹치면 -2', () => {
    expect(sectionIds(['Why it matters', 'Why it matters', 'C++ & GPU!', ''])).toEqual(['why-it-matters', 'why-it-matters-2', 'c-gpu', 'section'])
  })
  it('목차는 섹션 3개 이상일 때만', () => {
    expect([2, 3].map(showToc)).toEqual([false, true])
  })
  it('중간 광고 = 가운데 섹션 뒤, 섹션 2개 미만이면 없음', () => {
    expect([0, 1, 2, 3, 4, 5, 8].map(midAfter)).toEqual([-1, -1, 0, 1, 1, 2, 3])
  })
  it('이전/다음 경계', () => {
    expect(neighbours(['a', 'b', 'c'], 0)).toEqual({ prev: null, next: 'b' })
    expect(neighbours(['a', 'b', 'c'], 2)).toEqual({ prev: 'b', next: null })
    expect(neighbours(['a'], -1)).toEqual({ prev: null, next: null })
  })
  it('stripStyles: 인라인 style만 지우고 글자·속성·중첩은 그대로', () => {
    const tree = (
      <>
        <h2 style={{ fontSize: 20 }} id="contact">
          Contact
        </h2>
        <p style={{ opacity: 0.7 }}>
          Mail <a href="mailto:x@y.z" style={{ color: '#eef1f6' }}>x@y.z</a>.
        </p>
      </>
    )
    const html = renderToStaticMarkup(<>{stripStyles(tree)}</>)
    expect(html).not.toContain('style=')
    expect(html).toContain('id="contact"')
    expect(html).toContain('<a href="mailto:x@y.z">x@y.z</a>')
    expect(words(html)).toEqual(words(renderToStaticMarkup(tree)))
  })
  it('산문 중간 광고 자리 = 가운데 h2 앞(h2 2개 미만이면 없음)', () => {
    const nodes = [<h1 key="0" />, <p key="1" />, <h2 key="2" />, <p key="3" />, <h2 key="4" />, <p key="5" />, <h2 key="6" />]
    expect(proseMidIndex(nodes)).toBe(4)
    expect(proseMidIndex([<h1 key="0" />, <h2 key="1" />])).toBe(-1)
  })
})

describe('광고 자리(S11)', () => {
  const a = ARTICLES[0]
  const render = () =>
    renderToStaticMarkup(
      <LearnArticle title={a.title} byline="By x" sections={a.sections} sources={a.sources} others={[]} prev={null} next={null}>
        {null}
      </LearnArticle>,
    )
  const h2 = (t: string) => `>${t.replace(/&/g, '&amp;').replace(/'/g, '&#x27;')}</h2>`
  it('오너가 만든 단위(11-20): play 300x250, content-mid 320x100·728x90 한 쌍, content-end는 아직 없음(null)', () => {
    expect(AD_SLOTS).toEqual({ play: '9581379414', contentMid: { narrow: '6955216070', wide: '5642134405' }, contentEnd: null })
  })
  it('글 페이지: 본문 중간 strip 1곳(가운데 섹션 뒤, 단위 2개), 글 끝 rect는 단위가 없어 렌더 0, 광고 로더는 실린다', () => {
    const html = render()
    expect(html.match(/data-sl-ad=/g)?.length).toBe(1)
    const mid = html.indexOf('data-sl-ad="strip"')
    const k = midAfter(a.sections.length)
    expect(mid).toBeGreaterThan(html.indexOf(h2(a.sections[k].heading)))
    expect(mid).toBeLessThan(html.indexOf(h2(a.sections[k + 1].heading)))
    // 정적 HTML에는 adsbygoogle ins가 없다(자리표시만) — 마운트 뒤 화면 폭에 맞는 단위 하나만 ins로(push는 DOM의 첫 미처리 ins를 채움)
    expect(html).not.toContain('class="adsbygoogle')
    expect(html).toContain('sl-ad-face sl-ad-face--narrow')
    expect(html).toContain('adsbygoogle.js')
  })
  it('글 끝 단위가 생기면 article 뒤 rect(이전/다음과 48px), 중간 strip은 32px', () => {
    AD_SLOTS.contentEnd = 'e'
    try {
      const html = render()
      expect(html.indexOf('data-sl-ad="rect"')).toBeGreaterThan(html.indexOf('</article>'))
      expect(html.match(/margin-block:max\(var\(--sl-s-5\), 32px\)/g)?.length).toBe(1)
      expect(html.match(/margin-block:max\(var\(--sl-s-5\), 48px\)/g)?.length).toBe(1)
    } finally {
      AD_SLOTS.contentEnd = null
    }
  })
  it('strip = 고정 크기 단위 2개: data-ad-format 없음·인라인 크기 없음, CSS 값이 설정과 같다', () => {
    const html = renderToStaticMarkup(<AdPlate ads slot={{ narrow: 'n', wide: 'w' }} format="strip" clearance={32} />)
    expect(html).toContain('sl-ad--strip')
    expect(html).toContain('sl-ad-face--narrow')
    expect(html).toContain('sl-ad-face--wide')
    expect(html).not.toContain('data-ad-format')
    expect(html).not.toMatch(/<ins[^>]*style=/)
    const css = readFileSync(root + 'src/ui-next/shell/shell.css', 'utf8')
    const f = AD_FORMATS.strip
    const block = css.slice(css.indexOf('.sl-ad--strip {'))
    expect(block).toContain(`.sl-ad-face--narrow {\n  display: block;\n  width: ${f.width}px;\n  height: ${f.height}px;`)
    expect(block).toContain(`width: ${f.wide!.width}px;\n  height: ${f.wide!.height}px;`)
    expect(block).toContain(`@media (min-width: ${f.wide!.minWidth}px)`)
    expect(block).toContain(`height: ${f.height + 24}px;`)
    expect(block).toContain(`height: ${f.wide!.height + 24}px;`)
  })
  it('자리와 단위 모양이 다르면(strip에 단위 하나, rect에 한 쌍) 그리지 않는다', () => {
    expect(renderToStaticMarkup(<AdPlate ads slot="1" format="strip" />)).toBe('')
    expect(renderToStaticMarkup(<AdPlate ads slot={{ narrow: 'n', wide: 'w' }} format="rect" />)).toBe('')
  })
})

describe('본문 글자 = prod 데이터 그대로', () => {
  it('Learn 글: 새 셸 글자(목차·이전/다음 라벨) 빼면 제목·바이라인·섹션·출처 단어만 있다', () => {
    for (const a of ARTICLES) {
      const html = renderToStaticMarkup(
        <LearnArticle title={a.title} byline="By Piousangel" sections={a.sections} sources={a.sources} others={[]} prev={null} next={null}>
          {null}
        </LearnArticle>,
      )
      const art = withoutChrome(html.slice(html.indexOf('<article'), html.indexOf('</article>')))
      const expected = [
        a.title,
        'By Piousangel',
        ...a.sections.flatMap((s) => [s.heading, ...s.paragraphs, s.code ?? '']),
        'Sources',
        ...a.sources.map((s) => (s.url ? s.label : `${s.label} (Sandlab source code)`)),
      ].join(' ')
      expect(words(art)).toEqual(words(renderToStaticMarkup(<>{expected}</>)))
    }
  })
  it('산문 틀(ContentFrame)은 받은 JSX의 글자를 그대로 그린다', () => {
    const body = (
      <>
        <h1 style={{ fontSize: 30 }}>About</h1>
        <p>One two three.</p>
        <h2 style={{ marginTop: 28 }}>Who</h2>
        <p>Four.</p>
      </>
    )
    const html = renderToStaticMarkup(<ContentFrame ads={false}>{body.props.children}</ContentFrame>)
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
    expect(main).not.toContain('style=')
    expect(words(main)).toEqual(words(renderToStaticMarkup(body)))
    expect(html).not.toContain('adsbygoogle.js')
  })
})
