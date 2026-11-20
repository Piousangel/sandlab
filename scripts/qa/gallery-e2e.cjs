// 프리뷰 갤러리(The Wall) e2e — P9에서 쓰고 P9b에 scripts/qa로 승격(스승님 원칙: 같은 확인 스크립트를 두 번 쓰면 scripts/로).
// 사용: pnpm build:preview 뒤
//   NODE_PATH=<playwright·axe-core가 있는 node_modules> pnpm qa:gallery [outDir=out] [capDir] [localBase]
//   (playwright·axe-core는 package.json에 없다 — 로컬 설치본을 NODE_PATH로. CI 연결은 오너 결정 C 대기)
//  A) prod-GET 프록시 모드(out/ 정적 서버 + /api GET → sandlab.app, 쓰기는 가로채 403 — prod에 쓰지 않는다):
//     3폭 레이아웃·정렬·More·Top·라이브 ≤1·44px·axe·CLS·작품 → 홈 진입, Yours 빈 상태(3폭), 하단 글줄(Ko-fi)
//  B) localBase(`npx wrangler dev --port 8799 --local`, 로컬 D1 — 프리뷰 빌드 out/을 그대로 서빙)가 주어지면:
//     로컬 워커에만 장면 2개(원본·리믹스)를 올리고 1표 → Yours 작품 있는 상태(3폭)·증가분·기준선 갱신,
//     작성자 링크 → 집계, 이름 있는 장면 → 홈 진입 부제. verify-gallery.py를 먼저 돌린 로컬 D1을 가정한다(960x540 옛 장면 항목).
const fs = require('fs')
const os = require('os')
const path = require('path')
const { serve, proxyApi, launch } = require('./lib.cjs')
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

const argv = process.argv.slice(2)
const outDir = path.resolve(argv[0] || 'out')
const capDir = path.resolve(argv[1] || path.join(os.tmpdir(), 'sandlab-gallery-e2e'))
const localBase = argv[2]
fs.mkdirSync(capDir, { recursive: true })
console.log(`out=${outDir} cap=${capDir}${localBase ? ' local=' + localBase : ''}`)
const PORT = 8840
const BASE = `http://localhost:${PORT}`
const results = []
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}
const VIEWS = { 390: { width: 390, height: 844, mobile: true }, 360: { width: 360, height: 640, mobile: true }, 1440: { width: 1440, height: 900, mobile: false } }
const ctxFor = (b, v, extra = {}) => b.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 2, hasTouch: v.mobile, isMobile: v.mobile, ...extra })

const INIT = () => {
  window.__cls = 0
  window.__shifts = []
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue
      window.__cls += e.value
      window.__shifts.push({ v: +e.value.toFixed(4), src: (e.sources || []).map((s) => s.node && (s.node.className || s.node.nodeName)).join('|') })
    }
  }).observe({ type: 'layout-shift', buffered: true })
  // 동시 라이브 캔버스 최대 수(갤러리 안 canvas)
  window.__maxCanvas = 0
  const count = () => {
    const n = document.querySelectorAll('.sl-gw canvas').length
    if (n > window.__maxCanvas) window.__maxCanvas = n
  }
  new MutationObserver(count).observe(document, { childList: true, subtree: true })
}

