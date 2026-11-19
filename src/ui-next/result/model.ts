/**
 * 새 결과 화면(리디자인 P5)의 순수 계산 — 문구·배치·공유 경로. DOM 없음(vitest node 환경에서 그대로 검사).
 * 레벨 id는 화면 문구에 넣지 않는다(데일리 풀 9개라 id가 주기를 드러낸다 — P2 공유 규칙과 같은 이유).
 */
import { computeScale, type Scale } from '@/lib/spill/render/canvas'
import { formatMoves, formatSecs } from '@/lib/spill/play/score'
import { dayNumber } from '@/lib/spill/client/daily'
import type { DailyStanding } from '../shell/spillTypes'

/** 공유 PNG 한 장의 상한(계획서 P5 기준). 넘으면 보드 배율을 한 단계씩 낮춰 다시 그린다. */
export const PNG_BUDGET = 250 * 1024

/** "상위 N%" 줄을 보여 줄 최소 표본 — 이보다 적으면 퍼센트가 흔들려 거짓말이 된다(줄을 그리지 않는다). hist.ts MIN_SAMPLE과 같은 50(06시 기획 v1). */
export const MIN_STANDING_SAMPLE = 50

export type StarParts = { clear: boolean; gems: boolean; par: boolean; count: number }

export interface Caption {
  /** 모노 이름표 — "Daily No.43 · World 1" / "World 1". */
  kicker: string
  title: string
  starsLabel: string
  parts: { label: string; got: boolean }[]
  stat: string
}

export function caption(o: { name: string; world: number; moves: number; ticks: number; stars: StarParts; daily: { n: number } | null; solution: boolean }): Caption {
  const world = `World ${o.world}`
  const s = Math.max(0, Math.min(3, o.stars.count))
  return {
    kicker: o.daily ? `Daily No.${o.daily.n} · ${world}` : world,
    title: o.solution ? 'Solution replay' : o.name,
    starsLabel: `${s} of 3 stars`,
    parts: [
      { label: 'Clear', got: o.stars.clear },
      { label: 'Gems', got: o.stars.gems },
      { label: 'Par', got: o.stars.par },
    ],
    stat: `${formatMoves(o.moves)} · ${formatSecs(o.ticks)}`,
  }
}

/** "오늘 클리어한 사람 중 상위 N%" — 데이터가 없거나 믿을 수 없으면 null(줄 자체를 렌더하지 않는다, 가짜 수치 금지). */
export function standingLine(s: DailyStanding | null | undefined): string | null {
  if (!s) return null
  const { topPercent: p, sample } = s
  if (!Number.isFinite(p) || !Number.isFinite(sample) || sample < MIN_STANDING_SAMPLE || p <= 0 || p > 100) return null
  return `Top ${Math.max(1, Math.round(p))}% of today’s clears`
}

/** 보조 행동 문구. S4: 데일리 재도전은 연습(공식 기록 = 그날 첫 클리어). */
export function practiceLabel(daily: boolean, stars: number): string {
  if (daily) return stars >= 3 ? 'Practice again' : 'Practice for 3 stars'
  return stars >= 3 ? 'Play again' : 'Retry for 3 stars'
}

/** 데일리 아래 한 줄(S4를 문구로 명시). 레벨 모드는 null. */
export function officialNote(daily: { official: boolean } | null): string | null {
  if (!daily) return null
  return daily.official
    ? 'Your first clear stays today’s official record.'
    : 'Practice run. Your first clear stays today’s official record — sharing copies that result.'
}

/**
 * 모바일 결과 화면 세로 예산(보드 말고 나머지) — 헤더 48 · 위 여백 16 · 못·줄 27 · 액자 매트 16 · 간격 16 · 캡션 ≤ 170 · 간격 16 · stratum 20 · 간격 16 · Share image 52.
 * 보드 높이 = 화면 높이 - 이 값이면 Share image가 첫 화면 안에 든다(360x640 독립 리뷰 지적, 테스트·Playwright로 확인).
 */
export const MOBILE_STACK = 48 + 16 + 27 + 16 + 16 + 170 + 16 + 20 + 16 + 52

