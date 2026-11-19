/**
 * 공유 이미지(리디자인 P5) — 결과 화면이 복사해 둔 실제 종료 보드(160×240 캔버스)를 벽에 건 액자로 그려 PNG로 만든다.
 * 1:1(1080) · OG(1200×630) 두 포맷만. 이미지 안: 액자 보드 + Daily No.N(레벨 모드는 이름) + 유리알 + sandlab.app. 개인 정보 없음.
 * 색은 tokens.css 값(캔버스는 CSS 변수를 못 읽으니 같은 hex를 쓴다 — 바꾸면 둘 다).
 * PNG가 PNG_BUDGET(250KB)을 넘으면 보드 배율을 한 단계 낮춰 다시 그린다(평면 Bone·정수 배율 픽셀이라 보통 첫 판에 들어간다).
 */
import { PNG_BUDGET, VEIL_BLOCK, VEIL_FLATTEN, VEIL_NOTE, defaultScale, mosaicPixels, shareLayout, type CellRect, type ShareFormat } from './model'

const BONE = '#F4ECDD'
const INK = '#2A2118'
const INK_2 = '#5E5040'
const KILN = '#14110E'
const TUBE_LINE = 'rgba(42, 33, 24, 0.58)'
const TUBE_BG = 'rgba(255, 255, 255, 0.42)'

export interface ShareCard {
  kicker: string
  title: string
  beads: number
  stat: string
  /** P7 스포일러 가림 — 있으면 보드를 모자이크(keep 칸만 선명)하고 VEIL_NOTE 한 줄을 넣는다. 데일리 그날만(model.veilBoard). */
  veil?: { keep: CellRect[] } | null
}

/** 보드 캔버스 → 모자이크한 사본(원본 캔버스는 건드리지 않는다). 2d 컨텍스트가 없으면 null(호출자가 보드를 아예 안 그린다 — 원본 노출 금지). */
export function veiledBoard(board: HTMLCanvasElement, keep: CellRect[]): HTMLCanvasElement | null {
  const c = document.createElement('canvas')
  c.width = board.width
  c.height = board.height
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(board, 0, 0)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  mosaicPixels(img.data, c.width, c.height, VEIL_BLOCK, keep, VEIL_FLATTEN)
  ctx.putImageData(img, 0, 0)
  return c
}

function fonts(): { display: string; mono: string } {
  const cs = getComputedStyle(document.documentElement)
  const display = cs.getPropertyValue('--sl-font-display').trim() || 'ui-sans-serif, system-ui, sans-serif'
  const mono = cs.getPropertyValue('--sl-font-mono').trim() || 'ui-monospace, Menlo, monospace'
  return { display, mono }
}

/** 이미지에 쓰는 서체를 미리 받는다(swap 전이면 폴백으로 그려진다). 실패해도 폴백으로 그린다. */
export async function loadShareFonts(): Promise<void> {
  const f = fonts()
  try {
    await Promise.all([document.fonts.load(`700 96px ${f.display}`), document.fonts.load(`400 34px ${f.display}`), document.fonts.load(`500 26px ${f.mono}`)])
  } catch {
    /* 폴백 서체로 그린다 */
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 유리알 하나 — 찬 알은 ink 원에 하이라이트 구멍(아이콘 star-full과 같은 모양), 빈 알은 유리 윤곽(star-empty). */
function bead(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, full: boolean) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  if (full) {
    ctx.fillStyle = INK
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx - r * 0.36, cy - r * 0.36, r * 0.2, 0, Math.PI * 2)
    ctx.fillStyle = BONE
    ctx.fill()
  } else {
    ctx.fillStyle = TUBE_BG
    ctx.fill()
    ctx.lineWidth = Math.max(2, r * 0.16)
    ctx.strokeStyle = TUBE_LINE
    ctx.stroke()
  }
}

/** 글이 칸보다 넓으면 글자 크기를 줄인다(레벨 이름이 긴 경우). */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, maxW: number): number {
  let s = size
  for (; s > 12; s -= 2) {
    ctx.font = `${weight} ${s}px ${family}`
    if (ctx.measureText(text).width <= maxW) break
  }
  return s
}