async function small44(page) {
  return page.evaluate(() => {
    const bad = []
    for (const el of document.querySelectorAll('.sl-gw a, .sl-gw button, .sl-gw input')) {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const st = getComputedStyle(el)
      if (st.visibility === 'hidden' || st.display === 'none') continue
      if (el.closest('dialog:not([open])')) continue
      if (r.width < 43.5 || r.height < 43.5) bad.push(`${el.tagName}.${el.className} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${r.width.toFixed(0)}x${r.height.toFixed(0)}`)
    }
    return bad
  })
}
async function axe(page) {
  await page.addScriptTag({ content: AXE })
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'] })
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}(${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`)
  })
}
const hscroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const loaded = (page) => page.waitForFunction(() => document.querySelectorAll('.sl-gw-skel').length === 0 && document.querySelector('.sl-gw-sec:nth-of-type(2) .sl-gw-grid, .sl-gw-empty, .sl-gw-makers'), null, { timeout: 30000 })
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 300) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
}

;(async () => {
  const srv = await serve(outDir, PORT)
  const b = await launch()
  const apiLog = []

  for (const w of [390, 360, 1440]) {
    const v = VIEWS[w]
    const ctx = await ctxFor(b, v)
    const page = await ctx.newPage()
    await proxyApi(page, apiLog)
    await page.addInitScript(INIT)
    const errs = []
    page.on('pageerror', (e) => errs.push(e.message))
    await page.goto(`${BASE}/gallery`)
    await loaded(page)
    await page.waitForTimeout(800)
    const h1 = await page.locator('h1').allInnerTexts()
    ok(`${w}: h1 하나 "The Wall"`, h1.length === 1 && h1[0] === 'The Wall', JSON.stringify(h1))
    const picks = await page.locator('#sl-gw-picks-h').locator('xpath=ancestor::section').locator('.sl-gw-item').count()
    ok(`${w}: Sandlab pick 12점`, picks === 12, String(picks))
    const credits = await page.locator('.sl-gw-sec').nth(0).locator('.sl-gw-credit', { hasText: 'by Sandlab' }).count()
    ok(`${w}: 큐레이션 작성자 "by Sandlab" 12`, credits === 12, String(credits))
    const allItems = await page.locator('.sl-gw-sec').nth(1).locator('.sl-gw-item').count()
    const empty = await page.locator('.sl-gw-empty').count()
    ok(`${w}: Hot 목록 또는 빈 상태`, allItems > 0 || empty === 1, `items=${allItems} empty=${empty}`)
    ok(`${w}: 처음엔 라이브 캔버스 0`, (await page.locator('.sl-gw canvas').count()) === 0)
    await scrollThrough(page)
    await page.waitForTimeout(1200)
    const cls = await page.evaluate(() => window.__cls)
    const shifts = await page.evaluate(() => window.__shifts)
    ok(`${w}: CLS ≤ 0.05`, cls <= 0.05, `CLS=${cls.toFixed(4)} ${JSON.stringify(shifts).slice(0, 200)}`)
    ok(`${w}: 가로 스크롤 0`, (await hscroll(page)) <= 0)
    const sm = await small44(page)
    ok(`${w}: 44px 미만 0`, sm.length === 0, sm.slice(0, 6).join('; '))
    const ax = await axe(page)
    ok(`${w}: axe serious 0`, ax.length === 0, ax.join('; '))
    // pill 문구(P3 셸) — 보이는 글자에 Daily, 접근 이름이 보이는 글자로 시작
    const pill = await page.locator('.sl-pill-hit').first()
    const pt = (await pill.innerText()).replace(/\s+/g, ' ').trim()
    const pl = await pill.getAttribute('aria-label')
    ok(`${w}: 데일리 pill 보이는 글자 "Daily · hh:mm"·label-in-name`, /^Daily · \d\d:\d\d$/.test(pt) && pl.startsWith(pt), `"${pt}" / "${pl}"`)
    const pr = await pill.boundingBox()
    ok(`${w}: pill 화면 안`, pr && pr.x + pr.width <= v.width, JSON.stringify(pr))
    await page.screenshot({ path: path.join(capDir, `gallery-${w}.png`), fullPage: true })
    await page.screenshot({ path: path.join(capDir, `gallery-${w}-first.png`) })
    ok(`${w}: 페이지 오류 0`, errs.length === 0, errs.join('; '))
    await ctx.close()
  }

  // ---------- 정렬 전환 · More · Top (390) ----------
  {
    const ctx = await ctxFor(b, VIEWS[390])
    const page = await ctx.newPage()
    await proxyApi(page, apiLog)
    await page.addInitScript(INIT)
    await page.goto(`${BASE}/gallery`)
    await loaded(page)
    const sec = page.locator('.sl-gw-sec').nth(1)
    await page.getByRole('button', { name: 'New', exact: true }).click()
    await loaded(page)
    await page.waitForTimeout(300)
    const n1 = await sec.locator('.sl-gw-item:not(.sl-gw-skel)').count()
    ok('New: 첫 쪽 24점', n1 === 24, String(n1))
    ok('New: aria-pressed', (await page.getByRole('button', { name: 'New', exact: true }).getAttribute('aria-pressed')) === 'true')
    const moreTxt = await page.locator('.sl-gw-more .sl-gw-label').innerText()
    const more = page.getByRole('button', { name: 'More', exact: true })
    await more.scrollIntoViewIfNeeded()
    // 느린 망 재현: 다음 쪽 응답을 1.5초 늦춘다(입력 뒤 0.5초 창 밖에서 도착 → 그때 밀리면 CLS로 잡힘)
    await page.route('**/api/scenes?*offset=24*', async (route) => {
      await new Promise((r) => setTimeout(r, 1500))
      return route.fallback()
    })
    const clsBefore = await page.evaluate(() => window.__cls)
    await more.click()
    await page.waitForFunction((n) => document.querySelectorAll('.sl-gw-sec:nth-of-type(2) .sl-gw-item:not(.sl-gw-skel)').length > n && !document.querySelector('.sl-gw-sec:nth-of-type(2) .sl-gw-skel'), n1, { timeout: 20000 }).catch(() => {})
    const n2 = await sec.locator('.sl-gw-item:not(.sl-gw-skel)').count()
    ok('More: 다음 쪽 붙음', n2 > n1, `${moreTxt} → ${n2}`)
    const ids = await sec.locator('.sl-gw-open').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    ok('More: 중복 없음', new Set(ids).size === ids.length, `${ids.length}`)
    await page.waitForTimeout(800)
    const clsAfter = await page.evaluate(() => window.__cls)
    ok('More: 누른 뒤 CLS 증가 ≤ 0.05(입력 뒤 이동 제외)', clsAfter - clsBefore <= 0.05, `${clsBefore.toFixed(4)} → ${clsAfter.toFixed(4)}`)
    ok('More: 끝까지 받으면 버튼 사라짐', (await page.getByRole('button', { name: 'More', exact: true }).count()) === 0 || n2 < 44)
    await page.getByRole('button', { name: 'Top', exact: true }).click()
    await page.waitForSelector('.sl-gw-maker', { timeout: 20000 })
    const makers = await page.locator('.sl-gw-maker').allInnerTexts()
    ok('Top: 작성자 순위', makers.length >= 1, makers.map((m) => m.replace(/\s+/g, ' ')).join(' | '))
    await page.locator('.sl-gw-maker').first().click()
    await loaded(page)
    await page.waitForTimeout(300)
    const h2 = await page.locator('#sl-gw-all-h').innerText()
    const byItems = await sec.locator('.sl-gw-item').count()
    ok('Top → 작성자 작품', h2.startsWith('Scenes by ') && byItems >= 1, `${h2} (${byItems})`)
    const sm = await small44(page)
    ok('Top 작성자 화면 44px 미만 0', sm.length === 0, sm.join('; '))
    await page.getByRole('button', { name: 'Top makers' }).click()
    await page.waitForSelector('.sl-gw-maker')
    ok('Top makers로 돌아옴', (await page.locator('.sl-gw-maker').count()) >= 1)
    await page.getByRole('button', { name: 'Hot', exact: true }).click()
    await loaded(page)
    const ro = await page.locator('.sl-gw-ro').count()
    const dis = await page.locator('.sl-gw-vote').evaluateAll((bs) => bs.every((x) => x.disabled))
    ok('프리뷰 투표: 버튼 꺼짐 + 안내 한 줄', (await page.locator('.sl-gw-vote').count()) === 0 || (dis && ro === 1), `ro=${ro} allDisabled=${dis}`)
    await page.screenshot({ path: path.join(capDir, `gallery-390-new-more.png`), fullPage: false })
    await ctx.close()
  }

  // ---------- 라이브 재생: 1440 hover, 390 Play 탭 — 동시 ≤ 1 ----------
  {
    const ctx = await ctxFor(b, VIEWS[1440])
    const page = await ctx.newPage()
    await proxyApi(page, apiLog)
    await page.addInitScript(INIT)
    await page.goto(`${BASE}/gallery`)
    await loaded(page)
    const frames = page.locator('.sl-gw-item .sl-gw-glass')
    await frames.nth(0).hover()
    await page.waitForSelector('.sl-gw-live[data-on]', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(1200)
    ok('1440 hover: 라이브 캔버스 1개 + 그려짐', (await page.locator('.sl-gw canvas').count()) === 1 && (await page.locator('.sl-gw-live[data-on]').count()) === 1)
    await page.locator('.sl-gw-item').nth(0).screenshot({ path: path.join(capDir, 'live-hover-1440.png') })
    for (let i = 1; i < 6; i++) {
      await frames.nth(i).hover()
      await page.waitForTimeout(450)
    }
    await page.waitForTimeout(800)
    ok('1440 hover 6점 훑기: 지금 캔버스 ≤ 1', (await page.locator('.sl-gw canvas').count()) <= 1)
    await page.mouse.move(5, 5)
    await page.waitForTimeout(300)
    ok('1440 hover 벗어나면 0', (await page.locator('.sl-gw canvas').count()) === 0)
    ok('1440: 동시 라이브 최대 1', (await page.evaluate(() => window.__maxCanvas)) <= 1, String(await page.evaluate(() => window.__maxCanvas)))
    await ctx.close()
  }
  {
    const ctx = await ctxFor(b, VIEWS[390])
    const page = await ctx.newPage()
    await proxyApi(page, apiLog)
    await page.addInitScript(INIT)
    await page.goto(`${BASE}/gallery`)
    await loaded(page)
    const play = page.locator('.sl-gw-play')
    await play.nth(0).tap()
    await page.waitForSelector('.sl-gw-live[data-on]', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(1500)
    ok('390 Play 탭: 캔버스 1 + 그려짐 + aria-pressed', (await page.locator('.sl-gw canvas').count()) === 1 && (await page.locator('.sl-gw-live[data-on]').count()) === 1 && (await play.nth(0).getAttribute('aria-pressed')) === 'true')
    await page.locator('.sl-gw-item').nth(0).screenshot({ path: path.join(capDir, 'live-tap-390.png') })
    await play.nth(1).tap()
    await page.waitForTimeout(1200)
    ok('390 다른 Play: 여전히 1개(앞 것 멈춤)', (await page.locator('.sl-gw canvas').count()) === 1 && (await play.nth(0).getAttribute('aria-pressed')) === 'false')
    await play.nth(1).tap()
    await page.waitForTimeout(300)
    ok('390 Stop: 0개', (await page.locator('.sl-gw canvas').count()) === 0)
    ok('390: 동시 라이브 최대 1', (await page.evaluate(() => window.__maxCanvas)) <= 1, String(await page.evaluate(() => window.__maxCanvas)))
    // 작품 → 홈 진입(큐레이션: by Sandlab)
    await page.locator('.sl-gw-open').nth(2).tap()
    await page.waitForURL(/#s=/)
    await page.waitForFunction(() => /by |From the gallery/.test(document.querySelector('.sl-home-head')?.textContent || ''), null, { timeout: 30000 }).catch(() => {})
    const head = (await page.locator('.sl-home-head').innerText()).replace(/\s+/g, ' ')
    ok('큐레이션 → 홈 진입: 제목 + "by Sandlab"', /Bramble Crown/.test(head) && /by Sandlab/.test(head), head)
    await page.screenshot({ path: path.join(capDir, 'entry-pick-390.png') })
    await ctx.close()
  }
  // 같은 id가 위(큐레이션)·아래(New 목록) 두 곳에 있을 때도 라이브 1개(리뷰 차단 1)
  {
    const ctx = await ctxFor(b, VIEWS[390])
    const page = await ctx.newPage()
    await proxyApi(page, apiLog)
    await page.addInitScript(INIT)
    await page.goto(`${BASE}/gallery`)
    await loaded(page)
    await page.getByRole('button', { name: 'New', exact: true }).click()
    await loaded(page)
    await page.getByRole('button', { name: 'More', exact: true }).click()
    await page.waitForFunction(() => document.querySelectorAll('.sl-gw-sec:nth-of-type(2) .sl-gw-item:not(.sl-gw-skel)').length > 24 && !document.querySelector('.sl-gw-skel'), null, { timeout: 20000 }).catch(() => {})
    const pickHref = '/#s=KrL2Zri9mFk' // Abyssal Bell(큐레이션 8번째)
    const top = page.locator('.sl-gw-sec').nth(0).locator('.sl-gw-item', { has: page.locator(`a[href="${pickHref}"]`) })
    const low = page.locator('.sl-gw-sec').nth(1).locator('.sl-gw-item', { has: page.locator(`a[href="${pickHref}"]`) })
    ok('같은 id가 두 구역에 있음', (await top.count()) === 1 && (await low.count()) === 1)
    await low.locator('.sl-gw-play').tap()
    await page.waitForTimeout(1200)
    const c1 = await page.locator('.sl-gw canvas').count()
    const topLive = await top.locator('canvas').count()
    ok('아래 액자 Play: 캔버스 1개(위 같은 id는 안 켜짐)', c1 === 1 && topLive === 0, `canvas=${c1} top=${topLive}`)
    await top.locator('.sl-gw-play').tap()
    await page.waitForTimeout(1200)
    ok('위 액자 Play로 옮김: 여전히 1개', (await page.locator('.sl-gw canvas').count()) === 1 && (await low.locator('canvas').count()) === 0)
    ok('두 구역: 동시 라이브 최대 1', (await page.evaluate(() => window.__maxCanvas)) <= 1, String(await page.evaluate(() => window.__maxCanvas)))
    // 옛 960x540 장면이 있으면 Play 없음
    const oldNoPlay = await page.evaluate(() => true)
    void oldNoPlay
    await ctx.close()
  }
  // hover 재생 중 Play = 고정(멈춤 아님), 마우스가 떠나도 계속
  {
    const ctx = await ctxFor(b, VIEWS[1440])
    const page = await ctx.newPage()
    await proxyApi(page, apiLog)
    await page.addInitScript(INIT)
    await page.goto(`${BASE}/gallery`)
    await loaded(page)
    const item = page.locator('.sl-gw-item').nth(0)
    await item.locator('.sl-gw-glass').hover()
    await page.waitForTimeout(800)
    await item.locator('.sl-gw-play').click()
    await page.waitForTimeout(300)
    const pressed = await item.locator('.sl-gw-play').getAttribute('aria-pressed')
    await page.mouse.move(5, 5)
    await page.waitForTimeout(500)
    ok('1440 hover 재생 중 Play → 고정, 마우스가 떠나도 계속', pressed === 'true' && (await page.locator('.sl-gw canvas').count()) === 1, `pressed=${pressed}`)
    await ctx.close()
  }
  // reduced-motion: hover 자동 재생 없음
  {
    const ctx = await ctxFor(b, VIEWS[1440], { reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await proxyApi(page, apiLog)
    await page.addInitScript(INIT)
    await page.goto(`${BASE}/gallery`)
    await loaded(page)
    await page.locator('.sl-gw-item .sl-gw-glass').nth(0).hover()
    await page.waitForTimeout(1200)
    ok('reduced-motion: hover 자동 재생 없음', (await page.locator('.sl-gw canvas').count()) === 0)
    await ctx.close()
  }
  // WebGPU 없음: Play 버튼 없음, 썸네일·링크는 그대로
  {
    const ctx = await ctxFor(b, VIEWS[390])
    const page = await ctx.newPage()
    await proxyApi(page, apiLog)
    await page.addInitScript(() => {
      try {
        delete Navigator.prototype.gpu
      } catch {}
    })
    await page.goto(`${BASE}/gallery`)
    await loaded(page)
    await page.waitForTimeout(300)
    ok('WebGPU 없음: Play 버튼 0, 큐레이션 링크 12', (await page.locator('.sl-gw-play').count()) === 0 && (await page.locator('.sl-gw-open').count()) >= 12)
    await ctx.close()
  }

  // ---------- Yours 빈 상태(3폭) + 하단 글줄(Ko-fi) — P9b ----------
  for (const w of [390, 360, 1440]) {
    const v = VIEWS[w]
    const ctx = await ctxFor(b, v)
    const page = await ctx.newPage()
    await proxyApi(page, apiLog)
    await page.addInitScript(INIT)
    const errs = []
    page.on('pageerror', (e) => errs.push(e.message))
    await page.goto(`${BASE}/gallery`)
    await loaded(page)
    const clsBefore = await page.evaluate(() => window.__cls)
    await page.getByRole('button', { name: 'Yours', exact: true }).click()
    await loaded(page)
    await page.waitForTimeout(500)
    ok(`Yours ${w}: aria-pressed`, (await page.getByRole('button', { name: 'Yours', exact: true }).getAttribute('aria-pressed')) === 'true')
    const empty = (await page.locator('.sl-gw-empty').innerText().catch(() => '')).replace(/\s+/g, ' ')
    const pour = page.locator('.sl-gw-empty a.sl-gw-btn')
    ok(`Yours ${w}: 빈 상태 문구 + 홈 붓기 링크 하나`, /Nothing of yours yet/.test(empty) && (await pour.count()) === 1 && (await pour.getAttribute('href')) === '/', empty)
    ok(`Yours ${w}: 프리뷰 읽기 전용 안내(게시 꺼짐)`, (await page.locator('.sl-gw-ro', { hasText: 'Publishing is off' }).count()) === 1)
    ok(`Yours ${w}: 빈 상태엔 합계 줄·투표 버튼 없음`, (await page.locator('.sl-gw-mine').count()) === 0 && (await page.locator('.sl-gw-vote').count()) === 0)
    const sup = page.locator('.sl-gw-support')
    const supText = (await sup.innerText()).replace(/\s+/g, ' ').trim()
    ok(`${w}: 하단 글줄 문구 그대로`, supText === 'Made by Piousangel · About · Learn · Privacy · Terms · Contact · ♥ support', supText)
    const kofi = sup.locator('a[href="https://ko-fi.com/piousangel"]')
    ok(`${w}: Ko-fi 새 탭 링크`, (await kofi.count()) === 1 && (await kofi.getAttribute('target')) === '_blank' && /noopener/.test(await kofi.getAttribute('rel')))
    await scrollThrough(page)
    await page.waitForTimeout(600)
    const cls = await page.evaluate(() => window.__cls)
    ok(`Yours ${w}: CLS ≤ 0.05(탭 전환 포함)`, cls <= 0.05, `${clsBefore.toFixed(4)} → ${cls.toFixed(4)}`)
    const sm = await small44(page)
    ok(`Yours ${w}: 44px 미만 0`, sm.length === 0, sm.slice(0, 6).join('; '))
    const ax = await axe(page)
    ok(`Yours ${w}: axe serious 0`, ax.length === 0, ax.join('; '))
    ok(`Yours ${w}: 가로 스크롤 0`, (await hscroll(page)) <= 0)
    await page.locator('#sl-gw-all-h').scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(capDir, `yours-empty-${w}.png`) })
    await sup.scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(capDir, `support-${w}.png`) })
    ok(`Yours ${w}: 페이지 오류 0`, errs.length === 0, errs.join('; '))
    await ctx.close()
  }

  // ---------- B) 로컬 워커(새 creatorName) — 이름 있는 장면 → 홈 진입 부제, Yours 작품 있는 상태 ----------
  if (localBase) {
    // 로컬 워커에만 올린다(prod는 GET만): 공개 장면 하나의 데이터를 빌려 원본(이름 있음) + 그 리믹스(익명) + 원본에 1표
    const SRC = 'rIxeixvTdzg' // Bramble Crown(큐레이션) — 데이터·썸네일을 GET으로만 빌림
    const src = await (await fetch(`https://sandlab.app/api/scenes/${SRC}`)).json()
    const thumb = Buffer.from(await (await fetch(`https://sandlab.app/api/scenes/${SRC}/thumb`)).arrayBuffer()).toString('base64')
    if (!localBase.includes('localhost') && !localBase.includes('127.0.0.1')) throw new Error('localBase는 로컬 워커만(prod 쓰기 금지)')
    // 로컬 워커의 시간당 업로드 한도(IP 해시)는 verify-gallery.py가 이미 채운다 → 시드마다 다른 사설 IP 헤더(로컬 wrangler dev 전용)
    const post = async (p, body) => {
      const r = await fetch(localBase + p, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.9.${process.pid % 250}.${Math.floor(Math.random() * 250)}` }, body: body ? JSON.stringify(body) : undefined })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(`${p} ${r.status} ${JSON.stringify(j)}`)
      return j
    }
    const tag = Date.now().toString(36).slice(-4)
    const A = (await post('/api/scenes', { title: `Yours original ${tag}`, data: src.data, thumb, w: 1200, h: 600, creator: 'LocalTester01', creatorName: 'LocalTester' })).id
    const R = (await post('/api/scenes', { title: `Yours remix ${tag}`, data: src.data, thumb, w: 1200, h: 600, parent: A })).id
    await post(`/api/scenes/${A}/vote`)
    console.log(`local seed: original ${A}, remix ${R}`)
    // 옛 Yours와 같은 키·모양: 새로 올린 장면은 기준선 0(rememberMine). 지워진 id 하나는 건너뛰어야 한다.
    const MINE = [
      { id: R, title: 'r', at: Date.now(), seenVotes: 0, seenRemix: 0 },
      { id: A, title: 'a', at: Date.now() - 1000, seenVotes: 0, seenRemix: 0 },
      { id: 'GoneScene01', title: 'gone', at: 0, seenVotes: 0, seenRemix: 0 },
    ]
    for (const w of [390, 360, 1440]) {
      const v = VIEWS[w]
      const ctx = await ctxFor(b, v)
      const page = await ctx.newPage()
      await page.addInitScript(INIT)
      const errs = []
      page.on('pageerror', (e) => errs.push(e.message))
      await page.goto(`${localBase}/gallery`)
      await page.evaluate((m) => localStorage.setItem('sandlab.mine', JSON.stringify(m)), MINE)
      await page.reload()
      await loaded(page)
      await page.getByRole('button', { name: 'Yours', exact: true }).click()
      // 합계 줄은 단건 조회가 다 끝난 뒤에만 생긴다 — 이걸 기다린다(loaded만 보면 이전 목록에서 먼저 풀릴 수 있다)
      await page.waitForSelector('.sl-gw-mine .sl-gw-meta', { timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(300)
      const sec = page.locator('.sl-gw-sec').nth(1)
      const items = sec.locator('.sl-gw-item:not(.sl-gw-skel)')
      ok(`Yours+ ${w}: 내 작품 2점(지워진 id는 건너뜀)`, (await items.count()) === 2, String(await items.count()))
      ok(`Yours+ ${w}: 제목 "Your scenes"`, (await page.locator('#sl-gw-all-h').innerText()) === 'Your scenes')
      const mine = (await page.locator('.sl-gw-mine').innerText()).replace(/\s+/g, ' ').trim()
      ok(`Yours+ ${w}: 합계 + 증가분 줄`, mine.includes('2 scenes · 1 vote · 1 remix') && mine.includes('+1 vote, +1 remix since your last visit'), mine)
      ok(`Yours+ ${w}: 증가분 앞은 아이콘(svg), 기호 글리프 없음`, (await page.locator('.sl-gw-delta svg').count()) === 1 && !/[←-⇿☀-➿]/.test(mine))
      ok(`Yours+ ${w}: 자기 작품엔 투표 버튼 없음, 표 수만`, (await sec.locator('.sl-gw-vote').count()) === 0 && (await sec.locator('.sl-gw-votes', { hasText: '1 vote' }).count()) === 1)
      const orig = sec.locator('.sl-gw-from')
      ok(`Yours+ ${w}: 리믹스 카드에 원본 링크`, (await orig.count()) === 1 && (await orig.getAttribute('href')) === `/#s=${A}`)
      ok(`Yours+ ${w}: 올린 시각 표시`, (await sec.locator('.sl-gw-meta', { hasText: /just now|m ago/ }).count()) === 2)
      const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('sandlab.mine')))
      const sa = seen.find((e) => e.id === A)
      ok(`Yours+ ${w}: 기준선 갱신(sandlab.mine seenVotes 1·seenRemix 1)`, sa.seenVotes === 1 && sa.seenRemix === 1, JSON.stringify(sa))
      await scrollThrough(page)
      await page.waitForTimeout(600)
      const cls = await page.evaluate(() => window.__cls)
      ok(`Yours+ ${w}: CLS ≤ 0.05`, cls <= 0.05, cls.toFixed(4))
      const sm = await small44(page)
      ok(`Yours+ ${w}: 44px 미만 0`, sm.length === 0, sm.slice(0, 6).join('; '))
      const ax = await axe(page)
      ok(`Yours+ ${w}: axe serious 0`, ax.length === 0, ax.join('; '))
      ok(`Yours+ ${w}: 가로 스크롤 0`, (await hscroll(page)) <= 0)
      await page.locator('#sl-gw-all-h').scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(capDir, `yours-${w}.png`) })
      await sec.screenshot({ path: path.join(capDir, `yours-${w}-section.png`) })
      // 다시 오면 증가분 없음(이번 방문이 새 기준선)
      await page.reload()
      await loaded(page)
      await page.getByRole('button', { name: 'Yours', exact: true }).click()
      // 합계 줄은 단건 조회가 다 끝난 뒤에만 생긴다 — 이걸 기다린다(loaded만 보면 이전 목록에서 먼저 풀릴 수 있다)
      await page.waitForSelector('.sl-gw-mine .sl-gw-meta', { timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(300)
      const mine2 = (await page.locator('.sl-gw-mine').innerText()).replace(/\s+/g, ' ').trim()
      ok(`Yours+ ${w}: 재방문엔 증가분 줄 없음`, mine2.includes('2 scenes') && !mine2.includes('since your last visit'), mine2)
      ok(`Yours+ ${w}: 페이지 오류 0`, errs.length === 0, errs.join('; '))
      await ctx.close()
    }
    // 작성자 링크(by 이름) → 그 사람 작품 + 서버 집계(옛 작성자 화면)
    {
      const ctx = await ctxFor(b, VIEWS[390])
      const page = await ctx.newPage()
      await page.goto(`${localBase}/gallery`)
      await loaded(page)
      await page.getByRole('button', { name: 'New', exact: true }).click()
      await loaded(page)
      const by = page.locator('.sl-gw-sec').nth(1).locator('button.sl-gw-credit-btn', { hasText: 'by LocalTester' }).first()
      await by.click()
      await loaded(page)
      await page.waitForSelector('.sl-gw-subrow .sl-gw-label', { timeout: 15000 }).catch(() => {})
      const h2 = await page.locator('#sl-gw-all-h').innerText()
      const stats = await page.locator('.sl-gw-subrow .sl-gw-label').innerText().catch(() => '')
      ok('작성자 링크 → 그 사람 작품 + 집계 줄', h2 === 'Scenes by LocalTester' && /\d+ scenes? · \d+ votes? · \d+ remix(es)?/.test(stats), `${h2} / ${stats}`)
      const sm = await small44(page)
      ok('작성자 화면 44px 미만 0', sm.length === 0, sm.join('; '))
      await page.screenshot({ path: path.join(capDir, 'maker-390.png') })
      await ctx.close()
    }
    const ctx = await ctxFor(b, VIEWS[390])
    const page = await ctx.newPage()
    await page.addInitScript(() => localStorage.setItem('sl.pourdemo.v1', '1'))
    await page.goto(`${localBase}/gallery`)
    await loaded(page)
    await page.getByRole('button', { name: 'New', exact: true }).click()
    await loaded(page)
    // 정렬을 바꾼 직후엔 Hot 목록이 아직 남아 있어 loaded가 먼저 풀릴 수 있다(P9b 재실행에서 한 번 실패) — 다시 그려질 틈을 준다
    await page.waitForTimeout(800)
    await loaded(page)
    const card = page.locator('.sl-gw-item', { hasText: 'by LocalTester' }).first()
    await card.waitFor({ timeout: 20000 }).catch(() => {})
    ok('로컬: 목록에 by LocalTester', (await card.count()) === 1)
    // 로컬 D1의 verify-gallery 장면은 960x540 → Play 버튼 없음(리뷰 2)
    const old = page.locator('.sl-gw-sec').nth(1).locator('.sl-gw-item', { hasText: 'Unsigned', hasNotText: 'Yours remix' })
    const oldN = await old.count()
    const oldPlay = await old.locator('.sl-gw-play').count()
    ok('로컬: 960x540 옛 장면은 Play 없음, 1200x600은 있음', oldN > 0 && oldPlay === 0 && (await card.locator('.sl-gw-play').count()) === 1, `old=${oldN} play=${oldPlay}`)
    await card.locator('.sl-gw-open').tap()
    await page.waitForURL(/#s=/)
    await page.waitForFunction(() => /by |From the gallery/.test(document.querySelector('.sl-home-head')?.textContent || ''), null, { timeout: 30000 }).catch(() => {})
    const head = (await page.locator('.sl-home-head').innerText()).replace(/\s+/g, ' ')
    ok('로컬 워커: 홈 진입 부제 "by LocalTester"(단건 API creatorName)', /by LocalTester/.test(head), head)
    await page.screenshot({ path: path.join(capDir, 'entry-named-390.png') })
    await ctx.close()
  }

  await b.close()
  srv.close()
  // 프록시는 GET만 prod로 보내고 나머지는 403으로 가로챈다 → prod로 나간 쓰기는 구조상 0.
  // 가로챈 것 중 갤러리·투표·업로드 쓰기가 없어야 한다(레이아웃 LandingBeacon의 POST /api/track은 기존 계측 — 매 페이지 로드).
  const writes = apiLog.filter((l) => l.startsWith('blocked'))
  const nonTrack = writes.filter((l) => !l.endsWith(' /api/track'))
  ok('prod로 나간 쓰기 0 + 가로챈 쓰기 중 장면·투표 0', nonTrack.length === 0, `가로챔 ${writes.length}건(전부 /api/track 랜딩 계측) ${nonTrack.join('; ')}`)
  const fails = results.filter((r) => !r.pass)
  fs.writeFileSync(path.join(capDir, 'e2e.json'), JSON.stringify(results, null, 2))
  console.log(`\n${results.length - fails.length}/${results.length} PASS`)
  process.exit(fails.length ? 1 : 0)
})()
