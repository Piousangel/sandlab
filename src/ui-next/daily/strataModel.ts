/**
 * /daily 지층 병(리디자인 P7, S3)의 순수 계산 — 층 두께·결·테두리·광맥·날짜 지시선 위치. DOM 없음(vitest node에서 그대로 검사).
 *
 * 입력은 `readStrata`(src/lib/strata.ts) 결과 그대로다. 여기서 정하는 규칙(DECISIONS 2026-11-20 P7):
 * - 층 색 = STRATA_CYCLE(그날 레벨 재료와 무관, P2). 별 수 = 두께 + 결(알갱이 점 밀도).
 * - 결측일 = 얇은 '공백층'(점선 + 빗금, 채움 없음). **오늘 미해결 = '아직'**(점선 윤곽만, 층 두께 자리 예약) — 결측과 다른 모양·다른 문구.
 * - 첫 기록 이전의 결측일은 그리지 않는다(병은 처음 푼 날부터 쌓인다). 그래서 0층 = 오늘 '아직' 하나뿐인 빈 병.
 * - Bone 위 대비 3:1 미만인 재료색(sand·seed·acid 등)은 층 경계에 ink 1px 선(EDGE). 재료색은 글자에 쓰지 않는다.
 * - 광맥(vein) = 실제 기록에서 연속으로 푼 날이 VEINS(7·14·30…)에 닿은 바로 그 날. 가짜·예상 광맥 없음.
 */
import type { Stratum } from '@/lib/strata'
import { PRESETS } from '@/lib/sand/materials'

export type LayerKind = 'solved' | 'missed' | 'pending'

export interface JarLayer {
  dayNumber: number
  dateUTC: string
  kind: LayerKind
  material: Stratum['material']
  /** 0~3. 푼 날은 최소 1(클리어 = 별 1). */
  stars: number
  /** 재료색(그림 전용 — 글자 금지). */
  color: string
  /** Bone(유리) 위 3:1 미만이라 ink 1px 경계가 필요한가. */
  edge: boolean
  /** 연속 기록이 광맥 수(7·14…)에 닿은 날이면 그 수. */
  vein: number | null
  today: boolean
  /** 병 안쪽 좌표(위 = 0). top은 층 윗면 기준선, h는 두께. */
  top: number
  h: number
}

export interface JarLabel {
  /** 지시선이 닿는 층 가운데 y(병 안쪽 좌표). */
  anchor: number
  /** 겹침을 피해 옮긴 글자 y. */
  y: number
  kind: LayerKind
  date: string
  text: string
  stars: number | null
  dashed: boolean
}

export interface Jar {
  layers: JarLayer[]
  labels: JarLabel[]
  /** 창(최근 30일) 안에서 푼 날 수. */
  solvedDays: number
  /** 오늘(또는 오늘 아직이면 어제)까지 연속으로 푼 날 수. */
  streak: number
  /** 다음 광맥까지 — streak ≥ 1일 때만(실제 기록 기준). */
  nextVein: { at: number; toGo: number } | null
  todayKind: 'solved' | 'pending'
  /** 전 기간에 한 번이라도 풀었나 — 빈 상태 문구(신규 vs 오래 쉼)를 가른다. */
  everSolved: boolean
  /** 그려진 층 중 광맥이 있나 — 범례에 광맥 설명을 붙인다. */
  veinsShown: boolean
}

/** 광맥 기준 — 연속으로 푼 날 수. */
export const VEINS = [7, 14, 30, 60, 100, 200, 365] as const
/** 별 수별 두께(px, 축소 전). 공백층은 얇게, '아직'은 2별 두께 자리를 비워 둔다. */
export const BASE_H = { missed: 4, pending: 11, 1: 7, 2: 10, 3: 13 } as const
export const MIN_H = 2
/** 지시선 글자 최소 간격(px) — 11px 모노 라벨 한 줄 + 여유. */
export const LABEL_GAP = 18
export const MAX_LABELS = 5

const BONE = '#F4ECDD'
/** 병 안 유리(rgba(255,255,255,.38))를 Bone 위에 합성한 색 — 층이 실제로 놓이는 바탕. */
export const GLASS_ON_BONE = mix(BONE, '#FFFFFF', 0.38)
export const INK = '#2A2118'

