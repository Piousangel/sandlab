import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readStrata, STRATA_CYCLE } from '@/lib/strata'
import { DAILY_KEY, DAILY_POOL_IDS, LAUNCH_UTC, dayNumber } from '@/lib/spill/client/daily'
import { LEVELS } from '@/lib/spill/levels'
import { BASE_H, GLASS_ON_BONE, INK, LABEL_GAP, MAX_LABELS, buildJar, contrast, materialColor, needsEdge, runs, waveAmp } from './strataModel'
import { JAR, POUR, POURED_KEY, StrataJar, grainTiming, isFreshPour, pourDelays } from './StrataJar'
import { DailyAside } from './DailyAside'
import {
  VEIL_BLOCK, VEIL_FLATTEN, defaultScale, keepRects, mosaicPixels, shareLayout, veilBoard, type ShareFormat,
} from '../result/model'

const DAY = 86_400_000
const TODAY = 43
/** 기록 픽스처 — {day: stars}. */
const store = (rec: Record<number, number>, legacy?: Record<number, number>) => {
  const m: Record<string, string> = {
    [DAILY_KEY]: JSON.stringify(Object.fromEntries(Object.entries(rec).map(([d, s]) => [d, { stars: s, moves: 2 }]))),
  }
  if (legacy) m['sandlab.daily.v1'] = JSON.stringify(Object.fromEntries(Object.entries(legacy).map(([d, s]) => [d, { stars: s, ink: 10 }])))
  return { getItem: (k: string) => m[k] ?? null }
}
const jarOf = (rec: Record<number, number>, today = TODAY) => buildJar(readStrata(store(rec), today, today), today, JAR.innerH)
const range = (a: number, b: number, s = 2) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, s]))

