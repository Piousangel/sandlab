/**
 * Margolus 규칙의 CPU 레퍼런스 포트 + 불변식 검증.
 *
 * 왜 필요한가:
 *   헤드리스 크롬엔 WebGPU 어댑터가 없어서 WGSL을 직접 못 돌린다.
 *   하지만 이 프로젝트의 핵심 주장("Margolus는 질량 보존이 구조적으로 보장된다")은
 *   알고리즘의 성질이지 GPU의 성질이 아니다. 그러니 CPU로 같은 규칙을 포팅해
 *   불변식을 검증할 수 있다.
 *
 *   검증하는 것: 규칙 집합이 질량을 보존하는가 (셀 교대만 하는가).
 *   검증 못 하는 것: WGSL 문법/GPU 실행. 그건 실제 브라우저에서 봐야 한다.
 *
 * 실행: node scripts/verify-margolus.mjs
 */

const STATIC = 0, POWDER = 1, LIQUID = 2, GAS = 3
const WALL_SENTINEL = -1

// shader.ts 의 물질 속성과 동일하게 유지 (movement, density)
const M = {
  empty: { id: 0, mv: GAS,    d: 0 },
  wall:  { id: 1, mv: STATIC, d: 9 },
  sand:  { id: 2, mv: POWDER, d: 5 },
  water: { id: 3, mv: LIQUID, d: 3 },
  oil:   { id: 4, mv: LIQUID, d: 2 },
  smoke: { id: 5, mv: GAS,    d: 1 },
  stone: { id: 6, mv: STATIC, d: 8 },
}
const BY_ID = Object.fromEntries(Object.values(M).map((m) => [m.id, m]))
const mv = (id) => BY_ID[id].mv
const dens = (id) => BY_ID[id].d
const isMobile = (id) => mv(id) !== STATIC
const isStatic = (id) => mv(id) === STATIC
const isLiquid = (id) => mv(id) === LIQUID

// shader.ts 의 hash/rand01 와 동일한 PCG
function hash(v) {
  let s = Math.imul(v >>> 0, 747796405) + 2891336453
  s >>>= 0
  let w = Math.imul((s >>> ((s >>> 28) + 4)) ^ s, 277803737)
  w >>>= 0
  return ((w >>> 22) ^ w) >>> 0
}
const rand01 = (seed) => (hash(seed) & 0xffffff) / 0x1000000

// ── shader.ts 의 shouldSink 와 1:1 대응 ──
function shouldSink(top, bottom) {
  if (top === WALL_SENTINEL || bottom === WALL_SENTINEL) return false
  if (!isMobile(top)) return false
  if (isStatic(bottom)) return false
  return dens(top) > dens(bottom)
}

function step(grid, W, H, tick) {
  const o = tick % 2
  const out = grid.slice()
  const bw = Math.floor(W / 2) + 1
  const bh = Math.floor(H / 2) + 1

  const read = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? WALL_SENTINEL : out[y * W + x])
  const write = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) out[y * W + x] = v }

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const x0 = bx * 2 - o
      const y0 = by * 2 - o
      if (x0 + 1 < 0 || y0 + 1 < 0 || x0 >= W || y0 >= H) continue

      let a = read(x0, y0), b = read(x0 + 1, y0)
      let c = read(x0, y0 + 1), d = read(x0 + 1, y0 + 1)

      const seed = hash(bx * 1973 + by * 9277 + tick * 26699)

      // 수직 낙하
      if (shouldSink(a, c)) { const t = a; a = c; c = t }
      if (shouldSink(b, d)) { const t = b; b = d; d = t }

      // 대각 낙하
      const flip = rand01(seed + 31) < 0.5
      if (flip) {
        if (shouldSink(a, d) && !shouldSink(a, c)) { const t = a; a = d; d = t }
        if (shouldSink(b, c) && !shouldSink(b, d)) { const t = b; b = c; c = t }
      } else {
        if (shouldSink(b, c) && !shouldSink(b, d)) { const t = b; b = c; c = t }
        if (shouldSink(a, d) && !shouldSink(a, c)) { const t = a; a = d; d = t }
      }

      // 액체 수평 확산
      if (a !== WALL_SENTINEL && b !== WALL_SENTINEL) {
        if (isLiquid(a) && !shouldSink(a, c) && dens(a) > dens(b) && !isStatic(b)) {
          if (rand01(seed + 41) < 0.5) { const t = a; a = b; b = t }
        } else if (isLiquid(b) && !shouldSink(b, d) && dens(b) > dens(a) && !isStatic(a)) {
          if (rand01(seed + 42) < 0.5) { const t = b; b = a; a = t }
        }
      }
      if (c !== WALL_SENTINEL && d !== WALL_SENTINEL) {
        if (isLiquid(c) && dens(c) > dens(d) && !isStatic(d)) {
          if (rand01(seed + 43) < 0.5) { const t = c; c = d; d = t }
        } else if (isLiquid(d) && dens(d) > dens(c) && !isStatic(c)) {
          if (rand01(seed + 44) < 0.5) { const t = d; d = c; c = t }
        }
      }

      write(x0, y0, a); write(x0 + 1, y0, b)
      write(x0, y0 + 1, c); write(x0 + 1, y0 + 1, d)
    }
  }
  return out
}

