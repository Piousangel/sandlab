#!/usr/bin/env node
/**
 * 프리뷰(Glass & Grain) 컷오버 게이트 검사 — P11에서 만들고 P12 컷오버 때 그대로 다시 쓴다.
 *
 *   pnpm build:preview && pnpm qa:preview                  # 전부(Lighthouse 포함, 맥 로컬 약 10분)
 *   pnpm qa:preview --only a11y,keys,loop,ads              # 일부만
 *   pnpm qa:preview --skip lcp --runs 1 --report /tmp/qa.json
 *   pnpm qa:preview --fps                                   # + 붓는 중 fps(CPU 4배, 관 붓기 겹침 vs reduced-motion)
 *
 * 무엇을 떨어뜨리나(그럴듯하지만 틀린 결과):
 *  weight  글 페이지에 홈 엔진·갤러리 청크가 실림(P10까지 실제로 그랬다), 페이지 CSS·JS(gzip) 표
 *  a11y    15쪽 × 390·1440: axe serious/critical, 가로 스크롤, 레이아웃 이동(CLS), 페이지 오류
 *  keys    Tab으로 훑어 포커스 링 없는 요소, 홈 로빙(탭 목록·관 줄·도크 = 정지점 1개, ←/→ 이동), 글 페이지 목차·이전/다음·힌트 details·
 *          스크롤 표 닿음, 스크린리더 이름(시험관·붓 크기·데일리 pill·데일리 시작)
 *  loop    고른 관 1개만 스트립 붓기(rack/ ≤ 20KB 파일), 첫 화면 0, reduced-motion 0
 *  ads     광고 꺼짐(ADS_ENABLED=false)이면 정적 HTML·마운트 뒤 DOM 모두 안내판 0
 *  sheet   공통 하단 시트(끌기·튕김·배경 탭·Esc·뒤로 가기·포커스·history 빈칸·스크롤 잠금) + 390 UX 감사(44px·입력 16px·확대·가로 넘침)
 *          = scripts/qa/sheet-e2e.mjs(따로도 돌릴 수 있다 — --repeat·--capture)
 *  lcp     Lighthouse 모바일(Slow 4G·CPU 4배 시뮬) 7쪽 × runs 중앙값: LCP ≤ 2.5s, CLS ≤ 0.05 + 상호작용 지연(INP 대용) ≤ 200ms
 *  contrast pnpm check:contrast(토큰 쌍)
 *
 * out/은 프리뷰 빌드여야 한다(<html class> 확인). 서버는 gzip + /api/* GET만 prod 프록시(쓰기 403) — scripts/qa/lib/server.mjs.
 * 도구는 첫 실행에 node_modules/.cache/sandlab-qa 에 설치된다(package.json 무변경) — scripts/qa/lib/deps.mjs.
 * 기계 부하가 높으면(load 30+) Lighthouse 시뮬 LCP가 CPU 시간만큼 부풀려진다 — 보고에 load average를 같이 적는다.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, resolve } from 'node:path'
import { loadavg } from 'node:os'
import { AXE_SOURCE, ROOT, launch } from './lib/deps.mjs'
import { serve } from './lib/server.mjs'
import { lighthouse } from './lib/lighthouse.mjs'

const argv = process.argv.slice(2)
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d)
const OUT = resolve(ROOT, opt('--out', 'out'))
const RUNS = Number(opt('--runs', '3'))
const ALL = ['weight', 'a11y', 'keys', 'loop', 'ads', 'sheet', 'lcp', 'contrast']
const only = opt('--only', '') ? opt('--only').split(',') : ALL
const skip = opt('--skip', '').split(',')
const want = (k) => only.includes(k) && !skip.includes(k)
const FPS = argv.includes('--fps')

export const PAGES = ['/', '/daily', '/play', '/play/1-1', '/gallery', '/learn', '/learn/margolus-falling-sand', '/materials', '/materials/acid', '/about', '/play/1-1/guide', '/privacy', '/terms', '/contact', '/missing-page']
export const LCP_PAGES = ['/', '/daily', '/play', '/gallery', '/learn/margolus-falling-sand', '/materials/acid', '/play/1-1/guide']
const CONTENT = ['/learn', '/learn/margolus-falling-sand', '/materials', '/materials/acid', '/about', '/play/1-1/guide', '/privacy', '/terms', '/contact', '/missing-page']
const LIMITS = { lcp: 2500, cls: 0.05, inp: 200, strip: 20_000 }
const VIEWS = { m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, d: { viewport: { width: 1440, height: 900 } } }

const fails = []
const report = { when: new Date().toISOString(), load: loadavg().map((x) => +x.toFixed(1)), out: OUT }
const fail = (area, msg) => {
  fails.push(`[${area}] ${msg}`)
  console.log(`  FAIL ${msg}`)
}
const head = (t) => console.log(`\n== ${t}`)

if (!existsSync(join(OUT, 'index.html')) || !/<html[^>]*\sclass="[^"]+"/.test(readFileSync(join(OUT, 'index.html'), 'utf8'))) {
  console.error(`${OUT}는 프리뷰 빌드가 아니다(<html class> 없음) — pnpm build:preview 먼저`)
  process.exit(2)
}

const srv = await serve(OUT)
const browser = await launch()
const fileOf = (p) => join(OUT, p === '/' ? 'index.html' : p === '/missing-page' ? '404.html' : `${p.slice(1)}.html`)

async function open(page, path) {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  await page.goto(srv.base + path, { waitUntil: 'networkidle', timeout: 45_000 }).catch((e) => errors.push('goto ' + e.message.slice(0, 80)))
  await page.waitForTimeout(500)
  return errors
}
const ctxWith = (view, extra = {}) =>
  browser.newContext({ ...VIEWS[view], ...extra }).then(async (c) => {
    // 첫 방문 붓기 데모는 끈다(검사 중 캔버스가 혼자 움직이지 않게) — 데모 자체는 home.test·P6 e2e 몫
    await c.addInitScript(() => {
      try {
        localStorage.setItem('sl.pourdemo.v1', '1')
      } catch {}
      window.__cls = 0
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
        }).observe({ type: 'layout-shift', buffered: true })
      } catch {}
    })
    return c
  })

/* ---------------- weight ---------------- */
if (want('weight')) {
  head('weight — 페이지별 CSS·JS(gzip), 엔진 청크')
  const rows = []
  for (const p of PAGES) {
    const html = readFileSync(fileOf(p), 'utf8')
    const pick = (re) => [...new Set(html.match(re) ?? [])].filter((f) => !f.includes('polyfills'))
    const size = (files) => files.reduce((n, f) => n + gzipSync(readFileSync(join(OUT, decodeURIComponent(f)))).length, 0)
    const css = pick(/\/_next\/static\/css\/[^"\\]+?\.css/g)
    const js = pick(/\/_next\/static\/chunks\/[^"\\]+?\.js/g)
    const engine = js.some((f) => /@compute|createComputePipeline/.test(readFileSync(join(OUT, decodeURIComponent(f)), 'utf8')))
    rows.push({ page: p, cssGz: size(css), jsGz: size(js), css: css.length, engine })
    console.log(`  ${p.padEnd(30)} css ${(size(css) / 1024).toFixed(1)}K(${css.length}) js ${(size(js) / 1024).toFixed(0)}K engine=${engine}`)
    if (p === '/' && !engine) fail('weight', '/ 에서 엔진 청크를 못 찾음 — 검사 자체가 깨졌다(양성 대조)')
    if (CONTENT.includes(p) && engine) fail('weight', `${p}: 글 페이지에 WebGPU 엔진 청크(@ui-shell 영역 치환이 빠졌나 — next.config.ts SHELL_AREAS)`)
  }
  report.weight = rows
}

/* ---------------- a11y ---------------- */
if (want('a11y')) {
  head('a11y — axe serious·가로 스크롤·CLS·페이지 오류 (390·1440)')
  report.a11y = []
  for (const view of ['m', 'd']) {
    const ctx = await ctxWith(view)
    for (const p of PAGES) {
      const page = await ctx.newPage()
      const errors = await open(page, p)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(300)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(200)
      const hs = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      await page.addScriptTag({ content: AXE_SOURCE })
      const axe = await page.evaluate(async () =>
        (await window.axe.run(document, { resultTypes: ['violations'] })).violations
          .filter((x) => x.impact === 'serious' || x.impact === 'critical')
          .map((x) => `${x.id}(${x.nodes.length}): ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`),
      )
      const cls = await page.evaluate(() => window.__cls)
      report.a11y.push({ view, page: p, axe, hs, cls: +cls.toFixed(4), errors })
      const bad = axe.length || hs > 0 || cls > LIMITS.cls || errors.length
      console.log(`  ${view === 'm' ? '390 ' : '1440'} ${p.padEnd(30)} axe ${axe.length} hscroll ${hs} cls ${cls.toFixed(3)} err ${errors.length}${bad ? '  <-' : ''}`)
      for (const a of axe) fail('a11y', `${view} ${p} axe ${a}`)
      if (hs > 0) fail('a11y', `${view} ${p} 가로 스크롤 ${hs}px`)
      if (cls > LIMITS.cls) fail('a11y', `${view} ${p} CLS ${cls.toFixed(3)} > ${LIMITS.cls}`)
      for (const e of errors) fail('a11y', `${view} ${p} 페이지 오류 ${e}`)
      await page.close()
    }
    await ctx.close()
  }
}

/* ---------------- keys ---------------- */
/** Tab을 n번 눌러 포커스가 간 요소마다: 보이는가, 포커스 링(outline 또는 box-shadow)이 있는가. 같은 요소로 돌아오면 멈춘다. */
async function tabWalk(page, max = 90) {
  // 전환 효과를 끄고 잰다 — 켜 두면 포커스 직후 계산값이 아직 '포커스 전' 모양이라 링 판정이 흔들린다
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important}' })
  await page.evaluate(() => {
    document.activeElement?.blur?.()
    window.scrollTo(0, 0)
  })
  const seen = []
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    const r = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const cs = getComputedStyle(el)
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none')
      const look = `${cs.outlineStyle}|${cs.outlineWidth}|${cs.outlineColor}|${cs.boxShadow}`
      const rect = el.getBoundingClientRect()
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 40)
      if (!el.dataset.qaId) el.dataset.qaId = String(Math.random()).slice(2)
      return { look, id: el.dataset.qaId, tag: el.tagName.toLowerCase(), cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 40), name, ring, visible: rect.width > 0 && rect.height > 0 && cs.visibility !== 'hidden' }
    })
    if (!r) continue
    if (seen.length && seen[0].id === r.id) break
    seen.push(r)
  }
  // 포커스 링 = 포커스가 있을 때와 없을 때 모양이 달라야 한다(장식 그림자만 있는 요소가 '링 있음'으로 통과하지 않게, 리뷰 반영)
  await page.evaluate(() => document.activeElement?.blur?.())
  const rest = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
    const el = document.querySelector(`[data-qa-id="${id}"]`)
    if (!el) return [id, null]
    const cs = getComputedStyle(el)
    return [id, `${cs.outlineStyle}|${cs.outlineWidth}|${cs.outlineColor}|${cs.boxShadow}`]
  })), seen.map((s) => s.id))
  for (const s of seen) if (s.ring && rest[s.id] === s.look) s.ring = false
  return seen
}

