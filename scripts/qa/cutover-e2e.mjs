#!/usr/bin/env node
/**
 * P12 컷오버 e2e — prod 빌드(out/, 새 셸)에서 ① 골든셋 공유 링크 10개 ② 옛 저장 데이터 읽힘 ③ 읽기 전용·noindex 흔적 0.
 *
 *   pnpm run build:prod && node scripts/qa/cutover-e2e.mjs [--out <dir>] [--base https://sandlab.app] [--json r.json]
 *
 * - 기본은 out/을 gzip 정적 서버로 띄우고 `/api/*` GET만 prod로 프록시(쓰기 403 — scripts/qa/lib/server.mjs).
 *   `--base`를 주면 그 주소(라이브)를 연다 — 배포 뒤 라이브 확인용. 쓰기 요청은 브라우저에서 막는다(route abort).
 * - 골든셋 기대값은 src/lib/sand/shareLinks.golden.test.ts 표와 같다(#s= 우선, 5자 id·깨진 #g=는 빈 홈).
 *   장면이 실제로 캔버스에 올라왔는지는 우물 캔버스 캡처의 '빈 색(#07090D)이 아닌 픽셀 비율'로 본다(WebGPU 어댑터 필요 — 맥 Metal 헤드리스).
 * - 옛 저장 데이터: 컷오버 전 prod(classic)가 쓰던 키와 모양 그대로 심고 새 화면이 읽는지 본다.
 *   sandlab.spill-daily.v1(ticks·mask 없는 옛 모양) · sandlab.daily.v1(옛 챌린지 {stars, ink}) · spill.v1.lvl.<id> · sandlab.mine · sandlab.voted.
 * 하나라도 틀리면 exit 1.
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT, launch } from './lib/deps.mjs'
import { serve } from './lib/server.mjs'

const argv = process.argv.slice(2)
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d)
const OUT = resolve(ROOT, opt('--out', 'out'))
const LIVE = opt('--base', '')
const JSON_OUT = opt('--json', '')

const PICK = ['LmIK_BTArCk', 'm71SWxdb9sc', 'rIxeixvTdzg', 'byF1YyDKtUo'] // src/ui-next/gallery/picks.ts 앞 4점(prod에 있는 팀 작품)
const GOLDEN_G = 'Y9zAeYOFYUuDGM8JRoYX7PQmpzwXZn8QCwA' // shareLinks.golden.test.ts — 바닥 sand 10줄 + 가운데 water
/** 골든셋 10: 해시 → 기대 진입(kind)·제목 일부·캔버스에 무언가 있는가 */
const GOLDEN = [
  { hash: `#s=${PICK[0]}`, kind: 'scene', title: 'molten cascade', drawn: true },
  { hash: `#s=${PICK[1]}`, kind: 'scene', title: 'deep drift', drawn: true },
  { hash: `#ref=x&s=${PICK[2]}`, kind: 'scene', title: 'Bramble Crown', drawn: true },
  { hash: `#s=${PICK[3]}&g=${GOLDEN_G}`, kind: 'scene', title: 'Descending Glowvines', drawn: true }, // s 우선
  { hash: `#g=${GOLDEN_G}`, kind: 'link', drawn: true },
  { hash: `#x=1&g=${GOLDEN_G}`, kind: 'link', drawn: true },
  { hash: '#s=abc12', kind: 'blank', drawn: false }, // 5자 → 갤러리 경로 아님
  { hash: '#g=!!!!', kind: 'blank', drawn: false }, // 문자 집합 밖
  { hash: '#g=AAAA', kind: 'blank', drawn: false }, // 디코드 실패
  { hash: '#s=zzzzzzzz404x', kind: 'blank', drawn: false }, // 없는 id → 빈 홈(오류 화면 아님)
]

const results = []
const fails = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) fails.push(`${name} ${detail}`)
}

const srv = LIVE ? null : await serve(OUT)
const BASE = LIVE || srv.base
const browser = await launch()
console.log(`base ${BASE}${LIVE ? ' (라이브)' : ` (out ${OUT})`}`)