export function drawShareCard(board: HTMLCanvasElement, card: ShareCard, format: ShareFormat, k = defaultScale(format)): HTMLCanvasElement {
  const L = shareLayout(format, k)
  const c = document.createElement('canvas')
  c.width = L.w
  c.height = L.h
  const ctx = c.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('2d context unavailable')
  const f = fonts()

  // 벽(Bone 한 면) — 결이나 그라데이션은 넣지 않는다(PNG 용량·스크린샷 한 장의 또렷함)
  ctx.fillStyle = BONE
  ctx.fillRect(0, 0, L.w, L.h)

  // 걸이줄(못 → 액자 위 두 점) + 못
  const { frame: F, nail: N } = L
  ctx.strokeStyle = INK_2
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(L.wire[0].x, L.wire[0].y)
  ctx.lineTo(N.x, N.y)
  ctx.lineTo(L.wire[1].x, L.wire[1].y)
  ctx.stroke()

  // 액자 그림자(아래로 한 겹, 블러 없음) → 액자(kiln 매트) → 보드(정수 배율, 보간 없음)
  ctx.fillStyle = 'rgba(42, 33, 24, 0.16)'
  roundRect(ctx, F.x + 6, F.y + 12, F.w, F.h, F.r)
  ctx.fill()
  ctx.fillStyle = KILN
  roundRect(ctx, F.x, F.y, F.w, F.h, F.r)
  ctx.fill()
  ctx.imageSmoothingEnabled = false
  // 데일리 그날(P7): 모자이크 사본만 그린다. 사본을 못 만들면 보드 자리를 kiln 매트로 비운다(원본 노출 금지)
  const art = card.veil ? veiledBoard(board, card.veil.keep) : board
  if (art) ctx.drawImage(art, 0, 0, art.width, art.height, F.x + F.mat, F.y + F.mat, board.width * L.k, board.height * L.k)

  ctx.beginPath()
  ctx.arc(N.x, N.y, N.r, 0, Math.PI * 2)
  ctx.fillStyle = INK
  ctx.fill()
  ctx.beginPath()
  ctx.arc(N.x - N.r * 0.3, N.y - N.r * 0.3, N.r * 0.32, 0, Math.PI * 2)
  ctx.fillStyle = '#8C7B66'
  ctx.fill()

  // 오른쪽 캡션
  const T = L.text
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = INK_2
  ctx.font = `500 ${T.kicker}px ${f.mono}`
  ctx.fillText(card.kicker.toUpperCase(), T.x, T.kickerY, T.w)

  ctx.fillStyle = INK
  const ts = fitFont(ctx, card.title, 700, T.title, f.display, T.w)
  ctx.font = `700 ${ts}px ${f.display}`
  ctx.fillText(card.title, T.x, T.titleY)

  const r = T.bead
  for (let i = 0; i < 3; i++) bead(ctx, T.x + r + i * (r * 2 + r * 0.8), T.beadsY - r, r, i < card.beads)

  ctx.fillStyle = INK_2
  ctx.font = `400 ${T.stat}px ${f.display}`
  ctx.fillText(card.stat, T.x, T.statY, T.w)

  // 가렸다는 한 줄 — 기본 배율에선 stat과 sandlab.app 사이에 자리가 있다(테스트). 예산 초과로 배율을 낮춰 자리가 없으면 생략
  if (card.veil && T.noteY < T.siteY - T.site - 8) {
    ctx.font = `500 ${T.note}px ${f.mono}`
    ctx.fillText(VEIL_NOTE, T.x, T.noteY, T.w)
  }

  ctx.fillStyle = INK
  ctx.font = `500 ${T.site}px ${f.mono}`
  ctx.fillText('sandlab.app', T.x, T.siteY, T.w)
  return c
}

function toBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'))
}

/** PNG ≤ PNG_BUDGET이 될 때까지 보드 배율을 낮춘다(최소 1). 마지막 판은 넘더라도 돌려준다(실측은 결과 화면이 data 속성으로 남긴다). */
export async function renderSharePng(board: HTMLCanvasElement, card: ShareCard, format: ShareFormat): Promise<Blob> {
  let blob: Blob | null = null
  for (let k = defaultScale(format); k >= 1; k--) {
    blob = await toBlob(drawShareCard(board, card, format, k))
    if (blob.size <= PNG_BUDGET) return blob
  }
  return blob as Blob
}