if (want('keys')) {
  head('keys — Tab 순회 포커스 링·로빙·스크린리더 이름')
  report.keys = []
  const ctx = await ctxWith('d')
  for (const p of PAGES) {
    const page = await ctx.newPage()
    await open(page, p)
    const walk = await tabWalk(page)
    const noRing = walk.filter((w) => !w.ring)
    const hidden = walk.filter((w) => !w.visible)
    report.keys.push({ page: p, stops: walk.length, noRing, hidden })
    console.log(`  ${p.padEnd(30)} Tab 정지점 ${walk.length} 링 없음 ${noRing.length} 안 보임 ${hidden.length}`)
    for (const w of noRing) fail('keys', `${p} 포커스 링 없음: <${w.tag} class="${w.cls}"> "${w.name}"`)
    for (const w of hidden) fail('keys', `${p} 안 보이는 요소에 포커스: <${w.tag} class="${w.cls}"> "${w.name}"`)

    if (p === '/') {
      // 로빙: 관 줄·탭 목록·도크는 각각 정지점 1개
      const counts = await page.evaluate(() => ({
        tubes: document.querySelectorAll('.sl-rack-row [tabindex="0"]').length,
        tabs: document.querySelectorAll('.sl-rack-tabs [tabindex="0"]').length,
        dock: document.querySelectorAll('.sl-dock [tabindex="0"]').length,
      }))
      for (const [k, n] of Object.entries(counts)) if (n !== 1) fail('keys', `/ ${k} Tab 정지점 ${n}개(1이어야 함)`)
      const tubeStops = walk.filter((w) => w.cls.includes('sl-tube-btn')).length
      if (tubeStops !== 1) fail('keys', `/ Tab 순회에서 시험관 정지 ${tubeStops}번(1이어야 함)`)
      // 관 줄 화살표: 포커스만 이동, 선택은 그대로
      await page.locator('.sl-rack-row [tabindex="0"]').focus()
      const before = await page.evaluate(() => document.querySelector('.sl-tube-btn[aria-pressed="true"] .sl-tube-name')?.textContent)
      await page.keyboard.press('ArrowRight')
      const after = await page.evaluate(() => ({ focus: document.activeElement?.querySelector('.sl-tube-name')?.textContent, sel: document.querySelector('.sl-tube-btn[aria-pressed="true"] .sl-tube-name')?.textContent }))
      if (after.focus === before || after.sel !== before) fail('keys', `/ 관 줄 →: 포커스 ${before}→${after.focus}, 선택 ${after.sel}`)
      await page.keyboard.press('Enter')
      const picked = await page.evaluate(() => document.querySelector('.sl-tube-btn[aria-pressed="true"] .sl-tube-name')?.textContent)
      if (picked !== after.focus) fail('keys', `/ 관 줄 Enter로 선택 안 됨(${picked})`)
      // 줄 안에서 Home으로 옮긴 뒤 Tab = 줄을 떠난다(선택된 관에 한 번 더 멈추지 않는다)
      await page.locator('.sl-rack-row [tabindex="0"]').focus()
      await page.keyboard.press('End')
      await page.keyboard.press('Home')
      await page.keyboard.press('Tab')
      if (await page.evaluate(() => !!document.activeElement?.closest('.sl-rack-row'))) fail('keys', '/ 관 줄에서 Tab이 줄을 못 떠남(로빙이 포커스를 안 따라감)')
      await page.locator('.sl-dock [tabindex="0"]').focus()
      await page.keyboard.press('End')
      const endName = await page.evaluate(() => document.activeElement?.textContent?.trim())
      if (endName !== 'Share') fail('keys', `/ 도크 End → ${endName}(Share여야 함)`)
      // 이름: 시험관 18개 이름+눌림 상태, 붓 크기 3개
      const names = await page.evaluate(() => ({
        tubes: [...document.querySelectorAll('.sl-tube-btn')].map((b) => [b.textContent.trim(), b.getAttribute('aria-pressed')]),
        sizes: [...document.querySelectorAll('.sl-size')].map((b) => [b.getAttribute('aria-label'), b.getAttribute('aria-pressed')]),
        canvas: document.querySelector('canvas.sl-well-canvas')?.getAttribute('aria-label') ?? null,
      }))
      if (names.tubes.length !== 18 || names.tubes.some(([n, pr]) => !n || pr === null)) fail('keys', `/ 시험관 이름·눌림 상태 ${JSON.stringify(names.tubes.slice(0, 3))}…`)
      if (names.sizes.length !== 3 || names.sizes.some(([n, pr]) => !/brush/i.test(n ?? '') || pr === null)) fail('keys', `/ 붓 크기 이름 ${JSON.stringify(names.sizes)}`)
      report.keys.at(-1).names = names
    }
    if (p === '/' || p === '/daily') {
      // 헤더 데일리 pill(홈·글 페이지 셸 헤더) — 보이는 글자 'Daily · hh:mm', 이름에 퍼즐 번호
      const pill = await page.locator('.sl-pill-hit').first().getAttribute('aria-label', { timeout: 3000 }).catch(() => null)
      if (p === '/' && (!/Daily/.test(pill ?? '') || !/puzzle No\.\d+/.test(pill ?? ''))) fail('keys', `/ 데일리 pill 이름 "${pill}"`)
      if (p === '/') report.keys.at(-1).pill = pill
    }
    if (p === '/daily') {
      const start = await page.evaluate(() => {
        const ds = document.querySelector('.sl-ds')
        return ds ? { h1: ds.querySelector('h1')?.textContent?.trim(), cta: [...ds.querySelectorAll('button,a')].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 4) } : null
      })
      if (!start?.h1) fail('keys', `/daily 시작 화면 제목 없음 ${JSON.stringify(start)}`)
      report.keys.at(-1).names = { start }
    }
    if (p === '/learn/margolus-falling-sand' || p === '/materials/acid' || p === '/play/1-1/guide') {
      const want = await page.evaluate(() => ({
        toc: document.querySelectorAll('.sl-cs-toc a').length,
        pn: document.querySelectorAll('.sl-cs-pn a').length,
        details: document.querySelectorAll('main details > summary').length,
        scroll: [...document.querySelectorAll('main pre, main .sl-mat-table, main [class*="scroll"], main table')]
          .map((e) => (e.closest('[tabindex]') ?? e))
          .filter((e) => e.scrollWidth > e.clientWidth + 1).length,
      }))
      const reached = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.dataset.qaId).length, sel)
      const got = { toc: await reached('.sl-cs-toc a'), pn: await reached('.sl-cs-pn a'), details: await reached('main details > summary') }
      for (const k of ['toc', 'pn', 'details']) if (got[k] < want[k]) fail('keys', `${p} ${k} ${want[k]}개 중 Tab으로 ${got[k]}개만 닿음`)
      const scrollOk = await page.evaluate(() =>
        [...document.querySelectorAll('main *')].filter((e) => e.scrollWidth > e.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowX)).every((e) => e.tabIndex >= 0 || e.querySelector('a,button,[tabindex]')),
      )
      if (!scrollOk) fail('keys', `${p} 가로 스크롤 영역에 키보드로 못 닿음`)
      if (want.details) {
        const s = page.locator('main details > summary').first()
        await s.focus()
        await page.keyboard.press('Enter')
        if (!(await s.evaluate((e) => e.parentElement.open))) fail('keys', `${p} 힌트 details가 Enter로 안 열림`)
      }
      report.keys.at(-1).content = { want, got }
    }
    await page.close()
  }
  await ctx.close()
}

