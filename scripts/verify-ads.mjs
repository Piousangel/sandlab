/**
 * AdSense 배치 검증 — 빌드 산출물(out/) 기준.
 *
 * 왜: AdSense가 "게시자 콘텐츠가 없는 화면에 Google 게재 광고"로 sandlab.app을 반려했다
 * (2026-09-21). 로더가 루트 레이아웃에 있어 캔버스 화면·갤러리 로딩 화면에까지 실렸기 때문.
 * 이 스크립트는 (1) 로더가 허용 페이지에만 있고 (2) 허용 페이지엔 반드시 있으며
 * (3) 허용 페이지의 정적 본문 텍스트가 최소 분량 이상인지를 강제한다.
 *
 * 실행: pnpm run build:prod && node scripts/verify-ads.mjs   (되돌리기 빌드 검사: SANDLAB_UI=classic 를 두 명령 모두에)
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const OUT = 'out'
// 광고 코드 흔적 — 로더 URL뿐 아니라 광고 단위(<ins class="adsbygoogle">)도 잡는다.
const MARKS = ['pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', 'class="adsbygoogle']

// 광고 허용 페이지 (out/ 기준 상대 경로). 정규식은 동적 세그먼트용.
// /privacy·/terms·/contact는 광고 없음(정책 페이지에 광고 = 인벤토리 부풀리기로 보인다, 2026-10-09 감사).
// /learn 목록은 링크 모음이라 본문이 얇다(약 216단어) — 광고 없음(2026-11-16 AdSense 재검토 점검).
const ALLOW = [/^play\.html$/, /^play\/[^/]+\/guide\.html$/, /^learn\/[a-z0-9-]+\.html$/, /^materials\.html$/, /^materials\/[a-z]+\.html$/, /^about\.html$/]
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

// 프리뷰 산출물(S6)이 prod로 나가는 사고 방지. 모드는 env가 아니라 인자로 정한다(env가 새면 가드가 스스로 꺼지므로).
//  - 기본(prod): 색인 차단(out/_headers noindex·전체 차단 robots·메타 robots noindex)·읽기 전용 안내가 있으면 실패.
//    UI는 컷오버(P12, 11-20)부터 새 셸이 기본 — `SANDLAB_UI`(build:prod와 같은 변수, 비면 next)로 기대 UI를 정하고 out/이 그 UI인지 본다.
//    되돌리기(SANDLAB_UI=classic) 빌드는 새 셸 흔적이 0이어야, 새 셸 빌드는 셸 class·토큰이 있어야 한다(치환이 조용히 빠지는 사고).
//  - --preview: 위 검사를 건너뛴다(pnpm run deploy:preview 전용).
if (!process.argv.includes('--preview')) {
  // 프리뷰 읽기 전용 안내(오너 11-20, src/ui-next/shell/ReadOnlyNote.tsx)는 prod에 뜨면 안 된다 — 컷오버(P12) 뒤에도.
  if (process.env.NEXT_PUBLIC_READ_ONLY === '1') failures.push('NEXT_PUBLIC_READ_ONLY=1 환경에서 prod 검증 — 프리뷰 읽기 전용 안내가 prod에 실린다(변수를 비우고 다시 빌드)')
  if (process.env.NEXT_PUBLIC_NOINDEX === '1') failures.push('NEXT_PUBLIC_NOINDEX=1 환경에서 prod 검증 — 프리뷰 색인 차단이 prod에 실린다(pnpm run build:prod로 다시 빌드)')
  const pages = walk(OUT)
  const roPages = pages.filter((f) => readFileSync(f, 'utf8').includes('data-sl-read-only'))
  if (roPages.length) failures.push(`prod HTML ${roPages.length}쪽에 프리뷰 읽기 전용 안내(data-sl-read-only) — 프리뷰 빌드 산출물. prod는 다시 빌드`)
  // 원래 noindex인 쪽(404·검증 도구 화면)만 허용 — 그 밖에 하나라도 있으면 프리뷰 색인 차단이 섞인 것
  const NOINDEX_OK = new Set(['404.html', 'play/verify.html', 'spill/editor.html', 'spill/bench.html'])
  const noindexPages = pages.filter((f) => !NOINDEX_OK.has(relative(OUT, f)) && /<meta name="robots" content="[^"]*noindex/.test(readFileSync(f, 'utf8')))
  if (noindexPages.length) failures.push(`prod HTML ${noindexPages.length}쪽에 메타 robots noindex(예: ${relative(OUT, noindexPages[0])}) — 프리뷰 빌드 산출물. pnpm run build:prod로 다시 빌드`)
  if (existsSync(join(OUT, '_headers'))) failures.push('out/_headers 있음 — 프리뷰 빌드 산출물(noindex)이 남아 있다. prod는 다시 빌드')
  const robotsPath = join(OUT, 'robots.txt')
  if (!existsSync(robotsPath)) failures.push('out/robots.txt 없음')
  else if (/Disallow:\s*\/\s*$/m.test(readFileSync(robotsPath, 'utf8')))
    failures.push('out/robots.txt가 전체 차단 — 프리뷰 빌드 산출물. pnpm run build:prod로 다시 빌드')
  // 기대 UI와 out/이 같은가 — 셸 class(<html class>)와 새 셸 토큰(--sl-*)
  const want = process.env.SANDLAB_UI || 'next'
  const shellClass = /<html[^>]*\sclass="[^"]+"/.test(readFileSync(join(OUT, 'index.html'), 'utf8'))
  const cssDir = join(OUT, '_next/static/css')
  const tokens = existsSync(cssDir) && readdirSync(cssDir).some((f) => readFileSync(join(cssDir, f), 'utf8').includes('--sl-'))
  if (want === 'next') {
    if (!shellClass || !tokens) failures.push(`SANDLAB_UI=next(기본)인데 out/이 새 셸이 아니다(<html class> ${shellClass}, --sl-* 토큰 ${tokens}) — @ui-shell 치환이 빠졌거나 classic 빌드. pnpm run build:prod`)
  } else if (shellClass || tokens) {
    failures.push(`SANDLAB_UI=${want}(되돌리기)인데 out/에 새 셸이 섞였다(<html class> ${shellClass}, --sl-* 토큰 ${tokens}) — .next 캐시를 지우고 SANDLAB_UI=${want} pnpm run build:prod`)
  }
}

if (failures.length) {
  console.error(`FAIL (${failures.length})\n` + failures.map((f) => '  - ' + f).join('\n'))
  process.exit(1)
}
console.log(`OK — 허용 페이지 ${allowedSeen}개, 그 외 페이지에 광고 로더 없음(퍼즐·캔버스 화면 ${canvasSeen}개 포함)`)
