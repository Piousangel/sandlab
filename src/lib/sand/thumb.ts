/**
 * 썸네일 생성.
 *
 * 왜 canvas.toDataURL()을 안 쓰는가:
 *   WebGPU 캔버스는 스왑체인 텍스처가 프레젠트 후 무효화될 수 있어서
 *   toDataURL()이 빈 이미지를 뱉을 수 있다. 브라우저·타이밍에 따라 달라진다.
 *   readback()으로 셀을 읽어 2D 캔버스에 직접 그리면 결정적이다.
 *
 * 왜 썸네일이 중요한가:
 *   Powder Toy 커뮤니티가 명시적으로 지목한 것 — 썸네일 매력도가 FP 진입을 가른다.
 *   갤러리에서 썸네일은 기능이 아니라 그 항목의 전부다.
 */

import { hexToRgb, type Material } from './materials'

/** 갤러리 카드 크기. 너무 크면 D1 행이 무겁고, 너무 작으면 뭘 그렸는지 안 보인다. */
export const THUMB_W = 420
export const THUMB_H = 210

/**
 * 셀 격자 → PNG base64 (data: 접두사 없음).
 * 발광 물질은 밝기를 살짝 올려 썸네일에서도 불이 불처럼 보이게 한다
 * (블룸 전체를 재현하진 않는다 — 2D 캔버스에서 그건 과하다).
 */
export async function makeThumb(
  cells: Uint32Array<ArrayBuffer>,
  w: number,
  h: number,
  mats: Material[],
): Promise<string> {
  const rgb = mats.map((m) => hexToRgb(m.color))
  const em = mats.map((m) => m.emissive)

  const img = new ImageData(THUMB_W, THUMB_H)
  const d = img.data

  // 박스 다운샘플 — 최근접 샘플링은 모래알이 튀어서 노이즈처럼 보인다.
  const sx = w / THUMB_W
  const sy = h / THUMB_H

  for (let ty = 0; ty < THUMB_H; ty++) {
    const y0 = Math.floor(ty * sy)
    const y1 = Math.max(y0 + 1, Math.floor((ty + 1) * sy))
    for (let tx = 0; tx < THUMB_W; tx++) {
      const x0 = Math.floor(tx * sx)
      const x1 = Math.max(x0 + 1, Math.floor((tx + 1) * sx))

      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const m = cells[y * w + x] & 0xffff
          const c = rgb[m] ?? rgb[0]
          const k = 1 + (em[m] ?? 0) * 0.5 // 발광체는 살짝 밝게
          r += c[0] * k
          g += c[1] * k
          b += c[2] * k
          n++
        }
      }
      const i = (ty * THUMB_W + tx) * 4
      d[i + 0] = Math.min(255, (r / n) * 255)
      d[i + 1] = Math.min(255, (g / n) * 255)
      d[i + 2] = Math.min(255, (b / n) * 255)
      d[i + 3] = 255
    }
  }

  const cv = document.createElement('canvas')
  cv.width = THUMB_W
  cv.height = THUMB_H
  cv.getContext('2d')!.putImageData(img, 0, 0)

  const blob: Blob = await new Promise((res, rej) =>
    cv.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'),
  )
  const buf = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  const CH = 8192
  for (let i = 0; i < buf.length; i += CH) s += String.fromCharCode(...buf.subarray(i, i + CH))
  return btoa(s)
}

/** 장면이 사실상 비어 있는가 — 빈 화면 업로드로 갤러리가 오염되는 걸 막는다. */
export function isBlank(cells: Uint32Array<ArrayBuffer>, n: number): boolean {
  let filled = 0
  const step = Math.max(1, Math.floor(n / 20000)) // 표본만 봐도 충분하다
  for (let i = 0; i < n; i += step) if ((cells[i] & 0xffff) !== 0) filled++
  return filled / Math.ceil(n / step) < 0.002
}