/** 결과 화면 액자 속 보드 크기 — 플레이 보드와 같은 정수 장치 픽셀 배율. 모바일은 세로로 쌓고, 데스크톱(≥900)은 액자 왼쪽·캡션 오른쪽. */
export function resultBoardScale(vw: number, vh: number, dpr: number, desk: boolean): Scale {
  if (desk) return computeScale(400, Math.max(240, vh - 56 - 150), dpr)
  return computeScale(Math.min(vw - 80, 320), Math.max(150, vh - MOBILE_STACK), dpr)
}

export type ShareFormat = 'square' | 'wide'
export const SHARE_FORMATS: Record<ShareFormat, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: 'Square' },
  wide: { w: 1200, h: 630, label: 'Wide' },
}

export interface ShareLayout {
  w: number
  h: number
  /** 보드 배율(셀당 px, 정수). */
  k: number
  /** 액자 바깥 사각형(매트 포함). */
  frame: { x: number; y: number; w: number; h: number; mat: number; r: number }
  nail: { x: number; y: number; r: number }
  /** 걸이줄이 액자에 닿는 두 점. */
  wire: [{ x: number; y: number }, { x: number; y: number }]
  /** 오른쪽 글 칸. */
  text: { x: number; w: number; kickerY: number; titleY: number; beadsY: number; statY: number; noteY: number; siteY: number; kicker: number; title: number; bead: number; stat: number; note: number; site: number }
}

const BOARD_W = 160
const BOARD_H = 240

/**
 * 공유 이미지 배치. k = 보드 배율(셀당 px) — 기본(1:1은 3, OG는 2)에서 시작해 PNG가 예산을 넘으면 낮춘다.
 * 액자는 왼쪽(못·걸이줄과 함께 벽에 걸림), 글(Daily No.N · 유리알 · sandlab.app)은 오른쪽.
 */
export function shareLayout(format: ShareFormat, k = defaultScale(format)): ShareLayout {
  const { w, h } = SHARE_FORMATS[format]
  const sq = format === 'square'
  const mat = sq ? 20 : 16
  const fw = BOARD_W * k + mat * 2
  const fh = BOARD_H * k + mat * 2
  const nailGap = sq ? 90 : 48
  const left = sq ? 96 : 104
  // 세로 가운데(못·줄 높이까지 포함한 덩어리)
  const blockH = nailGap + fh
  const top = Math.round((h - blockH) / 2)
  const fy = top + nailGap
  const fx = left + Math.round(((sq ? 528 : 368) - fw) / 2)
  const textX = sq ? 680 : 560
  const textW = w - textX - (sq ? 72 : 80)
  const s = sq ? 1 : 0.84
  return {
    w,
    h,
    k,
    frame: { x: fx, y: fy, w: fw, h: fh, mat, r: sq ? 22 : 18 },
    nail: { x: fx + fw / 2, y: top + 10, r: sq ? 9 : 7 },
    wire: [
      { x: fx + Math.round(fw * 0.12), y: fy },
      { x: fx + fw - Math.round(fw * 0.12), y: fy },
    ],
    text: {
      x: textX,
      w: textW,
      kickerY: Math.round(h * (sq ? 0.33 : 0.3)),
      titleY: Math.round(h * (sq ? 0.42 : 0.46)),
      beadsY: Math.round(h * (sq ? 0.5 : 0.58)),
      statY: Math.round(h * (sq ? 0.58 : 0.7)),
      noteY: Math.round(h * (sq ? 0.58 : 0.7)) + Math.round(sq ? 56 : 44),
      siteY: fy + fh - 6,
      kicker: Math.round(26 * s),
      title: Math.round(96 * s),
      bead: Math.round(26 * s),
      stat: Math.round(34 * s),
      note: Math.round(22 * s),
      site: Math.round(30 * s),
    },
  }
}

export function defaultScale(format: ShareFormat): number {
  return format === 'square' ? 3 : 2
}

/*
 * 공유 이미지 스포일러 가림(리디자인 P7, 팀 결정 — DECISIONS 2026-11-20 P7).
 * 데일리는 전 세계가 같은 날 같은 퍼즐이라 종료 보드(파낸 자리·물줄기)가 그날의 정답 힌트가 된다.
 * → 데일리 공유 이미지는 그 퍼즐의 UTC 날짜 안에서는 보드를 모자이크(VEIL_BLOCK 셀 평균)로 가리고, 목표(항아리) 칸만 선명하게 둔다
 *   (채운 결과는 보이되 동선은 안 보이게). 다음 UTC 날부터는 원본. 유리알·No.N·수·시간은 언제나 선명.
 * → 레벨 모드(/play)는 늘 원본 — 레벨은 고정 공략이라 같은 날 경쟁이 없고 공략 글(/play/:id/guide)도 이미 공개돼 있다.
 */