/* ---------------- loop ---------------- */
// 선택 관 붓기(P11a 설계: 고른 관 하나만 스트립 한 번 재생, reduced-motion 없음 — 코어 수 게이트는 iPhone이 늘 4라 버림)
if (want('loop')) {
  head('loop — 고른 관 1개만 스트립 붓기, reduced-motion 0, 랙 스트립 ≤ 20KB')
  const rackDir = join(OUT, 'ui-next/posters/rack')
  const strips = readdirSync(rackDir).filter((f) => f.endsWith('.webp'))
  if (strips.length !== 12) fail('loop', `랙 스트립 ${strips.length}개(12여야 함)`)
  for (const f of strips) if (statSync(join(rackDir, f)).size > LIMITS.strip) fail('loop', `${f} ${statSync(join(rackDir, f)).size}B > 20KB`)
  const probe = async (label, extra) => {
    const ctx = await ctxWith('m', extra)
    const page = await ctx.newPage()
    await open(page, '/')
    const before = await page.evaluate(() => document.querySelectorAll('.sl-tube-pour').length)
    // 스트립을 미리 받아 둔 뒤(hover·focus 미리 받기와 같은 경로) 누른다 — 300ms 안 디코드 못 하면 건너뛰는 규칙이 있어서
    await page.evaluate(() => fetch('/ui-next/posters/rack/water.webp').then((r) => r.blob()))
    await page.locator('.sl-tube-btn', { hasText: 'water' }).first().hover()
    await page.waitForTimeout(300)
    await page.locator('.sl-tube-btn', { hasText: 'water' }).first().click()
    await page.waitForTimeout(120)
    const r = await page.evaluate(() => {
      const p = [...document.querySelectorAll('.sl-tube-pour')]
      return { n: p.length, slug: p[0]?.dataset.slPour ?? null, anim: p[0] ? getComputedStyle(p[0]).animationName : null, src: p[0]?.style.backgroundImage ?? '' }
    })
    await ctx.close()
    console.log(`  ${label.padEnd(16)} 첫 화면 붓기 ${before}개, water 누른 직후 ${r.n}개(${r.slug}, ${r.anim}) ${r.src}`)
    return { before, ...r }
  }
  const on = await probe('기본', {})
  const reduced = await probe('reduced-motion', { reducedMotion: 'reduce' })
  if (on.before !== 0) fail('loop', `첫 화면에 붓기 ${on.before}개(0이어야 함 — 누를 때만)`)
  if (on.n !== 1 || on.slug !== 'water' || on.anim !== 'sl-tube-pour' || !on.src.includes('/posters/rack/')) fail('loop', `기본: ${JSON.stringify(on)}`)
  if (reduced.n !== 0 && reduced.anim !== 'none') fail('loop', `reduced-motion인데 붓기 ${JSON.stringify(reduced)}`)
  report.loop = { on, reduced, strips: strips.map((f) => [f, statSync(join(rackDir, f)).size]) }
}

