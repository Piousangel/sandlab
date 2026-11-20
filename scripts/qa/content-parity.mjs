/**
 * 글 페이지 파리티 검사(리디자인 P10) — prod 빌드 out/ 과 프리뷰 빌드 out/ 을 비교한다.
 *
 * 대상: ContentShell을 쓰는 글 페이지 전부(Learn 허브·글, 재료 목록·재료, 레벨 공략, About·Privacy·Terms·Contact, 404).
 * 같아야 하는 것: <title>, h1 글자, JSON-LD 전부, <main> 본문 단어 **순서 그대로**·링크 href 목록, 광고 로더 유무.
 * 한계: chrome 걷어내기는 정규식이라 같은 태그 중첩(nav 안 nav, chrome span 안 span)이 생기면 깨진다.
 * 프리뷰가 더한 탐색 글자(목차·이전/다음 — `data-sl-chrome` 요소)는 빼고 센다(따로 표시한다).
 *
 * 실행: node scripts/qa/content-parity.mjs <prodOut> <previewOut> [--json out.json]
 *   (예: pnpm build && cp -r out /tmp/prod && pnpm build:preview && node scripts/qa/content-parity.mjs /tmp/prod out)
 * 하나라도 다르면 exit 1.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const [A, B] = process.argv.slice(2)
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null
if (!A || !B) {
  console.error('usage: node scripts/qa/content-parity.mjs <prodOut> <previewOut>')
  process.exit(2)
}

const PAGES = [/^learn\.html$/, /^learn\/[a-z0-9-]+\.html$/, /^materials\.html$/, /^materials\/[a-z]+\.html$/, /^play\/[^/]+\/guide\.html$/, /^(about|privacy|terms|contact|404)\.html$/]

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
const text = (h) =>
  h
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const words = (h) => text(h).split(' ').filter((w) => /[A-Za-z0-9]/.test(w))
const dechrome = (h) =>
  h
    .replace(/<nav[^>]*data-sl-chrome="[^"]*"[^>]*>[\s\S]*?<\/nav>/g, ' ')
    .replace(/<aside[^>]*data-sl-chrome="[^"]*"[^>]*>[\s\S]*?<\/aside>/g, ' ')
    .replace(/<(span|p)[^>]*data-sl-chrome="[^"]*"[^>]*>[\s\S]*?<\/\1>/g, ' ')
const main = (h) => (h.match(/<main[\s\S]*?<\/main>/) ?? [''])[0]
const links = (h) => (h.match(/<a\s/g) ?? []).length
const hrefs = (h) => [...h.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1]).sort().join(' ')
const h1 = (h) => text((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ?? ['', ''])[1])
const title = (h) => (h.match(/<title>([\s\S]*?)<\/title>/) ?? ['', ''])[1]
const ld = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])
const loader = (h) => h.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')

const rows = []
let bad = 0
for (const f of walk(A)
  .map((p) => relative(A, p))
  .filter((r) => PAGES.some((re) => re.test(r)))
  .sort()) {
  const pb = join(B, f)
  if (!existsSync(pb)) {
    rows.push({ page: f, missing: true })
    bad++
    continue
  }
  const ha = readFileSync(join(A, f), 'utf8')
  const hb = readFileSync(pb, 'utf8')
  const ma = main(ha)
  const mb = main(hb)
  const mbc = dechrome(mb)
  const r = {
    page: f,
    words: [words(ma).length, words(mbc).length],
    links: [links(ma), links(mbc)],
    chrome: { words: words(mb).length - words(mbc).length, links: links(mb) - links(mbc) },
    h1: h1(ha) === h1(hb),
    title: title(ha) === title(hb),
    jsonld: JSON.stringify(ld(ha)) === JSON.stringify(ld(hb)),
    ldCount: ld(ha).length,
    loader: loader(ha) === loader(hb),
    sameWords: words(ma).join(' ') === words(mbc).join(' '),
    sameHrefs: hrefs(ma) === hrefs(mbc),
  }
  r.ok = r.sameWords && r.sameHrefs && r.links[0] === r.links[1] && r.h1 && r.title && r.jsonld && r.loader
  if (!r.ok) bad++
  rows.push(r)
}

for (const r of rows) {
  if (r.missing) {
    console.log(`MISSING ${r.page}`)
    continue
  }
  console.log(
    `${r.ok ? 'OK  ' : 'DIFF'} ${r.page.padEnd(44)} words ${String(r.words[0]).padStart(4)}→${String(r.words[1]).padEnd(4)} links ${String(r.links[0]).padStart(3)}→${String(r.links[1]).padEnd(3)} ` +
      `(+chrome ${r.chrome.words}w/${r.chrome.links}l) seq=${r.sameWords ? 'same' : 'DIFF'} hrefs=${r.sameHrefs ? 'same' : 'DIFF'} h1=${r.h1} title=${r.title} jsonld(${r.ldCount})=${r.jsonld} loader=${r.loader}`,
  )
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows, null, 1))
console.log(`${rows.length} pages, ${bad} different`)
process.exit(bad ? 1 : 0)