/**
 * 모자이크 한 칸(셀). 160×240 보드 → 10×15칸. 8셀(20×30칸)은 실측(1-3 Two Pots)에서 파낸 두 자리·물줄기 두 기둥이 칸 색으로 여전히 읽혀 16으로 키웠다.
 * 칸 평균은 다시 보드 전체 평균 쪽으로 VEIL_FLATTEN만큼 당긴다 — 칸끼리 대비를 줄여 '어디를 팠나'가 덜 읽히게.
 */
export const VEIL_BLOCK = 16
export const VEIL_FLATTEN = 0.5
/** 보드 셀 = 타일 × 4(레벨 rect는 타일 단위, 40×60). */
const CELLS_PER_TILE = 4

export type CellRect = { x: number; y: number; w: number; h: number }

/** 이 데일리 이미지를 가려야 하는가 — 데일리이고, 지금(UTC)이 그 퍼즐의 날짜(또는 그 전)일 때. */
export function veilBoard(daily: { n: number } | null, nowMs: number): boolean {
  return !!daily && dayNumber(nowMs) <= daily.n
}

/** 선명하게 남길 칸 = 목표(fill·reach·ignite·protect) 칸. 'bad'(닿으면 안 되는 곳)는 동선 힌트라 가린다. */
export function keepRects(targets: { kind: string; rect: readonly number[] }[]): CellRect[] {
  return targets
    .filter((t) => t.kind !== 'bad')
    .map(({ rect: [x, y, w, h] }) => ({ x: x * CELLS_PER_TILE, y: y * CELLS_PER_TILE, w: w * CELLS_PER_TILE, h: h * CELLS_PER_TILE }))
}

/**
 * RGBA 픽셀(보드 w×h)을 block 칸 평균으로 모자이크한다(제자리 수정). keep 칸 안 픽셀은 원본 그대로.
 * 순수 함수 — 캔버스 없이 테스트한다(shareImage가 getImageData/putImageData로 감싼다).
 */
export function mosaicPixels(px: Uint8ClampedArray, w: number, h: number, block: number, keep: CellRect[], flatten = 0): Uint8ClampedArray {
  const src = px.slice()
  const all = [0, 0, 0, 0]
  for (let i = 0; i < src.length; i++) all[i % 4] += src[i]
  const px4 = Math.max(1, src.length / 4)
  const mean = all.map((s) => s / px4)
  const inKeep = (x: number, y: number) => keep.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)
  for (let by = 0; by < h; by += block) {
    for (let bx = 0; bx < w; bx += block) {
      const ye = Math.min(h, by + block)
      const xe = Math.min(w, bx + block)
      const sum = [0, 0, 0, 0]
      let n = 0
      for (let y = by; y < ye; y++)
        for (let x = bx; x < xe; x++) {
          const i = (y * w + x) * 4
          for (let c = 0; c < 4; c++) sum[c] += src[i + c]
          n++
        }
      for (let y = by; y < ye; y++)
        for (let x = bx; x < xe; x++) {
          if (inKeep(x, y)) continue
          const i = (y * w + x) * 4
          for (let c = 0; c < 4; c++) px[i + c] = Math.round((sum[c] / n) * (1 - flatten) + mean[c] * flatten)
        }
    }
  }
  return px
}

/** 이미지 안 한 줄 설명(가렸을 때만). */
export const VEIL_NOTE = 'Board hidden until tomorrow (UTC)'

export type ShareRoute = 'share-file' | 'download' | 'copy-text'

/** Web Share Level 2(files) → 파일 공유, 아니면 데스크톱(정밀 포인터)은 다운로드, 그 밖(파일 공유 없는 폰)은 텍스트 복사. */
export function shareRoute(env: { canShareFiles: boolean; finePointer: boolean }): ShareRoute {
  if (env.canShareFiles) return 'share-file'
  return env.finePointer ? 'download' : 'copy-text'
}

/** 파일 이름 — 레벨 id 없이(데일리는 번호, 레벨 모드는 이름 슬러그). */
export function shareFileName(daily: { n: number } | null, name: string, format: ShareFormat): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'level'
  return `${daily ? `sandlab-daily-${daily.n}` : `sandlab-spill-${slug}`}-${format}.png`
}