/* ---------------- ads ---------------- */
if (want('ads')) {
  head('ads — 광고 꺼짐이면 안내판 DOM 0')
  const enabled = /export const ADS_ENABLED = true/.test(readFileSync(join(ROOT, 'src/ui-next/ads/config.ts'), 'utf8'))
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
  const withPlate = walk(OUT).filter((f) => f.endsWith('.html') && readFileSync(f, 'utf8').includes('data-sl-ad='))
  const ctx = await ctxWith('m')
  const live = []
  for (const p of ['/play', '/learn/margolus-falling-sand', '/materials/acid', '/about', '/play/1-1/guide']) {
    const page = await ctx.newPage()
    await open(page, p)
    // 우리 안내판(.sl-ad·data-sl-ad)과 보이는 광고 ins만 센다 — 로더가 스스로 넣는 숨은 ins(adsbygoogle-noablate, display:none)는 제외
    live.push([p, await page.evaluate(() => document.querySelectorAll('.sl-ad, [data-sl-ad], ins.adsbygoogle:not(.adsbygoogle-noablate)').length)])
    await page.close()
  }
  await ctx.close()
  console.log(`  ADS_ENABLED=${enabled}  정적 HTML 안내판 ${withPlate.length}쪽  마운트 뒤 ${JSON.stringify(live)}`)
  if (!enabled) {
    if (withPlate.length) fail('ads', `광고 꺼짐인데 정적 HTML ${withPlate.length}쪽에 안내판: ${withPlate.slice(0, 3).join(', ')}`)
    for (const [p, n] of live) if (n) fail('ads', `광고 꺼짐인데 ${p} 마운트 뒤 안내판·ins ${n}개`)
  }
  report.ads = { enabled, staticPages: withPlate.length, live }
}

