#!/usr/bin/env node
/**
 * 공통 하단 시트(src/ui-next/sheet/BottomSheet.tsx) e2e + 사이트 UX 감사 — 오너 11-20 "손잡이를 끌어 닫을 수 없고 배경 탭만 된다".
 * 프리뷰 빌드(out/)에서 메뉴 시트(모든 셸 페이지)·홈 공유 시트를 실제 터치(CDP Input.dispatchTouchEvent → Pointer Events)로 끈다.
 *
 *   pnpm build:preview && node scripts/qa/sheet-e2e.mjs                 # sheet + ux
 *   node scripts/qa/sheet-e2e.mjs --only sheet --repeat 3 --out <dir>
 *   node scripts/qa/sheet-e2e.mjs --only sheet --capture docs/design/bottom-sheet   # + 끌기 녹화 webm·390/1440 캡처
 *
 * 떨어뜨리는 오답: '손잡이가 그려져 있지만 끌어도 안 닫힘', '스크롤하다 시트가 닫힘', '닫혔는데 배경이 스크롤돼 있음',
 * '닫은 뒤 뒤로 가기가 한 번 먹지 않음(history 빈칸)', '닫기 연타로 이전 페이지까지 빠짐', '시트 링크로 이동한 뒤 뒤로 가기 두 번',
 * '공유 시트를 닫으면 주소가 옛 주소로 돌아감·새로고침', '한글 조합 중 Esc로 닫힘', 'Esc 뒤 포커스가 body로 샘'.
 * ux: 390 터치에서 누르는 것 44px 미만(elementFromPoint로 실제 눌리는 범위), 입력칸 글자 16px 미만, viewport 확대 막음, 가로 넘침.
 *   예외(UX-CHECKLIST.md): 문장 속 링크(inline), 게임(시뮬) 판 캔버스·판 위 덮개.
 * exit 0 통과 / 1 실패 / 2 out/이 프리뷰 빌드가 아님.
 */
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ROOT, launch } from './lib/deps.mjs'
import { serve } from './lib/server.mjs'

const argv = process.argv.slice(2)
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d)
const OUT = resolve(ROOT, opt('--out', 'out'))
const ONLY = opt('--only', 'sheet,ux').split(',')
const REPEAT = Number(opt('--repeat', '1'))
const CAPTURE = opt('--capture', '') ? resolve(ROOT, opt('--capture')) : null

if (!existsSync(join(OUT, 'index.html')) || !/<html[^>]*\sclass="[^"]+"/.test(readFileSync(join(OUT, 'index.html'), 'utf8'))) {
  console.error(`${OUT}는 프리뷰 빌드가 아니다(<html class> 없음) — pnpm build:preview 먼저`)
  process.exit(2)
}

const srv = await serve(OUT)
const browser = await launch()
const fails = []
let passed = 0
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESK = { viewport: { width: 1440, height: 900 } }
const SHEET = '.sl-sheet[role="dialog"]'

