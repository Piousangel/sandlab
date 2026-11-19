import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  findCssPanelNesting,
  findJsxPanelNesting,
  findViolations,
  isBanned,
  isPanelBackground,
  lintPaths,
  panelClassesFromCss,
  stripComments,
} from './lint-ui-rules.mjs'

// 금지 문자는 코드 포인트로만 만든다(이 파일 자체에 기호 문자가 들어가지 않게).
const ch = (cp: number) => String.fromCodePoint(cp)
// 계획서 예시(되돌리기 2종·빨리감기·곡괭이·별·마름모·햄버거·재생) + 화살표·곱셈·딩뱃 X·불꽃 이모지·별 이모지·국기 이모지 반쪽
const BANNED = [0x27f2, 0x21ba, 0x23e9, 0x26cf, 0x2605, 0x25c6, 0x2630, 0x25b6, 0x2192, 0x00d7, 0x2715, 0x1f525, 0x2b50, 0x1f1f0]
const BS = '\\'

describe('lint-ui-rules', () => {
  it.each(BANNED.map((cp) => [cp.toString(16)]))('U+%s 를 금지한다', (hex) => {
    const cp = parseInt(hex, 16)
    expect(isBanned(cp)).toBe(true)
    expect(findViolations(`<button>${ch(cp)}</button>`)).toHaveLength(1)
  })

  it('일반 글자·한글·법적 기호·가운뎃점·대시는 통과', () => {
    expect(findViolations(`<p>Pour sand ${ch(0xb7)} 붓기 ${ch(0xa9)} 2026 Sandlab${ch(0x2122)} ${ch(0x2014)} 1200 x 600</p>`)).toEqual([])
  })

  it('주석 안의 기호는 무시하고, 문자열 안의 // 는 주석으로 보지 않는다', () => {
    const star = ch(0x2605)
    const src = `// 설명 ${ch(0x2192)} 괜찮음\n/* ${star} */\nconst a = 'https://x.y/${star}'\nconst b = "ok"`
    const v = findViolations(src)
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ line: 3, char: star, code: 'U+2605' })
    expect(stripComments(src).split('\n')).toHaveLength(4)
  })

  it('JSX 텍스트의 URL·아포스트로피를 주석·문자열로 오인하지 않는다', () => {
    // URL 뒤 기호를 놓치지 않는다
    expect(findViolations(`<a>https://x ${ch(0x2605)}</a>`)).toHaveLength(1)
    // Don't 의 ' 가 문자열을 열어 같은 줄 주석을 검사 대상으로 만들지 않는다
    expect(findViolations(`<p>Don't</p> {/* ${ch(0x2605)} */}`)).toEqual([])
  })

  it('이스케이프로 쓴 기호도 잡는다(JS·CSS·HTML 엔티티)', () => {
    expect(findViolations(`const a = '${BS}u2192'`)).toHaveLength(1)
    expect(findViolations(`const a = '${BS}u{1F525}'`)).toHaveLength(1)
    expect(findViolations(`.a::before{content:"${BS}25B6"}`, 'a.css')).toHaveLength(1)
    expect(findViolations('<b>&rarr; &#9733; &#x2630; &times;</b>')).toHaveLength(4)
    // 정상 이스케이프는 통과
    expect(findViolations(`const a = '${BS}u00e9 &amp; &#169;'`)).toEqual([])
    expect(findViolations(`.a{content:"${BS}2014"}`, 'a.css')).toEqual([])
  })

  it('CSS content와 lint-ui-allow 예외', () => {
    expect(findViolations(`.a::before{content:"${ch(0x25b6)}"}`, 'a.css')).toHaveLength(1)
    expect(findViolations(`.a::before{content:"${ch(0x25b6)}"} /* lint-ui-allow: 이유 */`, 'a.css')).toEqual([])
  })

  it('폴더를 훑어 위반을 모은다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lint-ui-'))
    writeFileSync(join(dir, 'ok.tsx'), 'export const A = () => <b>Share</b>\n')
    writeFileSync(join(dir, 'bad.tsx'), `export const B = () => <b>${ch(0x2630)}</b>\n`)
    writeFileSync(join(dir, 'skip.png'), ch(0x2630))
    const r = lintPaths([dir])
    expect(r.files).toBe(2)
    expect(r.problems).toHaveLength(1)
    expect(r.problems[0].file).toMatch(/bad\.tsx$/)
  })

  it('지금 src/ui-next는 위반 0', () => {
    expect(lintPaths().problems).toEqual([])
  })
})

