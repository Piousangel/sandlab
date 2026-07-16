/**
 * URL 상태 — 데모와 제품을 가르는 선.
 *
 * 왜 1일차인가:
 *   GPU 시뮬 데모는 무한히 많고 전부 죽는다. 살아남은 건(Sandspiel 등)
 *   "내가 만든 게 남는다"를 붙인 것들뿐이다. 그게 없으면 한 번 보고 닫는다.
 *
 * 서버가 없다: 격자를 RLE → deflate → base64url 로 URL에 담는다.
 *
 * 측정된 현실 (scripts/verify-url.mjs, 800×500 = 40만 셀):
 *   빈 화면 / 바닥에 쌓인 모래        →      45자   OK
 *   전형적 그림 (붓질 40획)           →   4,760자   OK  (RLE 단독이면 13,663자로 초과였다)
 *   많이 그린 그림 (200획)            →  37,974자   초과
 *   난사 (600획)                     → 114,723자   초과
 *
 *   즉 deflate가 2.9배를 줄여 전형적 그림을 살렸지만, 많이 그리면 어떤 압축으로도
 *   URL에 안 들어간다. 40만 셀은 물리적으로 URL 크기가 아니다.
 *
 * 진짜 해법(예정): 픽셀이 아니라 '붓질'을 저장한다.
 *   시뮬 RNG가 결정적(블록·틱 해시)이므로 같은 붓질을 같은 틱에 재생하면
 *   정확히 같은 장면이 재현된다. 붓질 1000개 ≈ 8KB → deflate → ~1-2KB. 항상 담긴다.
 *   덤으로 링크를 열면 그림이 스스로 그려진다 — 정지 장면보다 훨씬 공유된다.
 */

import { EMPTY_ID } from './materials'

/** 실무적으로 안전한 URL 길이 상한 */
export const URL_BUDGET = 6000

/** 포맷 버전. 인코딩을 바꾸면 올린다 — 옛 링크를 조용히 깨뜨리지 않기 위해. */
const V = 1

function toB64Url(bytes: Uint8Array): string {
  let s = ''
  const CH = 8192 // 인자 스프레드 한도 회피
  for (let i = 0; i < bytes.length; i += CH) {
    s += String.fromCharCode(...bytes.subarray(i, i + CH))
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function pushVarint(out: number[], v: number) {
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80)
    v >>>= 7
  }
  out.push(v)
}

function readVarint(b: Uint8Array, p: { i: number }): number {
  let v = 0
  let shift = 0
  for (;;) {
    const byte = b[p.i++]
    v |= (byte & 0x7f) << shift
    if ((byte & 0x80) === 0) break
    shift += 7
  }
  return v >>> 0
}

/** 네이티브 압축. 의존성 0. 모든 WebGPU 지원 브라우저는 이것도 지원한다. */
async function deflate(b: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw')
  const w = cs.writable.getWriter()
  w.write(b as unknown as BufferSource)
  w.close()
  const buf = await new Response(cs.readable).arrayBuffer()
  return new Uint8Array(buf)
}

async function inflate(b: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const w = ds.writable.getWriter()
  w.write(b as unknown as BufferSource)
  w.close()
  const buf = await new Response(ds.readable).arrayBuffer()
  return new Uint8Array(buf)
}

/**
 * 격자 → RLE 바이트.
 * lifetime은 버린다 — 복원 시 물질 기본 수명으로 재생성되므로 저장할 이유가 없다.
 */
function rleEncode(cells: Uint32Array<ArrayBuffer>, w: number, h: number): Uint8Array {
  const bytes: number[] = []
  pushVarint(bytes, V)
  pushVarint(bytes, w)
  pushVarint(bytes, h)

  let runMat = cells[0] & 0xffff
  let runLen = 0
  for (let i = 0; i < w * h; i++) {
    const m = cells[i] & 0xffff
    if (m === runMat) {
      runLen++
    } else {
      bytes.push(runMat & 0xff)
      pushVarint(bytes, runLen)
      runMat = m
      runLen = 1
    }
  }
  bytes.push(runMat & 0xff)
  pushVarint(bytes, runLen)
  return new Uint8Array(bytes)
}

function rleDecode(b: Uint8Array): { cells: Uint32Array<ArrayBuffer>; w: number; h: number } | null {
  const p = { i: 0 }
  const ver = readVarint(b, p)
  if (ver !== V) return null
  const w = readVarint(b, p)
  const h = readVarint(b, p)
  if (w <= 0 || h <= 0 || w > 4096 || h > 4096) return null

  const cells = new Uint32Array(w * h).fill(EMPTY_ID)
  let i = 0
  while (p.i < b.length && i < w * h) {
    const mat = b[p.i++]
    const len = readVarint(b, p)
    const end = Math.min(i + len, w * h)
    for (; i < end; i++) cells[i] = mat
  }
  return { cells, w, h }
}

export type ShareResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'too-large'; size: number; budget: number }

export async function buildShareUrl(
  cells: Uint32Array<ArrayBuffer>,
  w: number,
  h: number,
): Promise<ShareResult> {
  const packed = await deflate(rleEncode(cells, w, h))
  const url = `${location.origin}${location.pathname}#g=${toB64Url(packed)}`
  if (url.length > URL_BUDGET) {
    return { ok: false, reason: 'too-large', size: url.length, budget: URL_BUDGET }
  }
  return { ok: true, url }
}

export async function readShareUrl(): Promise<{
  cells: Uint32Array<ArrayBuffer>
  w: number
  h: number
} | null> {
  if (typeof location === 'undefined') return null
  const m = location.hash.match(/[#&]g=([A-Za-z0-9\-_]+)/)
  if (!m) return null
  try {
    return rleDecode(await inflate(fromB64Url(m[1])))
  } catch {
    return null
  }
}