/* ---------------- lcp + INP ---------------- */
/** 상호작용 지연(INP 대용, 실험실): CPU 4배에서 대표 상호작용마다 Event Timing 최대 duration. */
async function interactionDelay(path, act) {
  const ctx = await ctxWith('m')
  const page = await ctx.newPage()
  await open(page, path)
  await page.evaluate(() => {
    window.__ev = 0
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (e.interactionId) window.__ev = Math.max(window.__ev, e.duration)
    }).observe({ type: 'event', durationThreshold: 16, buffered: true })
  })
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await act(page)
  await page.waitForTimeout(500)
  const v = await page.evaluate(() => window.__ev)
  await ctx.close()
  return Math.round(v)
}
const INTERACTIONS = {
  '/': async (p) => {
    await p.locator('.sl-rack-tab', { hasText: 'Liquid' }).tap()
    await p.locator('.sl-tube-btn').first().tap()
    await p.locator('.sl-size').nth(2).tap()
  },
  '/daily': async (p) => {
    await p.locator('.sl-ds button').first().tap()
  },
  '/play': async (p) => {
    await p.locator('button[aria-label="Menu"]').first().tap()
    await p.keyboard.press('Escape')
  },
  '/gallery': async (p) => {
    await p.locator('.sl-gw-sort').nth(1).tap()
  },
  '/learn/margolus-falling-sand': async (p) => {
    await p.locator('button[aria-label="Menu"]').first().tap()
    await p.keyboard.press('Escape')
  },
  '/materials/acid': async (p) => {
    await p.locator('button[aria-label="Menu"]').first().tap()
    await p.keyboard.press('Escape')
  },
  '/play/1-1/guide': async (p) => {
    const s = p.locator('main details > summary').first()
    if (await s.count()) await s.tap()
    else await p.locator('button[aria-label="Menu"]').first().tap()
  },
}

