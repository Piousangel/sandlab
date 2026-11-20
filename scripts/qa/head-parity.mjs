/**
 * SEO head 파리티(P12 컷오버) — 두 빌드 out/의 **모든 HTML**에서 검색에 쓰이는 head를 비교한다.
 *
 * 같아야 하는 것: <title>, meta description·robots·keywords, canonical·alternate, og:*, twitter:*, JSON-LD 전부(파싱 후 비교),
 * html lang, h1 글자(태그 제거), 그리고 robots.txt·sitemap.xml 바이트 그대로, HTML 파일 목록(경로 = URL).
 * 의도된 변경은 ALLOWED에 적는다(이유와 함께) — 그 밖의 차이는 exit 1.
 *
 * 실행: node scripts/qa/head-parity.mjs <classicOut> <nextOut> [--json out.json]
 *   (예: SANDLAB_UI=classic pnpm run build:prod && cp -r out /tmp/classic && pnpm run build:prod && node scripts/qa/head-parity.mjs /tmp/classic out)
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const [A, B] = process.argv.slice(2)
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null
if (!A || !B) {
  console.error('usage: node scripts/qa/head-parity.mjs <classicOut> <nextOut>')
  process.exit(2)
}

/** 의도된 변경: 키 → 이유. 키는 head 항목 이름(아래 extract의 키) — 모든 쪽, 또는 '<쪽> <키>' — 그 쪽만. */
const ALLOWED = {
  'link:icon': '탭 아이콘 512px 52KB → 48px 2KB(public/ui-next/icon-48.png) — LCP 0.3s(P12 LCP), 검색 결과 파비콘 권장(48의 배수) 충족',
  'index.html h1': '옛 홈은 h1이 없었다(캔버스만) → 새 홈 "Pour something. It reacts." — 문서 개요가 생김(title·description 그대로)',
  'gallery.html h1': '옛 갤러리 h1은 화면에 안 보이는 SR 전용 "Sandlab Gallery — scenes people made"(= title과 같은 글) → 보이는 h1 "The Wall"(P9 디자인). title·description·canonical 그대로',
}

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
const htmls = (d) => walk(d).filter((f) => f.endsWith('.html')).map((f) => relative(d, f)).sort()
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const strip = (s) => decode(s.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

function extract(html) {
  const head = (html.match(/<head>([\s\S]*?)<\/head>/) ?? ['', ''])[1]
  const out = {}
  const add = (k, v) => (out[k] = out[k] ? `${out[k]} | ${v}` : v)
  out.lang = (html.match(/<html[^>]*\slang="([^"]*)"/) ?? [, ''])[1]
  out.title = strip((head.match(/<title>([\s\S]*?)<\/title>/) ?? [, ''])[1])
  for (const m of head.matchAll(/<meta\s+(name|property)="([^"]+)"\s+content="([^"]*)"/g)) {
    const k = m[2]
    if (/^(description|robots|keywords|googlebot|google-adsense-account)$/.test(k) || /^(og|twitter|article):/.test(k)) add(`meta:${k}`, decode(m[3]))
  }
  for (const m of head.matchAll(/<link\s+([^>]*?)\/?>/g)) {
    const rel = (m[1].match(/rel="([^"]+)"/) ?? [, ''])[1]
    if (!/^(canonical|alternate|icon|apple-touch-icon|shortcut icon|manifest)$/.test(rel)) continue
    add(`link:${rel}`, m[1].replace(/\s+/g, ' ').trim())
  }
  const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => {
    try {
      return JSON.stringify(JSON.parse(m[1]))
    } catch {
      return 'PARSE_ERROR ' + m[1].slice(0, 60)
    }
  })
  out.jsonld = ld.sort().join('\n')
  out.h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => strip(m[1])).join(' | ')
  return out
}

const fails = []
const allowed = []
const rows = []
const la = htmls(A)
const lb = htmls(B)
const onlyA = la.filter((f) => !lb.includes(f))
const onlyB = lb.filter((f) => !la.includes(f))
if (onlyA.length || onlyB.length) fails.push(`HTML 목록 차이: classic만 ${JSON.stringify(onlyA)}, next만 ${JSON.stringify(onlyB)}`)

for (const f of la.filter((x) => lb.includes(x))) {
  const a = extract(readFileSync(join(A, f), 'utf8'))
  const b = extract(readFileSync(join(B, f), 'utf8'))
  const diffs = []
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if ((a[k] ?? '') === (b[k] ?? '')) continue
    const d = { page: f, key: k, classic: a[k] ?? null, next: b[k] ?? null }
    const why = ALLOWED[`${f} ${k}`] ?? ALLOWED[k]
    if (why) allowed.push({ ...d, why })
    else diffs.push(d)
  }
  rows.push({ page: f, keys: Object.keys(a).length, diffs: diffs.length })
  for (const d of diffs) fails.push(`${f} ${d.key}: ${JSON.stringify(d.classic)} → ${JSON.stringify(d.next)}`)
}

for (const f of ['robots.txt', 'sitemap.xml']) {
  const a = readFileSync(join(A, f), 'utf8')
  const b = readFileSync(join(B, f), 'utf8')
  if (a !== b) fails.push(`${f} 다름`)
  else console.log(`OK   ${f} 동일(${a.length}B)`)
}

console.log(`HTML ${la.length}쪽 비교: 다른 항목 ${fails.length}건, 의도된 변경 ${allowed.length}건`)
const byWhy = new Map()
for (const d of allowed) byWhy.set(d.why, [...(byWhy.get(d.why) ?? []), d])
for (const [why, ds] of byWhy) console.log(`  의도 ${ds.length}쪽: ${why}\n    예 ${ds[0].page} ${ds[0].key}: ${JSON.stringify(ds[0].classic)} → ${JSON.stringify(ds[0].next)}`)
for (const x of fails) console.log('FAIL ' + x)
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ pages: la.length, fails, allowed, rows }, null, 2))
process.exit(fails.length ? 1 : 0)