describe('지층 병 — 상태', () => {
  it('0층: 기록이 없으면 오늘 "아직" 하나뿐(결측일 30개를 그리지 않는다), 연속·광맥 없음', () => {
    const j = jarOf({})
    expect(j.layers.map((l) => l.kind)).toEqual(['pending'])
    expect(j.solvedDays).toBe(0)
    expect(j.nextVein).toBeNull()
    expect(j.todayKind).toBe('pending')
    expect(j.labels).toHaveLength(1)
    expect(j.labels[0].text).toBe('today · not yet')
  })
  it('5층(오늘 포함 연속 5일): 별 수 = 두께, 오늘은 solved', () => {
    const j = jarOf({ 39: 1, 40: 2, 41: 3, 42: 2, 43: 3 })
    expect(j.layers.map((l) => l.kind)).toEqual(['solved', 'solved', 'solved', 'solved', 'solved'])
    expect(j.layers.map((l) => l.h)).toEqual([BASE_H[1], BASE_H[2], BASE_H[3], BASE_H[2], BASE_H[3]])
    expect(j.streak).toBe(5)
    expect(j.nextVein).toEqual({ at: 7, toGo: 2 })
    expect(j.todayKind).toBe('solved')
    expect(j.labels[0].text).toBe(`today · ${STRATA_CYCLE[(TODAY - 1) % 10]}`)
  })
  it('결측 포함: 첫 기록 이전 결측은 자르고, 사이 결측은 공백층, 이어진 결측은 지시선 한 줄', () => {
    const j = jarOf({ 36: 2, 40: 3, 42: 1 })
    expect(j.layers.map((l) => l.dayNumber)).toEqual([36, 37, 38, 39, 40, 41, 42, 43])
    expect(j.layers.map((l) => l.kind)).toEqual(['solved', 'missed', 'missed', 'missed', 'solved', 'missed', 'solved', 'pending'])
    expect(j.labels.map((l) => l.text)).toContain('missed')
    const g = jarOf({ 36: 2, 40: 3 })
    const texts = g.labels.map((l) => l.text)
    expect(texts).toContain('3 missed')
    expect(texts).toContain('2 missed')
    expect(g.labels.find((l) => l.text === '3 missed')!.date).toBe('11-14 to 11-16')
    expect(j.layers.find((l) => l.kind === 'missed')!.h).toBe(BASE_H.missed)
  })
  it('오늘 미해결 "아직"은 결측과 다른 종류·문구·두께', () => {
    const j = jarOf({ 41: 2 })
    const today = j.layers.at(-1)!
    const missed = j.layers.find((l) => l.kind === 'missed')!
    expect(today.kind).toBe('pending')
    expect(today.h).toBeGreaterThan(missed.h)
    expect(j.labels[0].text).toBe('today · not yet')
    expect(j.labels.some((l) => l.text === 'missed')).toBe(true)
    // 오늘 아직은 연속을 끊지 않는다
    expect(jarOf({ 41: 2, 42: 2 }).streak).toBe(2)
  })
  it('30층 이상: 최근 30일만, 병 안쪽 높이 안에 들어간다(비율 축소)', () => {
    const j = jarOf(range(1, 43, 3))
    expect(j.layers).toHaveLength(30)
    expect(j.layers[0].dayNumber).toBe(14)
    expect(j.layers.at(-1)!.top).toBeGreaterThanOrEqual(-0.5)
    for (const l of j.layers) expect(l.h).toBeGreaterThanOrEqual(2)
    expect(j.solvedDays).toBe(30)
    expect(j.streak).toBe(43)
  })
  it('출시 초기(#1~#5): 층이 적어도 바닥부터 쌓이고 위는 빈 유리', () => {
    const j = jarOf({ 1: 2, 2: 2, 3: 2 }, 5)
    expect(j.layers.map((l) => l.dayNumber)).toEqual([1, 2, 3, 4, 5])
    expect(j.layers[0].top + j.layers[0].h).toBe(JAR.innerH)
    expect(j.layers.at(-1)!.top).toBeGreaterThan(JAR.innerH / 2)
  })
  it('옛 키(sandlab.daily.v1)만 있어도 층이 된다', () => {
    const all = readStrata(store({}, { 42: 3 }), TODAY, TODAY)
    const j = buildJar(all, TODAY, JAR.innerH)
    expect(j.layers.map((l) => l.kind)).toEqual(['solved', 'pending'])
  })
  it('오래 쉰 사용자(첫 기록이 창 밖)는 신규가 아니다 — 창 안 결측을 그대로 그리고 빈 상태 문구도 다르다(리뷰)', () => {
    const j = jarOf(range(1, 10))
    expect(j.layers).toHaveLength(30)
    expect(j.layers.slice(0, -1).every((l) => l.kind === 'missed')).toBe(true)
    expect(j.everSolved).toBe(true)
    expect(jarOf({}).everSolved).toBe(false)
    const k = jarOf({ ...range(1, 13), 21: 2 })
    expect(k.layers[0].dayNumber).toBe(14) // 창 바닥의 결측 7층(#14~#20)이 남는다
    expect(k.layers[0].kind).toBe('missed')
  })
  it('물결 경계는 이웃 경계와 엇갈리지 않는다(반올림 포함 층 두께의 35% 이상 남음), 부호는 날짜 홀짝이라 창이 밀려도 그대로', () => {
    for (const rec of [range(1, 43, 3), range(1, 43, 1), { 20: 1, 25: 3, 30: 1, 31: 3, 40: 2 }]) {
      const j = jarOf(rec)
      for (let i = 1; i < j.layers.length; i++) {
        const a = Math.abs(waveAmp(j.layers, i)) * 1.2
        const b = Math.abs(waveAmp(j.layers, i - 1)) * 1.2
        expect(j.layers[i].h - a - b, String(i)).toBeGreaterThanOrEqual(j.layers[i].h * 0.35)
      }
    }
    const a = jarOf(range(1, 43))
    const b = jarOf(range(1, 44), 44)
    const amp = (j: typeof a, n: number) => Math.sign(waveAmp(j.layers, j.layers.findIndex((l) => l.dayNumber === n)))
    expect(amp(a, 30)).toBe(amp(b, 30))
  })
})

describe('광맥(마일스톤) — 실제 기록 기준', () => {
  it('연속 7일째 그날에만 광맥, 끊기면 다시 센다', () => {
    const r = runs(readStrata(store({ ...range(1, 7), ...range(9, 22) }), 22, 22), 22)
    expect([...r.veinAt.entries()]).toEqual([
      [7, 7],
      [15, 7],
      [22, 14],
    ])
    expect(r.streak).toBe(14)
  })
  it('기록 없는 광맥은 없다 — 연속 6일이면 광맥 0, 다음 목표만', () => {
    const j = jarOf(range(38, 43))
    expect(j.layers.some((l) => l.vein)).toBe(false)
    expect(j.nextVein).toEqual({ at: 7, toGo: 1 })
    const v = jarOf(range(37, 43))
    expect(v.layers.at(-1)!.vein).toBe(7)
    // 광맥 날 캡션은 재료 대신 '7-day vein'(칸 폭 안에 유리알까지), 범례에 광맥 설명
    expect(v.labels[0].text).toBe('today · 7-day vein')
    expect(v.veinsShown).toBe(true)
    expect(renderToStaticMarkup(<StrataJar today={TODAY} storage={store(range(37, 43))} />)).toContain('White grains mark a vein')
  })
})