if (want('lcp')) {
  head(`lcp — Lighthouse 모바일 ${LCP_PAGES.length}쪽 × ${RUNS}회 중앙값 + 상호작용 지연(CPU 4배)  load ${report.load.join(' ')}`)
  const rows = await lighthouse(srv.base, LCP_PAGES, { runs: RUNS, dir: join(ROOT, 'node_modules/.cache/sandlab-qa/lh'), tag: 'qa' })
  for (const r of rows) {
    // 한 번 재면 기계 부하에 크게 흔들린다(같은 메뉴 열기 64~136ms @1x) — runs번 재서 중앙값
    const inps = []
    for (let i = 0; i < RUNS; i++)
      inps.push(
        await interactionDelay(r.page, INTERACTIONS[r.page]).catch((e) => {
          fail('lcp', `${r.page} 상호작용 실행 실패: ${e.message.slice(0, 100)}`)
          return -1
        }),
      )
    r.inpRuns = inps
    r.inp = [...inps].sort((a, b) => a - b)[Math.floor(inps.length / 2)]
    console.log(`  ${r.page.padEnd(30)} LCP ${r.lcp}ms ${JSON.stringify(r.runs)} FCP ${r.fcp} CLS ${r.cls} TBT ${r.tbt} INP~ ${r.inp}ms ${JSON.stringify(r.inpRuns)}  el ${r.el}`)
    if (r.lcp > LIMITS.lcp) fail('lcp', `${r.page} LCP ${r.lcp}ms > ${LIMITS.lcp} (렌더 차단: ${r.blocking.join(', ') || '없음'})`)
    if (r.clsMax > LIMITS.cls) fail('lcp', `${r.page} CLS ${r.clsMax} > ${LIMITS.cls}`)
    if (r.inp > LIMITS.inp) fail('lcp', `${r.page} 상호작용 지연 ${r.inp}ms > ${LIMITS.inp}`)
  }
  report.lcp = rows
}

