/**
 * 새 UI 금지 규칙 린트(redesign-concept.md 0-1 R8) — 이모지·유니코드 기호를 아이콘/버튼 라벨로 쓰지 않는다.
 * 대체: src/ui-next/icons의 <Icon name=…/> (SVG, currentColor).
 *
 * 검사 대상: 기본 src/ui-next/ 아래 .ts .tsx .js .mjs .css (인자로 다른 폴더·파일을 줄 수 있다).
 * 주석은 검사하지 않는다(설명에 화살표 등을 쓰는 건 자유). 문자열·JSX 텍스트·CSS content는 검사하고,
 * 이스케이프(\u2192, CSS \25B6, &rarr;, &#9733;)로 쓴 것도 잡는다.
 * 알려진 한계: 정규식 리터럴 안의 // 나 따옴표, `return 'http://…'`처럼 문자열 안 URL 뒤쪽은 놓칠 수 있다(미탐 방향).
 * 꼭 필요한 줄은 그 줄에 `lint-ui-allow` 주석을 단다(리뷰에서 이유를 본다).
 *
 * 규칙 2(P3, R3 '회색 패널 위 회색 패널' 금지): 무채 면(bone-2·ad·bone-line·kiln-2·잉크 반투명 틴트) 위에 또 무채 면을 쌓지 않는다.
 *   - CSS: 무채 배경을 칠하는 규칙의 선택자 조상 부분에 다른 무채 면 클래스가 있으면 위반(예: `.sl-foot .chip{background:var(--sl-bone-2)}`).
 *   - TSX: 같은 파일 JSX 안에서 무채 면 요소(검사 대상 CSS의 무채 면 클래스 또는 inline style background) 안에 또 무채 면 요소가 있으면 위반.
 *   - 한계: 컴포넌트 경계를 넘는 중첩(A의 면 안에 B 컴포넌트가 면을 그림)은 못 잡는다 — 리뷰·캡처로 본다. 바탕 면(bone·kiln·empty)은 대상 아님.
 *     CSS는 `:is(.a, .b) .c`처럼 괄호 안 쉼표와 네이티브 CSS 중첩을 처리하지 않는다(미탐 방향). CSS의 lint-ui-allow는 규칙의 여는 중괄호 줄에 단다.
 *
 * 실행: pnpm lint:ui   (위반이 있으면 exit 1 — CI에 그대로 넣을 수 있다)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_TARGETS = ['src/ui-next']
const EXT = /\.(ts|tsx|js|mjs|css)$/

// 기호 블록: 화살표·기술 기호(⏩ ⌫)·도형(◆ ▶ ■)·기타 기호(★ ☰ ⛏ ☀)·딩뱃(✓ ✕ ✗)·보조 화살표(⟲ ⟳)·기타 기호·화살표(⬆ ⭐)
const SYMBOL_BLOCKS = [
  [0x2190, 0x21ff],
  [0x2300, 0x23ff],
  [0x25a0, 0x25ff],
  [0x2600, 0x26ff],
  [0x2700, 0x27bf],
  [0x27f0, 0x27ff],
  [0x2900, 0x297f],
  [0x2b00, 0x2bff],
]
// 블록 밖이지만 아이콘 대용으로 흔히 쓰는 문자: 곱셈 기호(닫기 대용), 이모지 변형 선택자·ZWJ
const EXTRA = new Set([0x00d7, 0xfe0f, 0x200d])
// 국기 이모지(지역 지시자)는 Extended_Pictographic이 아니다
const REGIONAL = [0x1f1e6, 0x1f1ff]
// 아이콘이 아닌 정상 텍스트로 허용: © ® ™ (Extended_Pictographic에 걸리지만 법적 표기)
const ALLOW = new Set([0x00a9, 0x00ae, 0x2122])
const PICTO = /\p{Extended_Pictographic}/u

export function isBanned(cp) {
  if (ALLOW.has(cp)) return false
  if (EXTRA.has(cp)) return true
  if (cp >= REGIONAL[0] && cp <= REGIONAL[1]) return true
  if (SYMBOL_BLOCKS.some(([a, b]) => cp >= a && cp <= b)) return true
  return PICTO.test(String.fromCodePoint(cp))
}

/** 주석을 공백으로 바꾼다(줄 번호 유지). 문자열('…' "…" `…`) 안의 // /* 는 주석이 아니다. */
export function stripComments(src, { css = false } = {}) {
  let out = ''
  let i = 0
  let quote = null
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (quote) {
      out += c
      if (c === '\\') {
        out += n ?? ''
        i += 2
        continue
      }
      if (c === quote || (c === '\n' && quote !== '`')) quote = null
      i++
      continue
    }
    if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end === -1 ? src.length : end + 2
      out += src.slice(i, stop).replace(/[^\n]/g, ' ')
      i = stop
      continue
    }
    // 'https://…' 처럼 콜론 바로 뒤의 // 는 URL(JSX 텍스트 속 링크)로 보고 주석으로 치지 않는다
    if (!css && c === '/' && n === '/' && src[i - 1] !== ':') {
      const end = src.indexOf('\n', i)
      const stop = end === -1 ? src.length : end
      out += ' '.repeat(stop - i)
      i = stop
      continue
    }
    // 작은따옴표는 앞 글자가 영숫자면(Don't 같은 JSX 텍스트) 문자열 시작으로 보지 않는다
    if (c === '"' || c === '`' || (c === "'" && !/[A-Za-z0-9]/.test(prevNonSpace(src, i)))) quote = c
    out += c
    i++
  }
  return out
}