describe('색·대비', () => {
  it('9일 데일리 주기에서도 30층 띠는 10색을 모두 쓰고, 이웃 층은 색이 다르다', () => {
    const j = jarOf(range(1, 43))
    expect(new Set(j.layers.map((l) => l.color)).size).toBe(10)
    for (let i = 1; i < j.layers.length; i++) expect(j.layers[i].color).not.toBe(j.layers[i - 1].color)
    // 레벨이 같은 날(9일 간격)도 색이 다르다
    expect(j.layers.find((l) => l.dayNumber === 30)!.color).not.toBe(j.layers.find((l) => l.dayNumber === 39)!.color)
  })
  it('Bone(유리) 위 3:1 미만 재료(sand·seed·acid 포함)는 ink 경계, 경계 없는 재료는 3:1 이상', () => {
    for (const m of ['sand', 'seed', 'acid']) expect(needsEdge(materialColor(m)), m).toBe(true)
    for (const m of STRATA_CYCLE) {
      const c = materialColor(m)
      if (!needsEdge(c)) expect(contrast(c, GLASS_ON_BONE), m).toBeGreaterThanOrEqual(3)
    }
    expect(contrast(INK, GLASS_ON_BONE)).toBeGreaterThanOrEqual(3)
  })
})

describe('날짜 지시선', () => {
  it('최대 MAX_LABELS개, 서로 LABEL_GAP 이상, 병 안쪽 높이 안', () => {
    for (const rec of [{}, range(1, 43, 3), { 20: 1, 25: 2, 30: 3, 35: 1, 40: 2, 41: 1, 42: 3 }, range(41, 43, 1)]) {
      const j = jarOf(rec)
      expect(j.labels.length).toBeLessThanOrEqual(MAX_LABELS)
      const ys = j.labels.map((l) => l.y)
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(LABEL_GAP - 0.11)
      for (const y of ys) {
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(JAR.innerH)
      }
    }
  })
  it('30층이면 오늘부터 4줄 + 맨 아래 가장 오래된 층', () => {
    const j = jarOf(range(1, 43, 2))
    expect(j.labels).toHaveLength(5)
    expect(j.labels.at(-1)!.date).toBe('10-22') // #14
  })
})

describe('UTC 자정 경계', () => {
  it('23:59:59.999 UTC까지는 같은 날, 자정이 지나면 어제 기록이 아래 층, 오늘은 "아직"', () => {
    const endOf43 = LAUNCH_UTC + 43 * DAY - 1
    expect(dayNumber(endOf43)).toBe(43)
    expect(dayNumber(endOf43 + 1)).toBe(44)
    const rec = { 43: 2 }
    expect(jarOf(rec, dayNumber(endOf43)).todayKind).toBe('solved')
    const next = jarOf(rec, dayNumber(endOf43 + 1))
    expect(next.layers.map((l) => [l.dayNumber, l.kind])).toEqual([
      [43, 'solved'],
      [44, 'pending'],
    ])
    expect(next.streak).toBe(1)
  })
})

describe('StrataJar 렌더', () => {
  it('층 수·상태를 data 속성과 화면 밖 목록으로 낸다, 재료색 글자 없음', () => {
    const html = renderToStaticMarkup(<StrataJar today={TODAY} storage={store({ 40: 3, 42: 2 })} />)
    expect(html).toContain('data-layers="4"')
    expect(html).toContain('data-today="pending"')
    expect(html.match(/data-layer="pending"/g)).toHaveLength(1)
    expect(html.match(/data-layer="missed"/g)).toHaveLength(1)
    expect(html).toContain('not solved yet')
    // 재료색은 SVG fill에만 — style color로 쓰지 않는다
    for (const m of STRATA_CYCLE) expect(html.includes(`color:${materialColor(m)}`)).toBe(false)
  })
  it('0층 빈 상태 문구', () => {
    const html = renderToStaticMarkup(<StrataJar today={TODAY} storage={store({})} />)
    expect(html).toContain('Each daily you solve pours one layer.')
    expect(html).toContain('0 solved · 30 days')
  })
})

