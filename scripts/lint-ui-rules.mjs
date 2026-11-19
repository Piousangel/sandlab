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

export function lintPaths(targets = DEFAULT_TARGETS) {
  const files = targets.flatMap(walk)
  const problems = []
  for (const f of files) {
    for (const v of findViolations(readFileSync(f, 'utf8'), f)) problems.push({ file: relative(process.cwd(), f), ...v })
  }
  return { files: files.length, problems }
}

function main() {
  const targets = process.argv.slice(2)
  const { files, problems } = lintPaths(targets.length ? targets : DEFAULT_TARGETS)
  if (problems.length) {
    for (const p of problems) console.error(`${p.file}:${p.line}:${p.col}  금지 문자 ${p.char} (${p.code}) — 이모지·기호 아이콘 대신 <Icon name=…/>`)
    console.error(`\nlint-ui-rules: 위반 ${problems.length}건 (${files}개 파일)`)
    process.exit(1)
  }
  console.log(`lint-ui-rules: OK (${files}개 파일, 이모지·기호 아이콘 0)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