function prevNonSpace(src, i) {
  for (let j = i - 1; j >= 0; j--) if (!/\s/.test(src[j])) return src[j]
  return ''
}

const NAMED = { rarr: 0x2192, larr: 0x2190, uarr: 0x2191, darr: 0x2193, harr: 0x2194, times: 0x00d7, star: 0x2606, starf: 0x2605, check: 0x2713, cross: 0x2717, hearts: 0x2665, spades: 0x2660, clubs: 0x2663, diams: 0x2666, loz: 0x25ca, squ: 0x25a1, rArr: 0x21d2, lArr: 0x21d0 }

/**
 * 이스케이프로 쓴 기호도 잡는다: JS \uXXXX·\u{…}, CSS \XXXX(1~6자리 16진), HTML 엔티티 &#NNN; &#xHH; &rarr; 등.
 * 반환: [{ index, cp }] (index = 줄 안 위치)
 */
export function escapedCodePoints(line, { css = false } = {}) {
  const found = []
  const push = (index, cp) => Number.isFinite(cp) && cp <= 0x10ffff && found.push({ index, cp })
  for (const m of line.matchAll(/\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})/g)) push(m.index, parseInt(m[1] ?? m[2], 16))
  if (css) for (const m of line.matchAll(/\\([0-9a-fA-F]{1,6})/g)) push(m.index, parseInt(m[1], 16))
  for (const m of line.matchAll(/&#(?:x([0-9a-fA-F]+)|(\d+));/g)) push(m.index, m[1] ? parseInt(m[1], 16) : parseInt(m[2], 10))
  for (const m of line.matchAll(/&([A-Za-z]+);/g)) if (m[1] in NAMED) push(m.index, NAMED[m[1]])
  return found
}

/** 위반 목록: { line, col, char, code } */
export function findViolations(src, file = 'x.tsx') {
  const rawLines = src.split('\n')
  const lines = stripComments(src, { css: file.endsWith('.css') }).split('\n')
  const found = []
  lines.forEach((line, li) => {
    if (rawLines[li]?.includes('lint-ui-allow')) return
    const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')
    let col = 0
    for (const ch of line) {
      const cp = ch.codePointAt(0)
      if (isBanned(cp)) found.push({ line: li + 1, col: col + 1, char: ch, code: hex(cp) })
      col += ch.length
    }
    for (const { index, cp } of escapedCodePoints(line, { css: file.endsWith('.css') }))
      if (isBanned(cp)) found.push({ line: li + 1, col: index + 1, char: String.fromCodePoint(cp), code: hex(cp) + '(이스케이프)' })
  })
  return found
}

function walk(p) {
  const st = statSync(p, { throwIfNoEntry: false })
  if (!st) return []
  if (st.isFile()) return EXT.test(p) ? [p] : []
  return readdirSync(p).flatMap((f) => (f === 'node_modules' ? [] : walk(join(p, f))))
}

// ---------- 규칙 2: 회색 패널 중첩(R3) ----------

/** 무채 면으로 보는 배경 값: 토큰 이름 또는 같은 색의 hex, 잉크(42,33,24) 반투명 틴트 */
const PANEL_VALUE = /--sl-(?:bone-2|bone-line|ad|kiln-2)(?![\w-])|#(?:EADFCB|E2DFD8|D9CBB2|1E1A16)\b|rgba\(\s*42\s*,\s*33\s*,\s*24\s*,/i
const BG_DECL = /(?:^|[;{\s])background(?:-color|-image)?\s*:\s*([^;}]+)/gi

export function isPanelBackground(declarations) {
  for (const m of String(declarations).matchAll(BG_DECL)) if (PANEL_VALUE.test(m[1])) return true
  return false
}

/** CSS 규칙 목록(@media 안쪽 포함, @keyframes 안은 제외): [{ selector, body, line }] */
export function cssRules(css) {
  const src = stripComments(css, { css: true })
  const rules = []
  const stack = []
  let start = 0
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '{') {
      stack.push({ head: src.slice(start, i).trim(), open: i })
      start = i + 1
    } else if (c === '}') {
      const top = stack.pop()
      if (top && !top.head.startsWith('@') && !stack.some((s) => /^@(?:-\w+-)?keyframes/.test(s.head))) {
        rules.push({ selector: top.head, body: src.slice(top.open + 1, i), line: src.slice(0, top.open).split('\n').length })
      }
      start = i + 1
    } else if (c === ';' && stack.length === 0) start = i + 1
  }
  return rules
}

