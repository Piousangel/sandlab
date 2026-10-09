/**
 * WGSL — Margolus 낙사 시뮬레이션 + 분리 가능 블룸.
 *
 * Margolus를 쓰는 이유:
 *   낙사는 자명하게 병렬화되지 않는다. 두 셀이 같은 빈칸으로 떨어지려 하면
 *   경쟁 조건이 생겨 질량이 복제·소멸한다. Margolus는 격자를 2×2 블록으로 자르고
 *   매 틱 원점을 (0,0)↔(1,1)로 옮긴다. 한 블록의 4칸을 한 스레드가 통째로 소유하므로
 *   경쟁 조건이 원천 불가능하고, 원점 교대로 정보가 블록 경계를 넘는다.
 *   → 질량 보존이 구조적으로 보장 (scripts/verify-margolus.mjs 에서 7/7 검증).
 *
 * 블룸을 격자 해상도에서 분리 가능 블러로 하는 이유:
 *   프래그먼트에서 이웃을 박스 샘플링하면 O(캔버스픽셀 × r²)이라 캔버스를 키우면
 *   비용이 터진다. 격자 해상도에서 H·V 두 패스로 하면 O(W·H·2r) 이고 캔버스 크기와
 *   무관하다. 발광이 없으면 불이 '주황색 흙'처럼 보인다 — 이게 품질의 단일 최대 변수.
 *
 * 셀 인코딩: u32 = matId(하위 16비트) | lifeRemaining(상위 16비트)
 * props 레이아웃: 물질당 vec4 2개
 *   props[m*2]   = (r, g, b, movement + density*10 + lifespan*100)
 *   props[m*2+1] = (emissive, 0, 0, 0)
 */

const COMMON = /* wgsl */ `
struct Params {
  width : u32, height : u32, offset : u32, tick : u32,
  matCount : u32, brushX : i32, brushY : i32, brushR : i32,
  brushMat : u32, brushPX : i32, brushPY : i32, recording : u32,
  paintEmptyOnly : u32, _p0 : u32, _p1 : u32, _p2 : u32,
};

const MAX_RX : u32 = 4u;
const SELF   : u32 = 0xffffu;
const EMPTY  : u32 = 0u;
const WALL_SENTINEL : u32 = 0xfffffffeu;

fn matOf(cell : u32) -> u32 { return cell & 0xffffu; }
fn lifeOf(cell : u32) -> u32 { return (cell >> 16u) & 0xffffu; }
fn mk(mat : u32, life : u32) -> u32 { return (mat & 0xffffu) | ((life & 0xffffu) << 16u); }

fn hash(v : u32) -> u32 {
  var s = v * 747796405u + 2891336453u;
  var w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
fn rand01(seed : u32) -> f32 { return f32(hash(seed) & 0xffffffu) / f32(0x1000000u); }
`

