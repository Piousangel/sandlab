/**
 * URL 공유 검증 — 실제 그림이 링크에 담기는가?
 *
 * 왜 필요한가:
 *   "URL 저장"은 이 제품에서 데모와 제품을 가르는 선이라고 선언했다.
 *   그런데 800×500 = 40만 셀이다. 흩뿌려진 그림은 RLE 런이 수천 개가 되고
 *   base64는 4/3배로 부푼다. 실제로 담기는지 재보지 않으면 그 선언은 희망사항이다.
 *
 * 실행: node scripts/verify-url.mjs
 */

const W = 800, H = 500
const URL_BUDGET = 6000

// ── urlState.ts 와 동일한 구현 (Node에는 btoa/atob가 전역으로 있음) ──
function toB64Url(bytes) {
  let s = ''
  const CH = 8192
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64Url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
function pushVarint(out, v) { while (v >= 0x80) { out.push((v & 0x7f) | 0x80); v >>>= 7 } out.push(v) }
function readVarint(b, p) {
  let v = 0, shift = 0
  for (;;) { const x = b[p.i++]; v |= (x & 0x7f) << shift; if ((x & 0x80) === 0) break; shift += 7 }
  return v >>> 0
}
function encodeGrid(cells, w, h) {
  const bytes = []
  pushVarint(bytes, w); pushVarint(bytes, h)
  let runMat = cells[0] & 0xffff, runLen = 0
  for (let i = 0; i < w * h; i++) {
    const m = cells[i] & 0xffff
    if (m === runMat) runLen++
    else { bytes.push(runMat & 0xff); pushVarint(bytes, runLen); runMat = m; runLen = 1 }
  }
  bytes.push(runMat & 0xff); pushVarint(bytes, runLen)
  return toB64Url(new Uint8Array(bytes))
}
function decodeGrid(s) {
  const b = fromB64Url(s), p = { i: 0 }
  const w = readVarint(b, p), h = readVarint(b, p)
  const cells = new Uint32Array(w * h)
  let i = 0
  while (p.i < b.length && i < w * h) {
    const mat = b[p.i++], len = readVarint(b, p)
    const end = Math.min(i + len, w * h)
    for (; i < end; i++) cells[i] = mat
  }
  return { cells, w, h }
}
function runCount(cells, n) {
  let runs = 1
  for (let i = 1; i < n; i++) if ((cells[i] & 0xffff) !== (cells[i - 1] & 0xffff)) runs++
  return runs
}

let s = 987654321
const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }

function blob(cells, cx, cy, r, mat) {
  for (let y = Math.max(0, cy - r); y < Math.min(H, cy + r); y++)
    for (let x = Math.max(0, cx - r); x < Math.min(W, cx + r); x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2
      if (d <= r * r && rnd() > (d / (r * r)) * 0.7) cells[y * W + x] = mat
    }
}

const cases = [
  {
    name: '빈 화면',
    build: () => new Uint32Array(W * H),
  },
  {
    name: '바닥에 모래 쌓임 (전형적 최종 상태)',
    build: () => {
      const c = new Uint32Array(W * H)
      for (let y = H - 120; y < H; y++) for (let x = 0; x < W; x++) c[y * W + x] = 7
      return c
    },
  },
  {
    name: '스크린샷 재현: 흩뿌린 붓질 40획',
    build: () => {
      const c = new Uint32Array(W * H)
      for (let i = 0; i < 40; i++) blob(c, Math.floor(rnd() * W), Math.floor(rnd() * H * 0.8), 10, 5)
      for (let y = H - 40; y < H; y++) for (let x = 0; x < W; x++) c[y * W + x] = 7
      return c
    },
  },
  {
    name: '최악: 원소 8종을 화면 전체에 난사 (200획)',
    build: () => {
      const c = new Uint32Array(W * H)
      for (let i = 0; i < 200; i++)
        blob(c, Math.floor(rnd() * W), Math.floor(rnd() * H), 14, 1 + Math.floor(rnd() * 8))
      return c
    },
  },
  {
    name: '지옥: 모든 셀이 무작위 (RLE 최악, 현실엔 없음)',
    build: () => {
      const c = new Uint32Array(W * H)
      for (let i = 0; i < W * H; i++) c[i] = Math.floor(rnd() * 8)
      return c
    },
  },
]

console.log(`\n격자 ${W}×${H} = ${(W * H / 1000).toFixed(0)}k 셀 · URL 예산 ${URL_BUDGET}자\n`)
console.log('시나리오'.padEnd(38) + 'RLE런'.padStart(9) + 'URL길이'.padStart(10) + '  판정')
console.log('─'.repeat(72))

let anyFail = false
for (const c of cases) {
  const cells = c.build()
  const runs = runCount(cells, W * H)
  const enc = encodeGrid(cells, W, H)
  const urlLen = 'https://sandlab.pages.dev/#g='.length + enc.length
  const fits = urlLen <= URL_BUDGET

  // 왕복 정확성 — 담기든 말든 무손실이어야 한다
  const back = decodeGrid(enc)
  let exact = back.w === W && back.h === H
  if (exact) for (let i = 0; i < W * H; i++) if ((cells[i] & 0xffff) !== back.cells[i]) { exact = false; break }

  if (!fits || !exact) anyFail = true
  console.log(
    c.name.padEnd(38) +
    String(runs).padStart(9) +
    String(urlLen).padStart(10) +
    '  ' + (fits ? 'OK' : '초과') + (exact ? '' : ' / 왕복깨짐!')
  )
}

console.log('\n결론:')
console.log('  RLE는 "덩어리로 그린 그림"에 강하고 "흩뿌린 그림"에 약하다.')
console.log('  초과 시 사용자는 공유를 못 한다 — 이 제품의 핵심 장치가 무력화된다.')
process.exit(anyFail ? 1 : 0)