async function check(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  ok   ${name}`)
  } catch (e) {
    fails.push(`${name}: ${String(e?.message ?? e).split('\n')[0].slice(0, 220)}`)
    console.log(`  FAIL ${name} — ${String(e?.message ?? e).split('\n')[0].slice(0, 220)}`)
  }
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg)
}
const wait = (page, ms) => page.waitForTimeout(ms)

async function ctxOf(view, extra = {}) {
  const c = await browser.newContext({ ...(view === 'm' ? MOBILE : DESK), ...extra })
  await c.addInitScript(() => {
    try {
      localStorage.setItem('sl.pourdemo.v1', '1') // 첫 방문 붓기 데모 끔
      localStorage.setItem('sl.wordmark.v1', '1')
    } catch {}
  })
  return c
}

/** /about → /learn 두 문서를 쌓고(뒤로 가기 대상), 메뉴 시트를 연다. */
async function openMenu(page, { path = '/learn', fresh = true } = {}) {
  if (fresh) {
    await page.goto(srv.base + '/about', { waitUntil: 'load' })
    await page.goto(srv.base + path, { waitUntil: 'load' })
    await page.evaluate(() => (window.__alive = 1)) // 새로고침되면 사라진다
  }
  await page.locator('header button[aria-label="Menu"]').first().click()
  await page.locator(SHEET).waitFor({ state: 'visible', timeout: 5000 })
  await wait(page, 380) // 올라오는 모션(280ms) 끝
}
const sheetCount = (page) => page.locator(SHEET).count()
const transformOf = (page) => page.locator(SHEET).evaluate((el) => getComputedStyle(el).transform)
const histMark = (page, k = '__slMenu') => page.evaluate((k) => !!history.state?.[k], k)

/** CDP 실제 터치 끌기. stepMs = 움직임 사이 간격. */
async function touchDrag(page, x, y0, y1, { steps = 12, stepMs = 30 } = {}) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / steps }] })
    if (stepMs) await wait(page, stepMs)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}
async function handleCenter(page) {
  const b = await page.locator('[data-testid="sheet-handle"]').boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
async function closedBy(page, ms = 2000) {
  await page.locator(SHEET).waitFor({ state: 'detached', timeout: ms })
}

/* ---------------- sheet ---------------- */
async function sheetSuite(round) {
  console.log(`\n== sheet (회차 ${round})`)
  const ctx = await ctxOf('m')
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))

  await check('손잡이: 짧게 끌면 따라오다 제자리, 길게 끌면 닫힘 + history 빈칸 없음', async () => {
    await openMenu(page)
    const h = await handleCenter(page)
    const height = (await page.locator(SHEET).boundingBox()).height
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: h.x, y: h.y }] })
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: h.x, y: h.y + i * 10 }] })
      await wait(page, 40)
    }
    const mid = await transformOf(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
    expect(/matrix\(1, 0, 0, 1, 0, (4\d|5\d)(\.\d+)?\)/.test(mid), `끄는 중 위치 ${mid}(≈54px여야)`)
    await wait(page, 450)
    expect((await sheetCount(page)) === 1, '짧게 끌었는데 닫힘')
    expect((await transformOf(page)) === 'none', '제자리로 안 돌아옴')
    await touchDrag(page, h.x, h.y, h.y + height * 0.4, { steps: 30, stepMs: 30 })
    await closedBy(page)
    expect(page.url().endsWith('/learn'), `URL ${page.url()}`)
    expect(!(await histMark(page)), '시트 history 칸이 남음')
    await page.goBack()
    await page.waitForURL(/\/about$/, { timeout: 3000 })
  })

  await check('튕기기(90px/48ms, 높이 25% 미만) → 닫힘', async () => {
    await openMenu(page)
    const h = await handleCenter(page)
    // 튕김은 시간이 생명이라 CDP 왕복이 아니라 페이지 안에서 8ms 간격 포인터 이벤트로(실제 손가락 ~120Hz)
    await page.locator('[data-testid="sheet-handle"]').evaluate((el, { x, y }) => {
      const panel = el.closest('[role="dialog"]')
      const fire = (type, cy) => (type === 'pointerdown' ? el : panel).dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, clientX: x, clientY: cy, bubbles: true, cancelable: true }))
      const spin = (ms) => {
        const t = performance.now()
        while (performance.now() - t < ms) {}
      }
      fire('pointerdown', y)
      for (let i = 1; i <= 6; i++) {
        spin(8)
        fire('pointermove', y + i * 15)
      }
      spin(8)
      fire('pointerup', y + 90)
    }, h)
    await closedBy(page)
    expect(!(await histMark(page)), 'history 칸 남음')
  })

  await check('내용 영역: 맨 위에서 아래로 끌면 닫힘, 위로 밀면 시트 그대로·문서 그대로', async () => {
    await openMenu(page)
    const big = await page.locator(`${SHEET} .sl-sheet-link-big`).first().boundingBox()
    const x = big.x + big.width - 30
    const y0 = await page.evaluate(() => scrollY)
    await touchDrag(page, x, big.y + 200, big.y + 20, { steps: 10, stepMs: 20 })
    await wait(page, 300)
    expect((await sheetCount(page)) === 1 && (await transformOf(page)) === 'none', '위로 밀었는데 시트가 움직임')
    expect((await page.evaluate(() => scrollY)) === y0, '위로 밀었는데 뒤 문서가 스크롤')
    await page.locator(SHEET).evaluate((el) => el.scrollTo(0, 0))
    const b2 = await page.locator(`${SHEET} .sl-sheet-link-big`).first().boundingBox()
    await touchDrag(page, x, b2.y + 10, b2.y + 10 + 360, { steps: 30, stepMs: 30 })
    await closedBy(page)
  })

  await check('안쪽이 스크롤된 상태에서 아래로 끌면 스크롤만(360×500)', async () => {
    await page.setViewportSize({ width: 360, height: 500 })
    await openMenu(page, { fresh: false })
    const max = await page.locator(SHEET).evaluate((el) => el.scrollHeight - el.clientHeight)
    expect(max > 40, `시트 안쪽 스크롤 여유 ${max}px — 검사 전제가 깨짐`)
    await page.locator(SHEET).evaluate((el) => el.scrollTo(0, el.scrollHeight))
    const before = await page.locator(SHEET).evaluate((el) => el.scrollTop)
    const box = await page.locator(SHEET).boundingBox()
    await touchDrag(page, box.x + box.width - 40, box.y + 120, box.y + 120 + 200, { steps: 20, stepMs: 30 })
    await wait(page, 400)
    expect((await sheetCount(page)) === 1, '스크롤하다 시트가 닫힘')
    expect((await transformOf(page)) === 'none', '스크롤하다 시트가 움직임')
    expect((await page.locator(SHEET).evaluate((el) => el.scrollTop)) < before, '안쪽 스크롤로 소비되지 않음')
    await page.keyboard.press('Escape')
    await closedBy(page)
    await page.setViewportSize(MOBILE.viewport)
  })

  await check('배경 탭·Esc(포커스 복귀)·뒤로 가기·손잡이 Space·Close 연타', async () => {
    await openMenu(page)
    await page.locator('[data-testid="sheet-dim"]').click({ position: { x: 195, y: 30 } })
    await closedBy(page)
    expect(page.url().endsWith('/learn'), `배경 탭 뒤 URL ${page.url()}`)
    const menuBtn = page.locator('header button[aria-label="Menu"]').first()
    await menuBtn.focus()
    await page.keyboard.press('Enter')
    await page.locator(SHEET).waitFor()
    expect(await page.locator(SHEET).evaluate((el) => el.contains(document.activeElement)), '열었는데 포커스가 시트 밖')
    expect(await page.evaluate(() => document.querySelector('main')?.closest('[inert]') !== null), '배경이 inert가 아님')
    await page.keyboard.press('Escape')
    await closedBy(page)
    expect(await menuBtn.evaluate((el) => el === document.activeElement), 'Esc 뒤 포커스가 메뉴 버튼으로 안 돌아옴')
    expect(await page.evaluate(() => !document.querySelector('[inert]')), '닫았는데 inert가 남음')
    await openMenu(page, { fresh: false })
    await page.goBack()
    await closedBy(page)
    expect(page.url().endsWith('/learn'), `뒤로 가기가 페이지를 떠남 ${page.url()}`)
    await openMenu(page, { fresh: false })
    const handle = page.locator('[data-testid="sheet-handle"]')
    expect((await handle.getAttribute('aria-label')) === 'Close', '손잡이 접근 이름이 Close가 아님')
    await handle.focus()
    await page.keyboard.press(' ')
    await closedBy(page)
    await openMenu(page, { fresh: false })
    // Close 연타: history.back이 두 번 불리면 /about으로 빠진다
    await page.locator(`${SHEET} .sl-text-btn`).evaluate((b) => {
      b.click()
      b.click()
      b.click()
    })
    await closedBy(page)
    await wait(page, 300)
    expect(page.url().endsWith('/learn'), `Close 연타로 페이지를 떠남 ${page.url()}`)
    expect(await page.evaluate(() => window.__alive === 1), '페이지가 새로 로드됨')
  })

  await check('한글 조합 중 Esc는 닫지 않는다', async () => {
    await openMenu(page, { fresh: false })
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })))
    await wait(page, 350)
    expect((await sheetCount(page)) === 1, '조합 중 Esc로 닫힘')
    await page.keyboard.press('Escape')
    await closedBy(page)
  })

  await check('배경 스크롤 잠금: 휠·배경 스와이프에 문서가 그대로, 닫히면 원래 자리', async () => {
    await page.goto(srv.base + '/learn/margolus-falling-sand', { waitUntil: 'load' })
    await page.evaluate(() => window.scrollTo(0, 400))
    await wait(page, 100)
    const y0 = await page.evaluate(() => scrollY)
    expect(y0 > 300, `전제: 스크롤 ${y0}`)
    // 글 페이지 헤더는 sticky가 아니라 Playwright click은 버튼까지 스크롤해 버린다 — 스크롤 위치를 지키려고 DOM click
    await page.evaluate(() => document.querySelector('header button[aria-label="Menu"]').click())
    await page.locator(SHEET).waitFor()
    await wait(page, 380)
    expect((await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) === 'hidden', 'html overflow가 hidden이 아님')
    await page.mouse.move(195, 40)
    await page.mouse.wheel(0, 600)
    await touchDrag(page, 195, 90, 10, { steps: 8, stepMs: 20 })
    await touchDrag(page, 195, 20, 100, { steps: 8, stepMs: 20 })
    await wait(page, 300)
    expect((await page.evaluate(() => scrollY)) === y0, `열린 동안 문서가 스크롤 ${await page.evaluate(() => scrollY)} ≠ ${y0}`)
    await page.keyboard.press('Escape')
    await closedBy(page)
    expect((await page.evaluate(() => scrollY)) === y0, '닫은 뒤 스크롤 위치가 바뀜')
    expect((await page.evaluate(() => document.documentElement.style.overflow)) === '', 'html overflow가 안 풀림')
  })

  await check('시트 안 링크로 이동 → 뒤로 가기 한 번에 원래 페이지(history 빈칸 없음)', async () => {
    await openMenu(page)
    await page.locator(`${SHEET} a[href="/terms"]`).click()
    await page.waitForURL(/\/terms$/, { timeout: 5000 })
    await page.goBack()
    await page.waitForURL(/\/learn$/, { timeout: 3000 })
    await wait(page, 300)
    expect((await sheetCount(page)) === 0, '돌아왔는데 시트가 열려 있음')
    expect(!(await histMark(page)), '돌아온 칸이 시트 칸(뒤로 가기가 한 번 먹지 않음)')
    await page.goBack()
    await page.waitForURL(/\/about$/, { timeout: 3000 })
  })

  await check('시트 안 누를 것 44px 이상·입력 16px 이상(메뉴)', async () => {
    await openMenu(page)
    const small = await page.locator(SHEET).evaluate((root) =>
      [...root.querySelectorAll('button, a[href], input, select, textarea')]
        .filter((el) => el.checkVisibility())
        .map((el) => {
          const r = el.getBoundingClientRect()
          return { t: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24), h: Math.round(r.height), w: Math.round(r.width), fs: parseFloat(getComputedStyle(el).fontSize), input: el.matches('input, select, textarea') }
        })
        .filter((m) => m.h < 44 || m.w < 44 || (m.input && m.fs < 16)),
    )
    expect(small.length === 0, JSON.stringify(small))
    await page.keyboard.press('Escape')
    await closedBy(page)
  })

  await check('홈 공유 시트: 열린 동안 주소 그대로 → 닫으면 #g= 주소, 새로고침 없음, 뒤로 가기 한 번에 이전 페이지', async () => {
    const r = await shareFlow(page)
    if (r === 'skip') return console.log('       (WebGPU 어댑터 없음 — 공유 시트 흐름 건너뜀)')
  })

  await ctx.close()

  // 모션 줄이기
  const rctx = await ctxOf('m', { reducedMotion: 'reduce' })
  const rp = await rctx.newPage()
  await check('모션 줄이기: 애니메이션 없이 즉시(Esc → DOM에서 빠지기까지 150ms 미만)', async () => {
    await openMenu(rp)
    const m = await rp.locator(SHEET).evaluate((el) => ({ anim: getComputedStyle(el).animationName, running: el.getAnimations().length }))
    expect(m.anim === 'none' && m.running === 0, JSON.stringify(m))
    const took = await rp.evaluate(
      () =>
        new Promise((res) => {
          const t0 = performance.now()
          new MutationObserver((_, mo) => {
            if (!document.querySelector('.sl-sheet[role="dialog"]')) {
              mo.disconnect()
              res(performance.now() - t0)
            }
          }).observe(document.body, { childList: true, subtree: true })
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        }),
    )
    expect(took < 150, `${Math.round(took)}ms`)
  })
  await rctx.close()

  // 데스크톱
  const dctx = await ctxOf('d')
  const dp = await dctx.newPage()
  await check('1440: 메뉴는 메뉴 버튼 아래 오른쪽 카드, 손잡이 숨김, 마우스 끌기 무시, 배경 클릭으로 닫힘', async () => {
    await openMenu(dp)
    const box = await dp.locator(SHEET).boundingBox()
    expect(Math.abs(box.x + box.width - 1416) < 4 && Math.abs(box.y - 72) < 4, `자리 ${JSON.stringify(box)}`)
    expect(!(await dp.locator('[data-testid="sheet-handle"]').isVisible()), '손잡이가 보임')
    await dp.mouse.move(box.x + 100, box.y + 30)
    await dp.mouse.down()
    await dp.mouse.move(box.x + 100, box.y + 330, { steps: 10 })
    await dp.mouse.up()
    expect((await transformOf(dp)) === 'none', '데스크톱에서 끌림')
    await dp.mouse.click(200, 600)
    await closedBy(dp)
  })
  await dctx.close()
  if (errors.length) fails.push(`페이지 오류: ${errors.join(' | ')}`)
}

/** 홈에서 붓고 Share → 공유 시트. WebGPU 어댑터가 없으면 'skip'. */
async function shareFlow(page, { shot } = {}) {
  await page.goto(srv.base + '/about', { waitUntil: 'load' })
  await page.goto(srv.base + '/', { waitUntil: 'load' })
  const ok = await page
    .waitForFunction(() => document.querySelector('canvas.sl-well-canvas') && !document.querySelector('.sl-nogpu'), null, { timeout: 8000 })
    .then(() => page.evaluate(async () => !!(await navigator.gpu?.requestAdapter?.())))
    .catch(() => false)
  if (!ok) return 'skip'
  await page.evaluate(() => (window.__alive = 1))
  const c = await page.locator('canvas.sl-well-canvas').boundingBox()
  await wait(page, 800)
  await touchDrag(page, c.x + c.width * 0.3, c.y + c.height * 0.3, c.y + c.height * 0.6, { steps: 10, stepMs: 30 })
  await wait(page, 300)
  const before = page.url()
  await page.locator('.sl-dock button', { hasText: 'Share' }).click()
  await page.locator(SHEET).waitFor({ timeout: 5000 })
  await page.waitForFunction(() => /#g=/.test(document.querySelector('.sl-share-url')?.value ?? ''), null, { timeout: 15000 })
  await wait(page, 300)
  expect(page.url() === before, `열린 동안 주소가 바뀜 ${page.url()}`)
  if (shot) await shot(page)
  const fs = await page.locator(`${SHEET} input`).evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)))
  expect(fs.every((f) => f >= 16), `공유 시트 입력 글자 ${fs}`)
  await page.keyboard.press('Escape')
  await closedBy(page)
  await wait(page, 200)
  expect(/#g=/.test(page.url()), `닫은 뒤 주소에 #g= 없음 ${page.url()}`)
  expect(await page.evaluate(() => window.__alive === 1), '닫은 뒤 새로고침됨')
  expect(await page.locator('.sl-dock button', { hasText: 'Share' }).evaluate((b) => b === document.activeElement), '포커스가 Share로 안 돌아옴')
  await page.goBack()
  await page.waitForURL(/\/about$/, { timeout: 3000 })
}