export const SIM_WGSL = /* wgsl */ `
${COMMON}

@group(0) @binding(0) var<storage, read>       src   : array<u32>;
@group(0) @binding(1) var<storage, read_write> dst   : array<u32>;
@group(0) @binding(2) var<uniform>             P     : Params;
@group(0) @binding(3) var<storage, read>       props : array<vec4<f32>>;
@group(0) @binding(4) var<storage, read>       rx    : array<vec4<u32>>;
// 재료별로 paint가 실제 채운 셀 수 — 챌린지 잉크(엔진 readInk). 제자리 붓기도 비용이 든다.
@group(0) @binding(5) var<storage, read_write> inkCount : array<atomic<u32>>;

fn packedOf(mat : u32) -> u32 { return u32(props[mat * 2u].w); }
fn movementOf(mat : u32) -> u32 { return packedOf(mat) % 10u; }
fn densityOf(mat : u32)  -> u32 { return (packedOf(mat) / 10u) % 10u; }
fn lifespanOf(mat : u32) -> u32 { return packedOf(mat) / 100u; }

fn isStatic(mat : u32) -> bool { return movementOf(mat) == 0u; }
fn isLiquid(mat : u32) -> bool { return movementOf(mat) == 2u; }
fn isMobile(mat : u32) -> bool { return movementOf(mat) != 0u; }

fn idx(x : i32, y : i32) -> u32 { return u32(y) * P.width + u32(x); }
fn inBounds(x : i32, y : i32) -> bool {
  return x >= 0 && y >= 0 && x < i32(P.width) && y < i32(P.height);
}
fn readCell(x : i32, y : i32) -> u32 {
  if (!inBounds(x, y)) { return WALL_SENTINEL; }
  return src[idx(x, y)];
}

// 낙하 판정용 무게. 빈칸은 기체(밀도 1)와 가장 가벼운 액체(밀도 2) 사이(1.5)로 친다 —
// 밀도 0 그대로 비교하면 기체(1)가 빈칸 쪽으로 '가라앉는다'(2026-10-09 실크롬에서 증기가
// 아래로 내려가는 것 확인한 버그). 정수로 쓰려고 밀도×2, 빈칸=3.
fn weightOf(mat : u32) -> u32 {
  if (mat == EMPTY) { return 3u; }
  return densityOf(mat) * 2u;
}

// 무거운 게 가벼운 걸 뚫고 내려간다. 기체는 빈칸보다 가벼워서 빈칸과 자리를 바꾸며 위로 뜬다.
fn shouldSink(top : u32, bottom : u32) -> bool {
  if (top == WALL_SENTINEL || bottom == WALL_SENTINEL) { return false; }
  let tm = matOf(top);
  let bm = matOf(bottom);
  if (!isMobile(tm)) { return false; }
  if (isStatic(bm))  { return false; }
  return weightOf(tm) > weightOf(bm);
}

fn react(a : u32, b : u32, seed : u32) -> vec2<u32> {
  if (a == WALL_SENTINEL || b == WALL_SENTINEL) { return vec2<u32>(a, b); }
  let am = matOf(a);
  let bm = matOf(b);
  if (am == EMPTY) { return vec2<u32>(a, b); }
  for (var j : u32 = 0u; j < MAX_RX; j = j + 1u) {
    let e = rx[am * MAX_RX + j];
    let chance = f32(e.w) / 65535.0;
    if (chance <= 0.0) { continue; }
    if (e.x != bm) { continue; }
    if (rand01(seed + j * 7919u) >= chance) { continue; }
    var becomeId = e.y;
    var otherId  = e.z;
    if (becomeId == SELF) { becomeId = am; }
    if (otherId  == SELF) { otherId  = am; }
    return vec2<u32>(mk(becomeId, lifespanOf(becomeId)), mk(otherId, lifespanOf(otherId)));
  }
  return vec2<u32>(a, b);
}

fn age(cell : u32) -> u32 {
  if (cell == WALL_SENTINEL) { return cell; }
  let m = matOf(cell);
  if (lifespanOf(m) == 0u) { return cell; }
  let l = lifeOf(cell);
  if (l <= 1u) { return mk(EMPTY, 0u); }
  return mk(m, l - 1u);
}

@compute @workgroup_size(8, 8)
fn simulate(@builtin(global_invocation_id) gid : vec3<u32>) {
  let o  = i32(P.offset);
  let x0 = i32(gid.x) * 2 - o;
  let y0 = i32(gid.y) * 2 - o;
  if (x0 + 1 < 0 || y0 + 1 < 0 || x0 >= i32(P.width) || y0 >= i32(P.height)) { return; }

  var a = readCell(x0, y0);
  var b = readCell(x0 + 1, y0);
  var c = readCell(x0, y0 + 1);
  var d = readCell(x0 + 1, y0 + 1);

  let seed = hash(u32(gid.x) * 1973u + u32(gid.y) * 9277u + P.tick * 26699u);

  a = age(a); b = age(b); c = age(c); d = age(d);

  var r = react(a, c, seed + 11u); a = r.x; c = r.y;
  r = react(c, a, seed + 12u); c = r.x; a = r.y;
  r = react(b, d, seed + 13u); b = r.x; d = r.y;
  r = react(d, b, seed + 14u); d = r.x; b = r.y;
  r = react(a, b, seed + 15u); a = r.x; b = r.y;
  r = react(b, a, seed + 16u); b = r.x; a = r.y;
  r = react(c, d, seed + 17u); c = r.x; d = r.y;
  r = react(d, c, seed + 18u); d = r.x; c = r.y;

  if (shouldSink(a, c)) { let t = a; a = c; c = t; }
  if (shouldSink(b, d)) { let t = b; b = d; d = t; }

  let flip = rand01(seed + 31u) < 0.5;
  if (flip) {
    if (shouldSink(a, d) && !shouldSink(a, c)) { let t = a; a = d; d = t; }
    if (shouldSink(b, c) && !shouldSink(b, d)) { let t = b; b = c; c = t; }
  } else {
    if (shouldSink(b, c) && !shouldSink(b, d)) { let t = b; b = c; c = t; }
    if (shouldSink(a, d) && !shouldSink(a, c)) { let t = a; a = d; d = t; }
  }

  if (a != WALL_SENTINEL && b != WALL_SENTINEL) {
    let am = matOf(a); let bm = matOf(b);
    if (isLiquid(am) && !shouldSink(a, c) && densityOf(am) > densityOf(bm) && !isStatic(bm)) {
      if (rand01(seed + 41u) < 0.5) { let t = a; a = b; b = t; }
    } else if (isLiquid(bm) && !shouldSink(b, d) && densityOf(bm) > densityOf(am) && !isStatic(am)) {
      if (rand01(seed + 42u) < 0.5) { let t = b; b = a; a = t; }
    }
  }
  if (c != WALL_SENTINEL && d != WALL_SENTINEL) {
    let cm = matOf(c); let dm = matOf(d);
    if (isLiquid(cm) && densityOf(cm) > densityOf(dm) && !isStatic(dm)) {
      if (rand01(seed + 43u) < 0.5) { let t = c; c = d; d = t; }
    } else if (isLiquid(dm) && densityOf(dm) > densityOf(cm) && !isStatic(cm)) {
      if (rand01(seed + 44u) < 0.5) { let t = d; d = c; c = t; }
    }
  }

  if (inBounds(x0, y0))         { dst[idx(x0, y0)]         = a; }
  if (inBounds(x0 + 1, y0))     { dst[idx(x0 + 1, y0)]     = b; }
  if (inBounds(x0, y0 + 1))     { dst[idx(x0, y0 + 1)]     = c; }
  if (inBounds(x0 + 1, y0 + 1)) { dst[idx(x0 + 1, y0 + 1)] = d; }
}

// 점과 선분 사이 거리의 제곱.
fn distSqToSegment(p : vec2<f32>, a : vec2<f32>, b : vec2<f32>) -> f32 {
  let ab = b - a;
  let denom = dot(ab, ab);
  var t = 0.0;
  if (denom > 0.0001) { t = clamp(dot(p - a, ab) / denom, 0.0, 1.0); }
  let d = p - (a + ab * t);
  return dot(d, d);
}

// 브러시는 별도 패스 — Margolus 블록 소유권을 깨면 안 되므로 시뮬 후에 찍는다.
// 원이 아니라 캡슐(이전 위치 → 현재 위치 선분)로 찍는 이유:
//   프레임당 원 하나만 찍으면, 마우스가 프레임 사이에 50px 움직였을 때 그 구간이
//   통째로 빈다. 실제로 획이 점선처럼 끊겨 보였다.
@compute @workgroup_size(8, 8)
fn paint(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (P.brushMat == 0xffffffffu) { return; }
  let x = i32(gid.x);
  let y = i32(gid.y);
  if (!inBounds(x, y)) { return; }

  let p  = vec2<f32>(f32(x), f32(y));
  let a  = vec2<f32>(f32(P.brushPX), f32(P.brushPY));
  let b  = vec2<f32>(f32(P.brushX),  f32(P.brushY));
  let r  = f32(P.brushR);
  let d2 = distSqToSegment(p, a, b);
  if (d2 > r * r) { return; }

  // 가장자리를 확률적으로 갉아 딱딱한 윤곽을 없앤다 (딱 떨어지는 원은 인공적)
  let edge = d2 / max(1.0, r * r);
  if (rand01(hash(u32(x) * 3571u + u32(y) * 6151u + P.tick * 97u)) < edge * 0.7) { return; }
  // 챌린지 모드: 레벨 구조물·기존 재료를 덮어 지우지 못하게 빈 칸에만 칠한다.
  if (P.paintEmptyOnly == 1u && matOf(dst[idx(x, y)]) != EMPTY) { return; }
  atomicAdd(&inkCount[P.brushMat], 1u);
  dst[idx(x, y)] = mk(P.brushMat, u32(props[P.brushMat * 2u].w) / 100u);
}
`