describe('DailyAside(새 셸 패널)', () => {
  it('데일리 풀 전 레벨에서 레벨 id·옛 Share result 버튼 없음', () => {
    for (const id of DAILY_POOL_IDS) {
      const level = LEVELS.find((l) => l.id === id)!
      for (const mine of [null, { stars: 2, moves: 3 }]) {
        const html = renderToStaticMarkup(<DailyAside n={43} level={level} mine={mine} />)
        expect(html.includes(id), id).toBe(false)
        expect(html).not.toContain('Share result')
        expect(html).not.toContain('<button')
        expect(html).not.toMatch(/style="/)
      }
    }
  })
})

describe('공유 이미지 스포일러 가림(P7)', () => {
  it('데일리 그날(UTC)은 가리고 다음 날부터 원본, 레벨 모드는 늘 원본', () => {
    const start43 = LAUNCH_UTC + 42 * DAY
    expect(veilBoard({ n: 43 }, start43)).toBe(true)
    expect(veilBoard({ n: 43 }, start43 + DAY - 1)).toBe(true)
    expect(veilBoard({ n: 43 }, start43 + DAY)).toBe(false)
    expect(veilBoard({ n: 43 }, start43 + 5 * DAY)).toBe(false)
    expect(veilBoard(null, start43)).toBe(false)
  })
  it('목표 칸만 선명하게 남기고 bad 칸은 가린다(타일 단위 rect를 셀 단위로 4배)', () => {
    expect(
      keepRects([
        { kind: 'fill', rect: [2, 50, 8, 6] },
        { kind: 'bad', rect: [0, 0, 4, 4] },
      ]),
    ).toEqual([{ x: 8, y: 200, w: 32, h: 24 }])
    // 실제 데일리 풀 레벨은 모두 선명 칸이 1개 이상(채운 결과는 보인다)
    for (const id of DAILY_POOL_IDS) expect(keepRects(LEVELS.find((l) => l.id === id)!.targets).length, id).toBeGreaterThan(0)
  })
  it('모자이크: 1셀 폭 길은 칸 평균에 묻히고, keep 칸 픽셀은 원본 그대로', () => {
    const w = 32
    const h = 32
    const px = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      const i = (y * w + 5) * 4 // x=5 세로 1셀 길(흰색)
      px[i] = px[i + 1] = px[i + 2] = 255
      for (let x = 0; x < w; x++) px[(y * w + x) * 4 + 3] = 255
    }
    const keep = [{ x: 0, y: 24, w: 8, h: 8 }]
    expect(VEIL_BLOCK).toBe(16)
    const plain = mosaicPixels(px.slice(), w, h, 8, keep)
    // 8셀 칸: 길(255)이 1/8로 평균 → 32, 칸 안 모든 픽셀 같은 값
    expect(plain[(0 * w + 5) * 4]).toBe(32)
    expect(plain[(0 * w + 4) * 4]).toBe(32)
    // 실제 설정(16셀 + 전체 평균 쪽으로 50%): 16/16 = 15.9 와 전체 평균 7.97의 중간 → 12, 길이 있던 칸과 없던 칸 차이도 줄어든다
    const out = mosaicPixels(px.slice(), w, h, VEIL_BLOCK, keep, VEIL_FLATTEN)
    expect(out[(0 * w + 5) * 4]).toBe(12)
    expect(out[(0 * w + 4) * 4]).toBe(12)
    expect(out[(0 * w + 20) * 4]).toBe(4)
    // keep 칸 안 길은 그대로 255, 옆은 0
    expect(out[(28 * w + 5) * 4]).toBe(255)
    expect(out[(28 * w + 4) * 4]).toBe(0)
  })
  it('가림 안내 줄은 기본 배율에서 stat과 sandlab.app 사이에 들어간다', () => {
    for (const f of ['square', 'wide'] as ShareFormat[]) {
      const T = shareLayout(f, defaultScale(f)).text
      expect(T.noteY).toBeGreaterThan(T.statY + T.stat * 0.5)
      expect(T.noteY).toBeLessThan(T.siteY - T.site - 8)
    }
  })
})

