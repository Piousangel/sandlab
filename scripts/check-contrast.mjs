/**
 * 리디자인 토큰 대비 검사(S2·S1 보완) — src/ui-next/tokens.css의 --sl-* 값을 직접 읽어 WCAG 2.x 대비를 잰다.
 * 기준 미달이면 exit 1. 토큰을 바꾸면 `pnpm check:contrast`.
 *
 * - 본문 글자 4.5:1, 큰 글자·아이콘·비텍스트 윤곽 3:1(WCAG 1.4.3·1.4.11).
 * - 반투명 색(rgba)은 배경 위에 합성한 뒤 잰다(예: 시험관 윤곽 .58 over bone).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const TOKENS_CSS = fileURLToPath(new URL('../src/ui-next/tokens.css', import.meta.url))

/** [전경, 배경, 최소 대비, 용도]. 전경·배경은 토큰 이름(--sl- 생략) 또는 #hex */
export const PAIRS = [
  ['ink', 'bone', 4.5, '본문'],
  ['ink', 'bone-2', 4.5, '카드 위 본문'],
  ['ink-2', 'bone', 4.5, '보조 텍스트'],
  ['ink-2', 'bone-2', 4.5, '카드·도크 위 보조 텍스트'],
  ['on-ember', 'ember', 4.5, '주 행동 버튼 글자(S2)'],
  ['ember-text', 'bone', 4.5, '링크·강조 텍스트'],
  // ember-text / bone-2 = 4.43:1로 미달(P1 실측) → ember-text는 bone 위에서만. 카드(bone-2) 위 링크는 ink + 밑줄.
  ['tube-line', 'bone', 3, '시험관 윤곽(비텍스트, S1 ≥ .58)'],
  ['ok', 'bone', 3, '상태 아이콘(성공)'],
  ['warn', 'bone', 3, '상태 아이콘(실패)'],
  ['on-kiln', 'kiln', 4.5, '어두운 면 글자'],
  ['on-kiln-2', 'kiln', 4.5, '어두운 면 보조 글자'],
  ['on-kiln', 'kiln-2', 4.5, '어두운 패널 글자'],
  ['ink', 'ad', 4.5, '광고 안내판 라벨'],
  // 비텍스트 3:1(WCAG 1.4.11) — 회귀 방지
  ['ember', 'bone', 3, '주 행동 버튼 면 경계'],
  ['ember', 'bone-2', 3, '도크 위 주 행동 버튼 면'],
  ['ok', 'bone-2', 3, '카드 위 상태 아이콘(성공)'],
  ['warn', 'bone-2', 3, '카드 위 상태 아이콘(실패)'],
  ['tube-line', 'bone-2', 3, '카드 위 시험관 윤곽'],
  ['on-kiln-2', 'kiln-2', 4.5, '어두운 패널 보조 글자'],
  // Spill 보드 목표 = 셀 영역(카드 #139, render/canvas.ts bakeBackdrop) — 물색 윤곽 #2E6FD9, 15% 틴트, 빈 셀 #07090D.
  // 보드 방향(B2/A2) 결정 뒤 테마 팔레트로 바뀌면 여기 hex도 같이 바뀐다(backdrop.test.ts가 일치를 확인).
  ['#2E6FD9', '#0D182C', 3, '보드 목표 윤곽 / 목표 틴트(비텍스트)'],
  ['#2E6FD9', '#07090D', 3, '보드 목표 윤곽 / 빈 보드(비텍스트)'],
]

/** 일부러 금지한 조합 — 미달이어야 정상(규칙이 문서와 함께 유지되게). 통과하게 바뀌면 규칙을 풀어도 된다는 뜻 */
export const FORBIDDEN = [['ember-text', 'bone-2', 4.5, 'ember-text는 bone 위에서만 — 카드 위 링크는 ink + 밑줄']]

/** CSS 텍스트에서 :root의 --sl-* 선언을 읽는다(첫 선언 우선 — reduced-motion 재정의는 색이 아니라 무관). */
/** @param {string} css @returns {Record<string, string>} */
export function parseTokens(css) {
  /** @type {Record<string, string>} */
  const out = {}
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of body.matchAll(/--sl-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (!(m[1] in out)) out[m[1]] = m[2].trim()
  }
  return out
}

/** '#RGB' '#RRGGBB' 'rgb(a)(…)' → {r,g,b,a} (0~255, a 0~1). 색이 아니면 null */
export function parseColor(v) {
  const s = String(v).trim()
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 }
  }
  m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i)
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] }
  return null
}

/** 반투명 전경을 불투명 배경 위에 합성 */
export function composite(fg, bg) {
  const a = fg.a
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }
}

function channel(c) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminance({ r, g, b }) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(fg, bg) {
  if (bg.a !== 1) throw new Error('배경은 불투명이어야 한다')
  const f = fg.a === 1 ? fg : composite(fg, bg)
  const [l1, l2] = [luminance(f), luminance(bg)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

function resolve(tokens, ref) {
  const raw = ref.startsWith('#') ? ref : tokens[ref]
  if (raw === undefined) throw new Error(`토큰 --sl-${ref} 없음`)
  const c = parseColor(raw)
  if (!c) throw new Error(`--sl-${ref}: 색이 아님(${raw})`)
  return c
}

/** 모든 쌍을 재고 결과 배열을 돌려준다 */
export function checkPairs(tokens, pairs = PAIRS) {
  return pairs.map(([fg, bg, min, use]) => {
    const ratio = contrast(resolve(tokens, fg), resolve(tokens, bg))
    return { fg, bg, min, use, ratio, ok: ratio >= min }
  })
}

function main() {
  const tokens = parseTokens(readFileSync(TOKENS_CSS, 'utf8'))
  const rows = checkPairs(tokens)
  for (const r of rows) {
    const mark = r.ok ? 'OK  ' : 'FAIL'
    console.log(`${mark} ${r.ratio.toFixed(2).padStart(5)}:1 (≥${r.min})  ${r.fg} / ${r.bg}  — ${r.use}`)
  }
  const bad = rows.filter((r) => !r.ok)
  if (bad.length) {
    console.error(`\n대비 미달 ${bad.length}건`)
    process.exit(1)
  }
  console.log(`\n대비 ${rows.length}쌍 전부 통과`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