async function ctx(seed = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await c.addInitScript((s) => {
    try {
      localStorage.setItem('sl.pourdemo.v1', '1') // 첫 방문 붓기 데모 끄기(빈 홈 캔버스가 비어 있어야 한다)
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v)
    } catch {}
  }, seed)
  // 라이브에서도 쓰기 0: GET·HEAD 아닌 /api/* 요청은 브라우저에서 끊는다(계측 비콘 포함)
  await c.route('**/api/**', (r) => (['GET', 'HEAD'].includes(r.request().method()) ? r.continue() : r.abort()))
  return c
}

/** 우물 캔버스에서 빈 색이 아닌 픽셀 비율(0~1) */
async function inkRatio(page) {
  const canvas = page.locator('.sl-well canvas').first()
  const png = await canvas.screenshot().catch(() => null)
  if (!png) return -1
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const cv = new OffscreenCanvas(img.width, img.height)
    const g = cv.getContext('2d')
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, img.width, img.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 7) + Math.abs(d[i + 1] - 9) + Math.abs(d[i + 2] - 13) > 24) n++
    return n / (d.length / 4)
  }, png.toString('base64'))
}

// ① 골든셋 10
console.log('\n== 골든셋 공유 링크 10개(홈)')
{
  const c = await ctx()
  const page = await c.newPage()
  const gpu = await page.goto(BASE + '/').then(() => page.evaluate(async () => !!(await navigator.gpu?.requestAdapter?.())))
  check('WebGPU 어댑터(캔버스 검사 전제)', gpu, gpu ? '' : 'QA_GPU_ARGS 확인')
  // 기준선: 해시 없는 빈 홈의 비율(우물 가장자리·유리 반사 등 UI 픽셀). 장면 = 기준선 + 1%p 넘게
  await page.goto(BASE + '/', { waitUntil: 'load' })
  await page.waitForSelector('.sl-well[data-ready]', { timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(700)
  const blank = await inkRatio(page)
  console.log(`  빈 홈 기준선 ${(blank * 100).toFixed(1)}%`)
  for (const g of GOLDEN) {
    const errors = []
    const onErr = (e) => errors.push(String(e).slice(0, 120))
    page.on('pageerror', onErr)
    await page.goto('about:blank')
    await page.goto(BASE + '/' + g.hash, { waitUntil: 'load' })
    await page.waitForFunction(() => {
      const k = document.querySelector('[data-sl-home]')?.getAttribute('data-sl-home')
      return k && k !== 'opening' && document.querySelector('.sl-well[data-ready]')
    }, null, { timeout: 30_000 }).catch(() => {})
    await page.waitForTimeout(700)
    const kind = await page.getAttribute('[data-sl-home]', 'data-sl-home').catch(() => null)
    const text = await page.locator('body').innerText().catch(() => '')
    const ink = await inkRatio(page)
    page.off('pageerror', onErr)
    const titleOk = !g.title || text.includes(g.title)
    const drawnOk = g.drawn ? ink > blank + 0.01 : ink >= 0 && ink < blank + 0.003
    check(`${g.hash.slice(0, 40)}${g.hash.length > 40 ? '…' : ''}`, kind === g.kind && titleOk && drawnOk && errors.length === 0, `kind=${kind}${g.title ? ` title=${titleOk}` : ''} ink=${(ink * 100).toFixed(1)}%${errors.length ? ' errors=' + errors.join('; ') : ''}`)
  }
  await c.close()
}

// ② 옛 저장 데이터
console.log('\n== 옛 저장 데이터(컷오버 전 prod 키·모양 그대로)')
{
  const DAY = 86_400_000
  const LAUNCH = Date.UTC(2026, 9, 9)
  const today = Math.max(1, Math.floor((Date.now() - LAUNCH) / DAY) + 1)
  // 옛 Spill 데일리: ticks·mask 없음. 어제·그제(연속) + 5일 전. 옛 챌린지 데일리: 10·11일 전 {stars, ink}
  const spill = { [today - 1]: { stars: 3, moves: 4 }, [today - 2]: { stars: 2, moves: 7 }, [today - 5]: { stars: 1, moves: 12 } }
  const legacy = { [today - 10]: { stars: 3, ink: 1200 }, [today - 11]: { stars: 1, ink: 3400 } }
  const solved = Object.keys(spill).length + Object.keys(legacy).length
  const seed = {
    'sandlab.spill-daily.v1': JSON.stringify(spill),
    'sandlab.daily.v1': JSON.stringify(legacy),
    'spill.v1.lvl.1-1': JSON.stringify({ v: 1, stars: 0b111, best: { moves: 3, ticks: 400, dug: 0 }, clears: 2 }),
    'spill.v1.lvl.1-2': JSON.stringify({ v: 1, stars: 0b001, best: { moves: 9, ticks: 900, dug: 0 }, clears: 1 }),
    'sandlab.mine': JSON.stringify([{ id: PICK[0], title: 'molten cascade', at: Date.now() - 86_400_000, seenVotes: 0, seenRemix: 0 }]),
    'sandlab.voted': JSON.stringify([PICK[1]]),
  }
  const c = await ctx(seed)
  const page = await c.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)))

  await page.goto(BASE + '/daily', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const count = await page.locator('.sl-st-count').innerText().catch(() => '')
  check('/daily 지층 병: 옛 두 키 합쳐 solved 수', count.toLowerCase().startsWith(`${solved} solved`), JSON.stringify(count))
  const run = await page.locator('.sl-st-run').innerText().catch((e) => 'ERR ' + e.message.slice(0, 80))
  check('/daily 연속(어제·그제 = 2-day run)', /2-day run/i.test(run), (run.match(/\d+-day run[^\n]*/i) ?? [run.slice(0, 200)])[0])

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const band = await page.getAttribute('.sl-strata', 'aria-label').catch(() => null)
  check('홈 지층 띠: N days', band === `${solved} days of daily puzzles`, JSON.stringify(band))

  await page.goto(BASE + '/play', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const s11 = await page.getAttribute('a.sl-pg-card[href="/play/1-1"]', 'data-stars').catch(() => null)
  const s12 = await page.getAttribute('a.sl-pg-card[href="/play/1-2"]', 'data-stars').catch(() => null)
  check('/play 별: spill.v1.lvl.1-1 = 3, 1-2 = 1', s11 === '3' && s12 === '1', `1-1=${s11} 1-2=${s12}`)

  await page.goto(BASE + '/gallery', { waitUntil: 'networkidle' })
  const yours = page.getByRole('tab', { name: /Yours/ }).or(page.getByRole('button', { name: /Yours/ })).first()
  await yours.click().catch(() => {})
  await page.waitForTimeout(2500)
  const wall = await page.locator('body').innerText().catch(() => '')
  check('/gallery Yours: sandlab.mine 장면이 보인다', wall.includes('molten cascade'), wall.includes('Nothing of yours') ? '빈 상태' : '')
  check('옛 저장 데이터 화면들 페이지 오류 0', errors.length === 0, errors.join('; '))
  await c.close()
}

// ③ prod 흔적
console.log('\n== prod 흔적(읽기 전용 안내·noindex 0)')
{
  const c = await ctx()
  const page = await c.newPage()
  for (const p of ['/', '/gallery', '/daily', '/play/1-1']) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    const ro = await page.locator('[data-sl-read-only]').count()
    const noindex = await page.locator('meta[name="robots"][content*="noindex"]').count()
    const shell = await page.evaluate(() => document.documentElement.className)
    check(`${p} 읽기 전용 안내 0 · noindex 0 · 새 셸`, ro === 0 && noindex === 0 && !!shell, `ro=${ro} noindex=${noindex} html.class=${JSON.stringify(shell.slice(0, 40))}`)
  }
  await c.close()
}

await browser.close()
srv?.close?.()
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, when: new Date().toISOString(), results, fails }, null, 2))
console.log(`\n${results.length - fails.length}/${results.length} 통과`)
process.exit(fails.length ? 1 : 0)