describe('지층 병 — 모션(데일리 개편 D1)', () => {
  const withSeen = (rec: Record<number, number>, seen: string | null) => {
    const s = store(rec)
    return { getItem: (k: string) => (k === POURED_KEY ? seen : s.getItem(k)) }
  }
  it('붓기 지연: 아래부터 오르고, 30층이어도 지시선·캡션 페이드까지 합친 전체가 보상 상한(900ms) 안', () => {
    for (const n of [1, 2, 5, 12, 30]) {
      const { delays, end, total } = pourDelays(n, false)
      expect(delays[0]).toBe(0)
      for (let i = 1; i < n; i++) expect(delays[i]).toBeGreaterThan(delays[i - 1])
      expect(end).toBe(delays[n - 1] + POUR.settle)
      expect(total).toBe(end + POUR.fade)
      expect(total).toBeLessThanOrEqual(900)
    }
  })
  it('오늘 처음 본 층은 나머지가 쌓인 뒤 떨어지고, 페이드까지 1.3초 안', () => {
    const { delays, end, total } = pourDelays(30, true)
    expect(delays[29] - delays[28]).toBeGreaterThanOrEqual(POUR.freshGap)
    expect(end).toBe(delays[29] + POUR.drop)
    expect(total).toBeLessThanOrEqual(1300)
    expect(pourDelays(0, true)).toEqual({ delays: [], end: POUR.settle, total: POUR.settle + POUR.fade })
  })
  it('알갱이는 오늘 층이 바닥에 닿는 순간에 닿는다(먼 거리는 더 길게, 지연은 0 이상)', () => {
    const land = 500 + POUR.drop * POUR.land
    for (const fall of [8, 60, 220]) {
      const t = grainTiming(500, fall, 0)
      expect(t.delay + t.dur).toBe(Math.round(land))
    }
    expect(grainTiming(500, 220, 0).dur).toBeGreaterThan(grainTiming(500, 8, 0).dur)
    expect(grainTiming(0, 220, 150).delay).toBe(0)
  })
  it('fresh = 오늘 풀었고 아직 안 본 날만(아직 안 풀었으면·이미 봤으면 아님, 저장소 오류도 안전)', () => {
    const solved = jarOf({ 42: 2, 43: 3 })
    expect(isFreshPour(solved, TODAY, withSeen({}, null))).toBe(true)
    expect(isFreshPour(solved, TODAY, withSeen({}, '42'))).toBe(true)
    expect(isFreshPour(solved, TODAY, withSeen({}, '43'))).toBe(false)
    expect(isFreshPour(jarOf({ 42: 2 }), TODAY, withSeen({}, null))).toBe(false)
    expect(isFreshPour(solved, TODAY, { getItem: () => { throw new Error('denied') } })).toBe(true)
  })
  it('렌더: fresh면 맨 위 층에만 data-fresh + 알갱이 6개, 본 날이면 둘 다 없음, 층마다 지연', () => {
    const fresh = renderToStaticMarkup(<StrataJar today={TODAY} storage={withSeen({ 41: 1, 42: 2, 43: 3 }, null)} />)
    expect(fresh).toContain('data-fresh="1"')
    expect(fresh.match(/class="sl-st-grain"/g)).toHaveLength(6)
    expect(fresh.match(/class="sl-st-l"/g)).toHaveLength(3)
    // 층 지연은 아래 → 위로 오르고, 맨 위(오늘) 층이 가장 늦다
    const ds = [...fresh.matchAll(/class="sl-st-l"[^>]*?animation-delay:(\d+)ms/g)].map((m) => +m[1])
    expect(ds).toHaveLength(3)
    expect(ds[0]).toBe(0)
    expect(ds[2] - ds[1]).toBeGreaterThanOrEqual(POUR.freshGap)
    // 알갱이는 층보다 먼저(아래에) 그려지고, 각자 낙하 길이가 있다
    expect(fresh.indexOf('class="sl-st-grain"')).toBeLessThan(fresh.indexOf('class="sl-st-l"'))
    expect(fresh).toMatch(/class="sl-st-grain"[^>]*animation-duration:\d+ms/)
    const seen = renderToStaticMarkup(<StrataJar today={TODAY} storage={withSeen({ 41: 1, 42: 2, 43: 3 }, '43')} />)
    expect(seen).not.toContain('data-fresh')
    expect(seen).not.toContain('class="sl-st-grain"')
    const pending = renderToStaticMarkup(<StrataJar today={TODAY} storage={withSeen({ 42: 2 }, null)} />)
    expect(pending).not.toContain('data-fresh')
  })
})