/**
 * 발광 시드 + 분리 가능 가우시안 블러.
 * light 버퍼는 격자 해상도. 캔버스를 키워도 비용이 안 는다.
 */
export const BLOOM_WGSL = /* wgsl */ `
${COMMON}

@group(0) @binding(0) var<storage, read>       cells : array<u32>;
@group(0) @binding(1) var<storage, read_write> lightA : array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> lightB : array<vec4<f32>>;
@group(0) @binding(3) var<uniform>             P     : Params;
@group(0) @binding(4) var<storage, read>       props : array<vec4<f32>>;

const R : i32 = 7;

fn wgt(d : i32) -> f32 {
  let x = f32(d) / f32(R);
  return exp(-x * x * 2.5);
}

// 1) 각 셀의 자체 발광을 시드
@compute @workgroup_size(8, 8)
fn seed(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= i32(P.width) || y >= i32(P.height)) { return; }
  let i = u32(y) * P.width + u32(x);
  let cell = cells[i];
  let m = matOf(cell);
  let em = props[m * 2u + 1u].x;
  var col = props[m * 2u].xyz;
  // 수명 있는 발광체는 사그라들며 어두워진다 (불이 살아있어 보이게)
  let span = u32(props[m * 2u].w) / 100u;
  var k = 1.0;
  if (span > 0u) { k = f32(lifeOf(cell)) / f32(span); }
  // 셀마다 위상 다른 미세 flicker — 발광 후광이 정적이지 않고 '숨쉰다'(불·용암이 살아있게).
  let flick = 0.9 + 0.1 * sin(f32(P.tick) * 0.35 + f32(i) * 0.013);
  lightA[i] = vec4<f32>(col * em * k * flick, 0.0);
}

// 2) 수평 블러
@compute @workgroup_size(8, 8)
fn blurH(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= i32(P.width) || y >= i32(P.height)) { return; }
  var acc = vec3<f32>(0.0);
  var wsum = 0.0;
  for (var d : i32 = -R; d <= R; d = d + 1) {
    let sx = clamp(x + d, 0, i32(P.width) - 1);
    let w = wgt(d);
    acc += lightA[u32(y) * P.width + u32(sx)].xyz * w;
    wsum += w;
  }
  lightB[u32(y) * P.width + u32(x)] = vec4<f32>(acc / wsum, 0.0);
}

// 3) 수직 블러
@compute @workgroup_size(8, 8)
fn blurV(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= i32(P.width) || y >= i32(P.height)) { return; }
  var acc = vec3<f32>(0.0);
  var wsum = 0.0;
  for (var d : i32 = -R; d <= R; d = d + 1) {
    let sy = clamp(y + d, 0, i32(P.height) - 1);
    let w = wgt(d);
    acc += lightB[u32(sy) * P.width + u32(x)].xyz * w;
    wsum += w;
  }
  lightA[u32(y) * P.width + u32(x)] = vec4<f32>(acc / wsum, 0.0);
}
`

