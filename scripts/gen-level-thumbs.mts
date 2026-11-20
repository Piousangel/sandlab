// /play 전시실 레벨 썸네일(리디자인 P8) — 레벨 정의 → 시작 보드 PNG(160×240, 팔레트 PNG).
//   npx tsx scripts/gen-level-thumbs.mts           # public/ui-next/levels/<id>.png + levels.json
//   npx tsx scripts/gen-level-thumbs.mts --check   # 레벨이 바뀌었는데 안 구웠으면 exit 1(levels.json의 lh 대조)
// 픽셀은 src/ui-next/play/thumbPixels.ts(순수 함수, 테스트 있음). 라이브 캔버스·WebGPU 없음 — 결정적.
// 새 레벨을 더하거나 맵을 고치면 다시 돌린다(play.test.ts가 lh 불일치·파일 누락·15KB 초과를 잡는다).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { LEVELS } from '../src/lib/spill/levels/index.ts'
import { levelHash } from '../src/lib/spill/level/hash.ts'
import { THUMB_H, THUMB_W, thumbPixels } from '../src/ui-next/play/thumbPixels.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/ui-next/levels')
const MAX_BYTES = 15 * 1024

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const body = Buffer.concat([head.subarray(4), Buffer.from(data)])
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([head.subarray(0, 4), body, tail])
}

/** RGB 바이트 → 팔레트 PNG(색 ≤ 256). 필터 0(팔레트 PNG는 필터 없음이 보통 가장 작다). */
function encodePng(rgb: Uint8Array, w: number, h: number): Buffer {
  const index = new Map<number, number>()
  const pal: number[] = []
  const rows = Buffer.alloc((w + 1) * h)
  for (let y = 0; y < h; y++) {
    rows[y * (w + 1)] = 0
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      const key = (rgb[i] << 16) | (rgb[i + 1] << 8) | rgb[i + 2]
      let k = index.get(key)
      if (k === undefined) {
        k = pal.length / 3
        if (k >= 256) throw new Error('more than 256 colours')
        index.set(key, k)
        pal.push(rgb[i], rgb[i + 1], rgb[i + 2])
      }
      rows[y * (w + 1) + 1 + x] = k
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 3 // palette
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', Uint8Array.from(pal)),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ])
}

const check = process.argv.includes('--check')
const manifestPath = resolve(outDir, 'levels.json')
type Manifest = Record<string, { lh: string; bytes: number }>

if (check) {
  const m: Manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
  const stale = LEVELS.filter((l) => m[l.id]?.lh !== levelHash(l) || !existsSync(resolve(outDir, `${l.id}.png`)))
  if (stale.length) {
    console.error(`level thumbnails stale: ${stale.map((l) => l.id).join(', ')} — run npx tsx scripts/gen-level-thumbs.mts`)
    process.exit(1)
  }
  console.log(`level thumbnails OK (${LEVELS.length})`)
} else {
  mkdirSync(outDir, { recursive: true })
  const manifest: Manifest = {}
  for (const l of LEVELS) {
    const png = encodePng(thumbPixels(l), THUMB_W, THUMB_H)
    if (png.length > MAX_BYTES) throw new Error(`${l.id}: ${png.length} B > ${MAX_BYTES} B`)
    writeFileSync(resolve(outDir, `${l.id}.png`), png)
    manifest[l.id] = { lh: levelHash(l), bytes: png.length }
    console.log(`${l.id}\t${png.length} B`)
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n')
}
