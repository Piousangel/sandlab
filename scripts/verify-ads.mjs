/**
 * AdSense 배치 검증 — 빌드 산출물(out/) 기준.
 *
 * 왜: AdSense가 "게시자 콘텐츠가 없는 화면에 Google 게재 광고"로 sandlab.app을 반려했다
 * (2026-09-21). 로더가 루트 레이아웃에 있어 캔버스 화면·갤러리 로딩 화면에까지 실렸기 때문.
 * 이 스크립트는 (1) 로더가 허용 페이지에만 있고 (2) 허용 페이지엔 반드시 있으며
 * (3) 허용 페이지의 정적 본문 텍스트가 최소 분량 이상인지를 강제한다.
 *
 * 실행: pnpm build && node scripts/verify-ads.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const OUT = 'out'
// 광고 코드 흔적 — 로더 URL뿐 아니라 광고 단위(<ins class="adsbygoogle">)도 잡는다.
const MARKS = ['pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', 'class="adsbygoogle']

// 광고 허용 페이지 (out/ 기준 상대 경로). 정규식은 동적 세그먼트용.
// /privacy는 광고 없음(정책 페이지에 광고 = 인벤토리 부풀리기로 보인다, 2026-10-09 감사).
const ALLOW = [/^play\.html$/, /^play\/[^/]+\/guide\.html$/, /^learn\.html$/, /^learn\/[a-z0-9-]+\.html$/, /^materials\.html$/, /^materials\/[a-z]+\.html$/, /^about\.html$/]
const CANVAS = [/^play\/(?!.*\/guide\.html$).+\.html$/, /^spill\//, /^d\//]
// 허용 페이지의 최소 본문 글자 수(태그·스크립트·스타일 제거 후). 얇은 페이지에 광고 = 반려 재발.
const MIN_TEXT = 600

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []
  })
}

function bodyText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const failures = []
let allowedSeen = 0
let canvasSeen = 0
for (const file of walk(OUT)) {
  const rel = relative(OUT, file)
  const html = readFileSync(file, 'utf8')
  const hasAd = MARKS.some((m) => html.includes(m))
  const canvas = CANVAS.some((re) => re.test(rel))
  const allowed = !canvas && ALLOW.some((re) => re.test(rel))
  if (canvas) {
    canvasSeen++
    if (ALLOW.some((re) => re.test(rel))) failures.push(`${rel}: 퍼즐·캔버스 화면이 광고 허용 목록에 걸림`)
  }
  if (allowed) {
    allowedSeen++
    if (!hasAd) failures.push(`${rel}: 허용 페이지인데 광고 로더 없음`)
    const n = bodyText(html).length
    if (n < MIN_TEXT) failures.push(`${rel}: 본문 ${n}자 < ${MIN_TEXT}자`)
  } else if (hasAd) {
    failures.push(`${rel}: 허용 목록 밖인데 광고 로더 있음`)
  }
}
if (allowedSeen === 0) failures.push('허용 페이지가 하나도 빌드되지 않음')

if (failures.length) {
  console.error(`FAIL (${failures.length})\n` + failures.map((f) => '  - ' + f).join('\n'))
  process.exit(1)
}
console.log(`OK — 허용 페이지 ${allowedSeen}개, 그 외 페이지에 광고 로더 없음(퍼즐·캔버스 화면 ${canvasSeen}개 포함)`)