/* ---------------- fps (선택) ---------------- */
if (FPS) {
  head('fps — 붓는 중(CPU 4배, 390) 관 붓기 직후 vs reduced-motion(붓기 없음), 3회 중앙값')
  const pour = async (motion) => {
    const ctx = await ctxWith('m', motion ? {} : { reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await open(page, '/')
    await page.waitForFunction(() => !document.body.innerText.includes('Starting the sandbox'), null, { timeout: 30_000 }).catch(() => {})
    await page.waitForTimeout(1000)
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    // 관을 바꿔 스트립 붓기를 틀고(720ms) 바로 붓기 시작 — 둘이 겹치는 구간의 프레임을 잰다
    await page.locator('.sl-tube-btn', { hasText: 'water' }).first().click()
    await page.evaluate(() => {
      window.__f = []
      const f = (t) => {
        window.__f.push(t)
        requestAnimationFrame(f)
      }
      requestAnimationFrame(f)
    })
    const c = await page.locator('canvas.sl-well-canvas').boundingBox()
    await page.mouse.move(c.x + c.width * 0.2, c.y + c.height * 0.2)
    await page.mouse.down()
    const t0 = Date.now()
    for (let i = 0; Date.now() - t0 < 6000; i++) {
      await page.mouse.move(c.x + c.width * (0.2 + 0.6 * ((i % 60) / 60)), c.y + c.height * 0.2)
      await page.waitForTimeout(30)
    }
    await page.mouse.up()
    const r = await page.evaluate(() => {
      const f = window.__f
      const d = f.slice(1).map((t, k) => t - f[k]).sort((a, b) => a - b)
      return { fps: +((f.length - 1) / ((f.at(-1) - f[0]) / 1000)).toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), long: d.filter((x) => x > 50).length, pours: document.querySelectorAll('.sl-tube-pour').length }
    })
    await ctx.close()
    return r
  }
  const med = (a, k) => a.map((x) => x[k]).sort((p, q) => p - q)[Math.floor(a.length / 2)]
  const res = { on: [], off: [] }
  for (let i = 0; i < 3; i++) {
    res.on.push(await pour(true))
    res.off.push(await pour(false))
  }
  for (const k of ['on', 'off']) console.log(`  ${k === 'on' ? '붓기 켬' : 'reduced'}: fps ${med(res[k], 'fps')} p95 ${med(res[k], 'p95')}ms 50ms+ ${med(res[k], 'long')} ${JSON.stringify(res[k].map((x) => x.fps))}`)
  report.fps = res
}

await browser.close()
srv.close()

/* ---------------- sheet ---------------- */
if (want('sheet')) {
  head('sheet — 공통 하단 시트 e2e + 390 UX 감사(scripts/qa/sheet-e2e.mjs)')
  try {
    execFileSync(process.execPath, [join(ROOT, 'scripts/qa/sheet-e2e.mjs'), '--out', OUT], { stdio: 'inherit' })
    report.sheet = 'ok'
  } catch {
    report.sheet = 'fail'
    fail('sheet', 'sheet-e2e 실패(위 출력)')
  }
}

/* ---------------- contrast ---------------- */
if (want('contrast')) {
  head('contrast — pnpm check:contrast')
  try {
    const out = execFileSync('node', [join(ROOT, 'scripts/check-contrast.mjs')], { encoding: 'utf8' })
    console.log('  ' + out.trim().split('\n').at(-1))
  } catch (e) {
    fail('contrast', (e.stdout || e.message).trim().split('\n').slice(-3).join(' / '))
  }
}

report.fails = fails
const rp = opt('--report', '')
if (rp) writeFileSync(rp, JSON.stringify(report, null, 1))
console.log(`\n${fails.length ? `FAIL ${fails.length}` : 'PASS'} — qa:preview (${only.filter(want).join(',')}${FPS ? ',fps' : ''})${rp ? ` 보고 ${rp}` : ''}`)
if (fails.length) {
  for (const f of fails) console.log('  - ' + f)
  process.exit(1)
}