const classesIn = (compound) => [...compound.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1])

/** 선택자 하나를 조상 부분들과 대상(마지막) 부분으로 나눈다. 형제 결합자(+ ~) 앞은 조상이 아니라 끊는다. */
function splitSelector(sel) {
  const parts = sel.replace(/\s*([>+~])\s*/g, ' $1 ').trim().split(/\s+/)
  const ancestors = []
  let subject = ''
  for (const p of parts) {
    if (p === '+' || p === '~') {
      subject = ''
      continue
    }
    if (p === '>') continue
    if (subject) ancestors.push(subject)
    subject = p
  }
  return { ancestors, subject }
}

/** CSS 텍스트에서 무채 면 클래스(대상 부분이 그 클래스이고 무채 배경을 칠하는 규칙) */
export function panelClassesFromCss(css) {
  const out = new Set()
  for (const r of cssRules(css)) {
    if (!isPanelBackground(r.body)) continue
    for (const sel of r.selector.split(',')) for (const c of classesIn(splitSelector(sel).subject)) out.add(c)
  }
  return out
}

/** CSS 안의 중첩: 무채 배경 규칙인데 선택자 조상에 무채 면 클래스가 있다 */
export function findCssPanelNesting(css, panels = panelClassesFromCss(css)) {
  const rawLines = css.split('\n')
  const found = []
  for (const r of cssRules(css)) {
    if (!isPanelBackground(r.body)) continue
    if (rawLines[r.line - 1]?.includes('lint-ui-allow')) continue
    for (const sel of r.selector.split(',')) {
      const outer = splitSelector(sel).ancestors.flatMap(classesIn).find((c) => panels.has(c))
      if (outer) found.push({ line: r.line, rule: 'panel', detail: `${sel.trim()} — .${outer} 면 위에 또 무채 면` })
    }
  }
  return found
}

// JSX 여는 태그로 볼 '<' 앞 글자(식별자 뒤의 '<'는 제네릭·비교: useState<T>, a<b)
const JSX_BEFORE = new Set(['(', '>', '}', '{', '=', '?', ':', '&', '|', ',', ';', '[', ''])