/* ---------------- ux ---------------- */
function auditPage(page) {
  return page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? ''
      const zoomBlocked = /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0*)?(\D|$)/i.test(meta)
      const overflow = document.documentElement.scrollWidth - innerWidth
      const inputs = [...document.querySelectorAll('input:not([type=hidden]):not([type=range]):not([type=checkbox]):not([type=radio]), select, textarea')]
        .filter((el) => el.checkVisibility())
        .map((el) => ({ id: el.id || el.getAttribute('aria-label') || el.className, fs: parseFloat(getComputedStyle(el).fontSize) }))
        .filter((m) => m.fs < 16)
      // 누르는 영역: 가운데에서 위·아래·좌·우 21px 지점이 모두 그 요소에 닿는가(44px 지름). 문장 속 링크(inline)는 WCAG 2.5.8 예외.
      const small = []
      const sel = 'button, a[href], [role="button"], [role="tab"], summary, input[type="checkbox"], input[type="radio"], select'
      for (const el of document.querySelectorAll(sel)) {
        if (!el.checkVisibility() || el.closest('[hidden], [inert], [aria-hidden="true"]')) continue
        const cs = getComputedStyle(el)
        if (el.tagName === 'A' && cs.display === 'inline' && el.closest('p, li, td, figcaption, blockquote, dd')) continue
        el.scrollIntoView({ block: 'center', inline: 'center' })
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const hits = [
          [cx, cy - 21],
          [cx, cy + 21],
          [cx - 21, cy],
          [cx + 21, cy],
        ].every(([x, y]) => {
          const h = document.elementFromPoint(x, y)
          return !!h && (h === el || el.contains(h))
        })
        if (!hits) small.push(`${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? '').toString().split(' ')[0]} "${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
      window.scrollTo(0, 0)
      return { zoomBlocked, meta, overflow, inputs, small }
    })
}
const UX_PAGES = ['/', '/daily', '/play', '/play/1-1', '/gallery', '/learn', '/learn/margolus-falling-sand', '/materials', '/materials/acid', '/about', '/play/1-1/guide', '/privacy', '/terms', '/contact']
async function uxSuite() {
  console.log('\n== ux (390 터치)')
  const ctx = await ctxOf('m')
  // 양성 대조: 이 검사가 실제로 작은 버튼·작은 입력·확대 막음을 잡는가
  {
    const page = await ctx.newPage()
    await page.goto(srv.base + '/about', { waitUntil: 'load' })
    await page.evaluate(() => {
      const b = document.createElement('button')
      b.textContent = 'tiny'
      b.style.cssText = 'position:fixed;left:100px;top:300px;width:24px;height:24px;font-size:10px;z-index:99'
      document.body.append(b)
      const i = document.createElement('input')
      i.style.cssText = 'position:fixed;left:100px;top:400px;font-size:13px;z-index:99'
      document.body.append(i)
    })
    const ctl = await auditPage(page)
    expect(ctl.small.some((x) => x.includes('tiny')) && ctl.inputs.length === 1, `양성 대조 실패 ${JSON.stringify(ctl)}`)
    console.log('  양성 대조(24px 버튼·13px 입력 주입) → 잡힘')
    await page.close()
  }
  for (const p of UX_PAGES) {
    const page = await ctx.newPage()
    await page.goto(srv.base + p, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {})
    await wait(page, 600)
    const r = await auditPage(page)
    const bad = r.zoomBlocked || r.overflow > 0 || r.inputs.length || r.small.length
    console.log(`  ${p.padEnd(30)} 44px 미만 ${r.small.length} 입력<16px ${r.inputs.length} 가로넘침 ${r.overflow} 확대막음 ${r.zoomBlocked}${bad ? '  <-' : ''}`)
    if (r.zoomBlocked) fails.push(`ux ${p} viewport가 확대를 막음: ${r.meta}`)
    if (r.overflow > 0) fails.push(`ux ${p} 가로 넘침 ${r.overflow}px`)
    for (const i of r.inputs) fails.push(`ux ${p} 입력 글자 ${i.fs}px < 16: ${i.id}`)
    for (const s of r.small) fails.push(`ux ${p} 누르는 영역 < 44: ${s}`)
    await page.close()
  }
  await ctx.close()
}

/* ---------------- capture ---------------- */
async function capture(dir) {
  console.log(`\n== capture → ${dir}`)
  mkdirSync(dir, { recursive: true })
  // 390 끌기 녹화: 열기 → 짧게 끌어 복귀 → 길게 끌어 닫힘 → 다시 열어 튕기기
  const vctx = await browser.newContext({ ...MOBILE, deviceScaleFactor: 1, recordVideo: { dir, size: { width: 390, height: 844 } } })
  await vctx.addInitScript(() => {
    try {
      localStorage.setItem('sl.wordmark.v1', '1')
    } catch {}
  })
  const vp = await vctx.newPage()
  await openMenu(vp)
  await wait(vp, 600)
  const h = await handleCenter(vp)
  const height = (await vp.locator(SHEET).boundingBox()).height
  await touchDrag(vp, h.x, h.y, h.y + 70, { steps: 14, stepMs: 40 })
  await wait(vp, 900)
  await touchDrag(vp, h.x, h.y, h.y + height * 0.45, { steps: 24, stepMs: 35 })
  await wait(vp, 900)
  await openMenu(vp, { fresh: false })
  await wait(vp, 500)
  const big = await vp.locator(`${SHEET} .sl-sheet-link-big`).first().boundingBox()
  await touchDrag(vp, big.x + big.width - 30, big.y + 10, big.y + 140, { steps: 6, stepMs: 12 })
  await wait(vp, 900)
  const video = vp.video()
  await vctx.close()
  renameSync(await video.path(), join(dir, 'drag-390.webm'))

  for (const [name, view] of [
    ['390', 'm'],
    ['1440', 'd'],
  ]) {
    const ctx = await ctxOf(view)
    const page = await ctx.newPage()
    await openMenu(page)
    await page.screenshot({ path: join(dir, `menu-${name}.png`) })
    if (view === 'm') {
      // 끄는 중(손가락을 뗀 적 없는 상태) 한 장
      const hh = await handleCenter(page)
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: hh.x, y: hh.y }] })
      for (let i = 1; i <= 8; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: hh.x, y: hh.y + i * 15 }] })
        await wait(page, 30)
      }
      await page.screenshot({ path: join(dir, `menu-${name}-dragging.png`) })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await cdp.detach()
    }
    const r = await shareFlow(page, { shot: (pg) => pg.screenshot({ path: join(dir, `share-${name}.png`) }) }).catch((e) => `err ${e.message}`)
    if (r) console.log(`  share-${name}: ${r}`)
    await ctx.close()
  }
  console.log('  drag-390.webm · menu-390.png · menu-390-dragging.png · menu-1440.png · share-390.png · share-1440.png')
}

if (ONLY.includes('sheet')) for (let i = 1; i <= REPEAT; i++) await sheetSuite(i)
if (ONLY.includes('ux')) await uxSuite()
if (CAPTURE) await capture(CAPTURE)

await browser.close()
srv.close?.()
console.log(`\n${passed} 통과, ${fails.length} 실패`)
if (fails.length) {
  for (const f of fails) console.log('  - ' + f)
  process.exit(1)
}
process.exit(0)