function hex(c: string): [number, number, number] {
  const h = c.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}
function mix(a: string, b: string, t: number): string {
  const A = hex(a)
  const B = hex(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
function lum(c: string): number {
  const [r, g, b] = hex(c).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

export function materialColor(slug: string): string {
  return PRESETS.find((m) => m.slug === slug)?.color ?? '#E8C87A'
}

/** 비텍스트 대비(WCAG 1.4.11) 3:1 미만이면 경계선이 필요하다. */
export function needsEdge(color: string): boolean {
  return contrast(color, GLASS_ON_BONE) < 3
}

const mmdd = (iso: string) => iso.slice(5)

/**
 * 연속 기록·광맥 — all = #1(또는 가능한 가장 오래된 날)부터 오늘까지 readStrata 전체.
 * 오늘이 아직이면 오늘은 연속을 끊지 않는다(어제까지 센다).
 */
export function runs(all: Stratum[], today: number): { veinAt: Map<number, number>; streak: number } {
  const veinAt = new Map<number, number>()
  let run = 0
  for (const s of all) {
    if (s.missed) {
      if (s.dayNumber === today) continue
      run = 0
      continue
    }
    run++
    if ((VEINS as readonly number[]).includes(run)) veinAt.set(s.dayNumber, run)
  }
  return { veinAt, streak: run }
}

/**
 * 병 만들기. all = readStrata(storage, today, today)(전 기간 — 광맥·연속 계산용), 그중 최근 window일만 그린다.
 * innerH = 병 안쪽 높이 — 층 합이 넘치면 비율로 줄인다(최소 MIN_H).
 */
export function buildJar(all: Stratum[], today: number, innerH: number, window = 30): Jar {
  const { veinAt, streak } = runs(all, today)
  // 첫 기록(전 기간 기준 — 창 기준이면 오래 쉰 사용자가 신규처럼 보인다) 이전의 결측일은 그리지 않는다. 오늘은 늘 남긴다
  const firstSolved = all.find((s) => !s.missed)?.dayNumber ?? today
  const shown = all.filter((s) => s.dayNumber > today - window && s.dayNumber <= today && (s.dayNumber >= firstSolved || s.dayNumber === today))

  const raw = shown.map((s) => {
    const isToday = s.dayNumber === today
    const kind: LayerKind = !s.missed ? 'solved' : isToday ? 'pending' : 'missed'
    const stars = kind === 'solved' ? Math.max(1, s.stars) : 0
    const color = materialColor(s.material)
    return {
      dayNumber: s.dayNumber,
      dateUTC: s.dateUTC,
      kind,
      material: s.material,
      stars,
      color,
      edge: kind === 'solved' && needsEdge(color),
      vein: kind === 'solved' ? (veinAt.get(s.dayNumber) ?? null) : null,
      today: isToday,
      base: kind === 'solved' ? BASE_H[stars as 1 | 2 | 3] : BASE_H[kind],
    }
  })
  const sum = raw.reduce((a, r) => a + r.base, 0)
  const k = sum > innerH ? innerH / sum : 1
  // 아래(오래된 날)부터 쌓는다
  let y = innerH
  const layers: JarLayer[] = raw.map(({ base, ...r }) => {
    const h = Math.max(MIN_H, Math.round(base * k * 10) / 10)
    y -= h
    return { ...r, top: y, h }
  })

  const solvedDays = layers.filter((l) => l.kind === 'solved').length
  const nextAt = VEINS.find((v) => v > streak)
  const todayLayer = layers.find((l) => l.today)
  return {
    layers,
    labels: pickLabels(layers, innerH),
    solvedDays,
    streak,
    nextVein: streak >= 1 && nextAt ? { at: nextAt, toGo: nextAt - streak } : null,
    everSolved: all.some((s) => !s.missed),
    veinsShown: layers.some((l) => l.vein),
    todayKind: todayLayer?.kind === 'solved' ? 'solved' : 'pending',
  }
}

/**
 * 날짜 지시선 — 위(오늘)부터 MAX_LABELS-1개 + 맨 아래(가장 오래된 층) 하나. 이어진 결측일은 한 줄로 묶는다.
 * 글자는 LABEL_GAP 간격으로 위로 밀고, 병 위로 넘치면 아래로 되민다.
 */
export function pickLabels(layers: JarLayer[], innerH: number): JarLabel[] {
  type Cand = { layer: JarLayer; anchor: number; text: string; date: string }
  const cands: Cand[] = []
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    if (l.kind === 'missed') {
      // 이어진 결측 묶음의 가장 최근 날에서만 한 줄
      if (i < layers.length - 1 && layers[i + 1].kind === 'missed') continue
      let j = i
      while (j > 0 && layers[j - 1].kind === 'missed') j--
      const n = i - j + 1
      const top = l.top
      const bottom = layers[j].top + layers[j].h
      cands.push({
        layer: l,
        anchor: (top + bottom) / 2,
        date: n === 1 ? mmdd(l.dateUTC) : `${mmdd(layers[j].dateUTC)} to ${mmdd(l.dateUTC)}`,
        text: n === 1 ? 'missed' : `${n} missed`,
      })
      continue
    }
    // 광맥 날은 재료 이름 대신 '7-day vein'(캡션 칸 폭 ≈ 190px 안에 유리알까지 들어가게 — 리뷰 지적)
    const what = l.vein ? `${l.vein}-day vein` : l.material
    const text = l.kind === 'pending' ? 'today · not yet' : l.today ? `today · ${what}` : what
    cands.push({ layer: l, anchor: l.top + l.h / 2, date: l.today ? '' : mmdd(l.dateUTC), text })
  }
  let pick = cands.slice(0, MAX_LABELS)
  if (cands.length > MAX_LABELS) pick = [...cands.slice(0, MAX_LABELS - 1), cands[cands.length - 1]]
  // 아래 → 위 순서로 밀기
  const asc = [...pick].reverse()
  const ys = asc.map((c) => c.anchor)
  const up = () => {
    for (let i = 1; i < ys.length; i++) if (ys[i - 1] - ys[i] < LABEL_GAP) ys[i] = ys[i - 1] - LABEL_GAP
  }
  const minY = LABEL_GAP / 2
  const maxY = innerH - LABEL_GAP / 2
  up()
  if (ys.length && ys[ys.length - 1] < minY) {
    ys[ys.length - 1] = minY
    for (let i = ys.length - 2; i >= 0; i--) if (ys[i] - ys[i + 1] < LABEL_GAP) ys[i] = ys[i + 1] + LABEL_GAP
  }
  // 아래로 밀다 병 바닥을 넘으면 바닥에 붙이고 다시 위로(MAX_LABELS × LABEL_GAP < innerH라 둘 다 들어간다)
  if (ys.length && ys[0] > maxY) {
    ys[0] = maxY
    up()
  }
  return asc
    .map((c, i) => ({
      anchor: c.anchor,
      y: Math.round(ys[i] * 10) / 10,
      kind: c.layer.kind,
      date: c.date,
      text: c.text,
      stars: c.layer.kind === 'solved' ? c.layer.stars : null,
      dashed: c.layer.kind !== 'solved',
    }))
    .reverse()
}

/** 스크린 리더용 한 줄(병 그림은 aria-hidden). */
export function layerSentence(l: JarLayer): string {
  const d = new Date(l.dateUTC + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  if (l.kind === 'pending') return `${d}, today: not solved yet.`
  if (l.kind === 'missed') return `${d}: missed.`
  return `${d}${l.today ? ', today' : ''}: solved, ${l.stars} of 3 stars, ${l.material} layer${l.vein ? `, vein for a ${l.vein}-day run` : ''}.`
}

/**
 * 층 경계 물결 — 경계 i(층 i의 윗면)의 진폭. 위아래 층 중 얇은 쪽의 25%를 넘지 않아 곡선끼리 엇갈리지 않는다.
 * 부호는 그 층의 날짜 번호 홀짝(창이 하루씩 밀려도 같은 층의 물결이 뒤집히지 않게 — 리뷰). 시안의 부은 단면.
 */
export function waveAmp(layers: JarLayer[], i: number): number {
  const below = layers[i].h
  const above = layers[i + 1]?.h ?? below
  const a = Math.min(2.5, 0.25 * Math.min(below, above))
  return (layers[i].dayNumber % 2 ? 1 : -1) * Math.round(a * 10) / 10
}