export const RENDER_WGSL = /* wgsl */ `
${COMMON}

@group(0) @binding(0) var<storage, read> cells : array<u32>;
@group(0) @binding(1) var<uniform>       P     : Params;
@group(0) @binding(2) var<storage, read> props : array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> light : array<vec4<f32>>;
@group(0) @binding(4) var wmTex : texture_2d<f32>;
@group(0) @binding(5) var wmSamp : sampler;

struct VSOut { @builtin(position) pos : vec4<f32>, @location(0) uv : vec2<f32> };

@vertex
fn vs(@builtin(vertex_index) i : u32) -> VSOut {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -3.0), vec2<f32>(-1.0, 1.0), vec2<f32>(3.0, 1.0));
  var o : VSOut;
  o.pos = vec4<f32>(p[i], 0.0, 1.0);
  o.uv  = vec2<f32>((p[i].x + 1.0) * 0.5, (1.0 - p[i].y) * 0.5);
  return o;
}

// ACES 근사 — 발광이 1.0을 넘을 때 흰색으로 뭉개지지 않고 필름처럼 롤오프된다.
// 이게 없으면 불 중심이 그냥 흰 덩어리가 된다.
fn tonemap(x : vec3<f32>) -> vec3<f32> {
  let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4<f32> {
  let gx = in.uv.x * f32(P.width);
  let gy = in.uv.y * f32(P.height);
  let x = u32(clamp(gx, 0.0, f32(P.width) - 1.0));
  let y = u32(clamp(gy, 0.0, f32(P.height) - 1.0));
  let i = y * P.width + x;

  let cell = cells[i];
  let mat  = matOf(cell);
  var col  = props[mat * 2u].xyz;
  let em   = props[mat * 2u + 1u].x;
  let span = u32(props[mat * 2u].w) / 100u;

  // 수명 있는 물질은 사그라든다
  var k = 1.0;
  if (span > 0u) { k = 0.30 + 0.70 * f32(lifeOf(cell)) / f32(span); }

  // 불 색온도 구배: 갓 생긴 심지는 백열, 사그라들며 원래 색(적열)으로.
  // 발광+수명 물질(불)만 — 단일 주황 대신 뜨겁고 입체적인 불꽃.
  var col2 = col;
  if (em > 1.5 && span > 0u) {
    let heat = f32(lifeOf(cell)) / f32(span);
    col2 = mix(col, vec3<f32>(1.0, 0.93, 0.72), heat * heat * 0.5);
  }

  // 셀마다 미세한 명도 편차 — 단색 덩어리로 안 보이게 (질감)
  let n = rand01(hash(x * 6151u + y * 3571u)) * 0.10 - 0.05;
  var base = col2 * k * (1.0 + n);

  // 빈 공간은 배경. 그 위에 주변 발광이 얹힌다.
  if (mat == EMPTY) { base = vec3<f32>(0.027, 0.031, 0.043); }

  // 자체 발광 + 주변에서 들어온 빛 (발광이 품질의 단일 최대 변수 — 넉넉히)
  let glow = light[i].xyz;
  var lit = base + base * em * 1.9 + glow * 1.7;

  // 은은한 비네트 — 중앙 발광으로 시선을 모으고 클립에 영화적 깊이. (1200x600 종횡비 보정)
  let dc = (in.uv - vec2<f32>(0.5)) * vec2<f32>(2.0, 1.0);
  let vig = 1.0 - dot(dc, dc) * 0.16;
  var outc = tonemap(lit) * vig;

  // 녹화 중에만 우하단 워터마크 — 공유되는 모든 클립이 곧 광고. (P.recording != 0)
  if (P.recording != 0u) {
    // UV 영역 종횡비를 텍스처(512x96=5.33:1)에 맞춘다. 2:1 캔버스에서 영역 폭 0.289 →
    // 물리폭 346.8px, 5.33:1이려면 물리높이 65px = uv 0.108 → wmMin.y = 0.964-0.108.
    // (안 맞추면 글자가 가로로 ~1.75배 늘어난다.)
    let wmMin = vec2<f32>(0.695, 0.856);
    let wmMax = vec2<f32>(0.984, 0.964);
    if (in.uv.x >= wmMin.x && in.uv.x <= wmMax.x && in.uv.y >= wmMin.y && in.uv.y <= wmMax.y) {
      let luv = (in.uv - wmMin) / (wmMax - wmMin);
      // textureSampleLevel(explicit LOD)은 미분을 안 써서 비균일 제어흐름(uv 범위 if)에서 합법.
      // textureSample을 여기서 쓰면 셰이더 모듈이 무효화돼 렌더 파이프라인 전체가 죽는다(캔버스 blank).
      let wm = textureSampleLevel(wmTex, wmSamp, luv, 0.0);
      outc = mix(outc, wm.rgb, wm.a * 0.9);
    }
  }
  return vec4<f32>(outc, 1.0);
}
`
