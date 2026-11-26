// 데일리 지층 병 첫 화면 실측(카드 #123 D2). out/ prod 빌드를 `npx wrangler dev --port 8799 --local`로 띄운 뒤:
//   node scripts/qa/daily-jar-capture.cjs <출력 폴더> [--base http://localhost:8799]
// 픽스처(fresh·history·solvedToday) × 390·1440을 reduced-motion으로 찍고(전체 페이지 + 390은 첫 화면 844만 자른 *-fold.jpg),
// 병(.sl-st-jar)·보드(canvas) bbox와 '병이 첫 화면 안인가'를 JSON으로 출력한다. 기록 키 'sandlab.spill-daily.v1'은 읽기 픽스처로만 쓴다(형식 무변경).
const { chromium } = require('playwright')
const args = process.argv.slice(2)
const OUT = args[0]
const BASE = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8799'
if (!OUT) { console.error('usage: daily-jar-capture.cjs <outDir> [--base url]'); process.exit(2) }
const LAUNCH = Date.UTC(2026, 9, 9)
const n = Math.floor((Date.now() - LAUNCH) / 864e5) + 1
const hist = {}
for (let d = n - 9; d < n; d++) if (d !== n - 4) hist[d] = { stars: 1 + (d % 3), moves: 3, ticks: 300, mask: [1, 3, 7][d % 3] }
const fixtures = { fresh: null, history: hist, solvedToday: { ...hist, [n]: { stars: 2, moves: 5, ticks: 400, mask: 3 } } }
;(async () => {
  const b = await chromium.launch()
  const out = {}
  for (const [fx, map] of Object.entries(fixtures)) for (const [w, h] of [[390, 844], [1440, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
    await ctx.addInitScript((m) => { try { localStorage.clear(); if (m) localStorage.setItem('sandlab.spill-daily.v1', JSON.stringify(m)) } catch {} }, map)
    const p = await ctx.newPage()
    await p.goto(`${BASE}/daily`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(1500)
    const m = await p.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { x: Math.round(q.x), y: Math.round(q.y + scrollY), w: Math.round(q.width), h: Math.round(q.height) } }
      return { jar: r('.sl-st-jar'), board: r('canvas'), docH: document.documentElement.scrollHeight }
    })
    out[`${fx}-${w}`] = { ...m, vh: h, jarInFirstScreen: m.jar ? m.jar.y + m.jar.h <= h : null }
    await p.screenshot({ path: `${OUT}/daily-${fx}-${w}.jpg`, type: 'jpeg', quality: 72, fullPage: true })
    if (w === 390) await p.screenshot({ path: `${OUT}/daily-${fx}-${w}-fold.jpg`, type: 'jpeg', quality: 72 })
    await ctx.close()
  }
  console.log(JSON.stringify({ day: n, ...out }, null, 1))
  await b.close()
})()