// ── 검증 ──
const W = 64, H = 48
let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  O ${name}`) }
  else { fail++; console.log(`  X ${name} ${extra}`) }
}

function census(g) {
  const c = {}
  for (const v of g) c[v] = (c[v] || 0) + 1
  return c
}

console.log('\n=== 1. 질량 보존 (핵심 주장) ===')
{
  let g = new Int32Array(W * H).fill(M.empty.id)
  // 무작위로 모래/물/기름/연기/돌을 뿌린다
  let s = 12345
  const rnd = () => { s = hash(s); return (s & 0xffff) / 0x10000 }
  for (let i = 0; i < W * H; i++) {
    const r = rnd()
    if (r < 0.15) g[i] = M.sand.id
    else if (r < 0.25) g[i] = M.water.id
    else if (r < 0.30) g[i] = M.oil.id
    else if (r < 0.34) g[i] = M.smoke.id
    else if (r < 0.38) g[i] = M.stone.id
  }
  const before = census(g)
  for (let t = 0; t < 400; t++) g = step(g, W, H, t)
  const after = census(g)

  let allSame = true
  const diffs = []
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = before[id] || 0, a = after[id] || 0
    if (b !== a) { allSame = false; diffs.push(`${BY_ID[id]?.mv !== undefined ? id : id}: ${b}→${a}`) }
  }
  ok('400틱 후 모든 물질 개수가 정확히 동일', allSame, diffs.join(', '))
}

console.log('\n=== 2. 정적 물질은 절대 안 움직인다 ===')
{
  let g = new Int32Array(W * H).fill(M.empty.id)
  const stonePos = []
  for (let i = 0; i < 40; i++) {
    const p = (hash(i * 77) % (W * H))
    g[p] = M.stone.id
    stonePos.push(p)
  }
  for (let t = 0; t < 200; t++) g = step(g, W, H, t)
  ok('200틱 후 돌이 전부 제자리', stonePos.every((p) => g[p] === M.stone.id))
}

console.log('\n=== 3. 밀도 성층: 기름(2) < 물(3) < 모래(5) ===')
{
  let g = new Int32Array(W * H).fill(M.empty.id)
  // 일부러 거꾸로 쌓는다: 위=모래, 가운데=물, 아래=기름
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (y < H * 0.3) g[y * W + x] = M.sand.id
      else if (y < H * 0.6) g[y * W + x] = M.water.id
      else g[y * W + x] = M.oil.id
    }
  for (let t = 0; t < 3000; t++) g = step(g, W, H, t)

  const meanY = (id) => {
    let sum = 0, n = 0
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x] === id) { sum += y; n++ }
    return n ? sum / n : -1
  }
  const ys = meanY(M.sand.id), yw = meanY(M.water.id), yo = meanY(M.oil.id)
  console.log(`     평균 높이(클수록 아래): 기름 ${yo.toFixed(1)} / 물 ${yw.toFixed(1)} / 모래 ${ys.toFixed(1)}`)
  ok('모래가 물보다 아래로 가라앉음', ys > yw, `모래${ys.toFixed(1)} vs 물${yw.toFixed(1)}`)
  ok('물이 기름보다 아래로 가라앉음', yw > yo, `물${yw.toFixed(1)} vs 기름${yo.toFixed(1)}`)
}

console.log('\n=== 4. 모래 더미가 좌우 대칭으로 퍼진다 (편향 없음) ===')
{
  let g = new Int32Array(W * H).fill(M.empty.id)
  const cx = W >> 1
  for (let i = 0; i < 500; i++) g[Math.floor(i / 4) * W + cx + (i % 4) - 2] = M.sand.id
  for (let t = 0; t < 1500; t++) g = step(g, W, H, t)
  let left = 0, right = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (g[y * W + x] === M.sand.id) { if (x < cx) left++; else if (x > cx) right++ }
  const bias = Math.abs(left - right) / Math.max(1, left + right)
  console.log(`     왼쪽 ${left} / 오른쪽 ${right} → 편향 ${(bias * 100).toFixed(1)}%`)
  ok('좌우 편향 15% 미만', bias < 0.15, `편향 ${(bias * 100).toFixed(1)}%`)
}

console.log('\n=== 5. 모래가 바닥에 실제로 쌓인다 (안 사라짐) ===')
{
  let g = new Int32Array(W * H).fill(M.empty.id)
  for (let x = 0; x < W; x++) g[5 * W + x] = M.sand.id
  const n0 = g.filter((v) => v === M.sand.id).length
  for (let t = 0; t < 500; t++) g = step(g, W, H, t)
  const n1 = g.filter((v) => v === M.sand.id).length
  let bottomRow = 0
  for (let x = 0; x < W; x++) if (g[(H - 1) * W + x] === M.sand.id) bottomRow++
  console.log(`     모래 ${n0} → ${n1}, 최하단 줄에 ${bottomRow}/${W}`)
  ok('모래 개수 불변', n0 === n1, `${n0}→${n1}`)
  ok('바닥에 도달', bottomRow > W * 0.8, `${bottomRow}/${W}`)
}

console.log(`\n${'='.repeat(50)}\n  ${pass} 통과 / ${fail} 실패\n${'='.repeat(50)}\n`)
process.exit(fail ? 1 : 0)