describe('lint-ui-rules 규칙 2: 회색 패널 중첩(R3)', () => {
  const CSS = `
.card { background: var(--sl-bone-2); border-radius: 16px }
.dock{background-color:#EADFCB}
.tint { background: rgba(42, 33, 24, .06) }
.bone { background: var(--sl-bone) }
.line { border-color: var(--sl-bone-2) }
@media (min-width: 720px) { .wide { background: var(--sl-ad) } }
@keyframes k { from { background: var(--sl-bone-2) } }
`
  it('무채 면 클래스를 모은다(배경만, 테두리·바탕 면·keyframes 제외, @media 안 포함)', () => {
    expect([...panelClassesFromCss(CSS)].sort()).toEqual(['card', 'dock', 'tint', 'wide'])
    expect(isPanelBackground('background: var(--sl-ad-line)')).toBe(false) // ad-line은 선 색, ad 면 아님
    expect(isPanelBackground('background: var(--sl-kiln-2)')).toBe(true)
  })

  it('CSS: 면 클래스 아래에서 또 무채 배경을 칠하면 위반, 형제·바탕 면은 통과', () => {
    const bad = `${CSS}\n.card .chip { background: var(--sl-bone-2) }\n.dock > .grains{background:rgba(42,33,24,.06)}`
    const v = findCssPanelNesting(bad)
    expect(v.map((x) => x.detail)).toEqual([expect.stringContaining('.card'), expect.stringContaining('.dock')])
    expect(findCssPanelNesting(`${CSS}\n.card + .chip { background: var(--sl-bone-2) }\n.bone .chip{background:var(--sl-bone-2)}`)).toEqual([])
    expect(findCssPanelNesting(`${CSS}\n.card .chip { background: var(--sl-bone-2) } /* lint-ui-allow: 이유 */`)).toEqual([])
  })

  it('TSX: 같은 파일 JSX에서 면 안의 면(클래스·inline style 둘 다)', () => {
    const panels = new Set(['card', 'dock'])
    const src = [
      'export const A = () => (',
      '  <div className="card">',
      '    <span className="x dock">a</span>',
      '  </div>',
      ')',
      "export const B = () => <div style={{ background: 'var(--sl-bone-2)' }}><i style={{ backgroundColor: '#EADFCB' }} /></div>",
    ].join('\n')
    const v = findJsxPanelNesting(src, panels)
    expect(v.map((x) => x.line)).toEqual([3, 6])
    // 잉크 반투명 틴트(쉼표가 든 rgba)도 inline style에서 잡는다
    const tint = "<div style={{ background: 'rgba(42, 33, 24, .06)' }}><i style={{ background: \"rgba(42,33,24,.1)\" }} /></div>"
    expect(findJsxPanelNesting(tint)).toHaveLength(1)
  })

  it('TSX: 형제 면·닫힌 뒤의 면·제네릭·화살표 속성은 오탐하지 않는다', () => {
    const panels = new Set(['card'])
    const src = [
      "import { useState } from 'react'",
      'export function C() {',
      '  const [a] = useState<string>(\'\')',
      '  return (',
      '    <>',
      '      <div className="card" onClick={() => a > "b"}>x</div>',
      '      <div className="card">y</div>',
      '      <section><p className={`card ${a}`} /></section>',
      '    </>',
      '  )',
      '}',
    ].join('\n')
    expect(findJsxPanelNesting(src, panels)).toEqual([])
  })

  it('폴더 검사에서 CSS의 면 클래스를 TSX에 적용한다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lint-ui-panel-'))
    writeFileSync(join(dir, 'a.css'), '.plate{background:var(--sl-bone-2)}\n')
    writeFileSync(join(dir, 'a.tsx'), 'export const A = () => <div className="plate"><b className="plate">x</b></div>\n')
    const r = lintPaths([dir])
    expect(r.panels).toEqual(['plate'])
    expect(r.problems).toEqual([expect.objectContaining({ rule: 'panel', line: 1 })])
  })
})