/** TSX: 같은 파일 JSX 트리에서 무채 면 요소 안의 무채 면 요소 */
export function findJsxPanelNesting(src, panels = new Set()) {
  const code = stripComments(src)
  const rawLines = src.split('\n')
  const lineAt = (i) => code.slice(0, i).split('\n').length
  const esc = (c) => c.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')
  const classRe = panels.size ? new RegExp(`(?:^|[\\s'"\`{])(?:${[...panels].map(esc).join('|')})(?=$|[\\s'"\`}])`) : null
  const isPanel = (attrs) => {
    const cls = attrs.match(/className\s*=\s*(\{[\s\S]*?\}|"[^"]*"|'[^']*')/)
    if (cls && classRe && classRe.test(cls[1])) return true
    // style={{ background: 'var(--sl-bone-2)' }} · backgroundColor
    // 값은 따옴표 단위로 잡는다 — 쉼표에서 끊으면 'rgba(42, 33, 24, .06)'를 놓친다(독립 리뷰 실측)
    for (const m of attrs.matchAll(/background(?:Color|Image)?\s*:\s*(?:(['"`])([^'"`]*)\1|([^,}]+))/g)) if (PANEL_VALUE.test(m[2] ?? m[3])) return true
    return false
  }
  const stack = []
  const found = []
  for (let i = 0; i < code.length; i++) {
    if (code[i] !== '<') continue
    const n = code[i + 1] ?? ''
    if (n === '/') {
      const m = code.slice(i, i + 200).match(/^<\/\s*([\w.:-]*)\s*>/)
      if (!m) continue
      const at = stack.map((s) => s.name).lastIndexOf(m[1])
      if (at !== -1) stack.length = at
      i += m[0].length - 1
      continue
    }
    if (!(n === '>' || /[A-Za-z]/.test(n))) continue
    let j = i - 1
    while (j >= 0 && /\s/.test(code[j])) j--
    const before = j >= 0 ? code[j] : ''
    const word = code.slice(Math.max(0, j - 10), j + 1).match(/(\w+)$/)?.[1]
    if (!JSX_BEFORE.has(before) && word !== 'return') continue
    // 태그 끝(>) 찾기: 중괄호 깊이·따옴표를 따라간다(속성 안의 => 와 문자열 속 > 를 건너뜀)
    let depth = 0
    let quote = null
    let k = i + 1
    for (; k < code.length; k++) {
      const c = code[k]
      if (quote) {
        if (c === '\\') k++
        else if (c === quote) quote = null
        continue
      }
      if (c === '"' || c === "'" || c === '`') quote = c
      else if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0) break
    }
    if (k >= code.length) break
    const inner = code.slice(i + 1, k)
    const name = inner.match(/^([\w.:-]*)/)[1]
    const panel = isPanel(inner)
    const line = lineAt(i)
    if (panel && !rawLines[line - 1]?.includes('lint-ui-allow')) {
      const outer = [...stack].reverse().find((s) => s.panel)
      if (outer) found.push({ line, rule: 'panel', detail: `<${name || '>'}> 무채 면이 ${outer.line}행 <${outer.name || '>'}> 면 안에 있다` })
    }
    if (!inner.trimEnd().endsWith('/')) stack.push({ name, panel, line })
    i = k
  }
  return found
}

export function lintPaths(targets = DEFAULT_TARGETS) {
  const files = targets.flatMap(walk)
  const problems = []
  const panels = new Set()
  for (const f of files) if (f.endsWith('.css')) for (const c of panelClassesFromCss(readFileSync(f, 'utf8'))) panels.add(c)
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    const file = relative(process.cwd(), f)
    for (const v of findViolations(src, f)) problems.push({ file, rule: 'symbol', ...v })
    if (f.endsWith('.css')) for (const v of findCssPanelNesting(src, panels)) problems.push({ file, ...v })
    if (/\.[jt]sx$/.test(f)) for (const v of findJsxPanelNesting(src, panels)) problems.push({ file, ...v })
  }
  return { files: files.length, problems, panels: [...panels].sort() }
}

function main() {
  const targets = process.argv.slice(2)
  const { files, problems, panels } = lintPaths(targets.length ? targets : DEFAULT_TARGETS)
  if (problems.length) {
    for (const p of problems) {
      if (p.rule === 'panel') console.error(`${p.file}:${p.line}  회색 패널 중첩(R3) ${p.detail} — 바탕(Bone/Kiln) 위에 면 하나만, 위계는 크기·여백으로`)
      else console.error(`${p.file}:${p.line}:${p.col}  금지 문자 ${p.char} (${p.code}) — 이모지·기호 아이콘 대신 <Icon name=…/>`)
    }
    console.error(`\nlint-ui-rules: 위반 ${problems.length}건 (${files}개 파일)`)
    process.exit(1)
  }
  console.log(`lint-ui-rules: OK (${files}개 파일, 이모지·기호 아이콘 0, 회색 패널 중첩 0 — 무채 면 클래스 ${panels.length}개: ${panels.join(' ')})`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
