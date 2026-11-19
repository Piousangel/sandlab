import { describe, it, expect, vi } from 'vitest'
import { saveDaily as legacySaveDaily } from './challenge/daily/share'
import { STRATA_CYCLE, LEGACY_DAILY_KEY, dateUTCFor, readStrata, strataMaterial } from './strata'
import { DAILY_KEY, DAILY_POOL_IDS, LAUNCH_UTC, dailyIdFor, dayNumber } from './spill/client/daily'
import { LAUNCH_UTC as LEGACY_LAUNCH_UTC, dayNumber as legacyDayNumber } from './challenge/daily'
import { PRESETS } from './sand/materials'

const DAY = 86_400_000
const store = (init: Record<string, string | null> = {}) => ({
  getItem: (k: string) => init[k] ?? null,
})
const oldKey = (o: unknown) => ({ [LEGACY_DAILY_KEY]: JSON.stringify(o) })
const newKey = (o: unknown) => ({ [DAILY_KEY]: JSON.stringify(o) })

describe('STRATA_CYCLE(S3)', () => {
  it('10종, 중복 없음, 전부 materials.ts의 실제 재료 id', () => {
    expect(STRATA_CYCLE).toHaveLength(10)
    expect(new Set(STRATA_CYCLE).size).toBe(10)
    const slugs = new Set(PRESETS.map((m) => m.slug))
    for (const id of STRATA_CYCLE) expect(slugs.has(id), id).toBe(true)
  })
  it('옅은 재료(salt·steam·ice·metal)와 empty는 넣지 않는다', () => {
    for (const pale of ['salt', 'steam', 'ice', 'metal', 'empty']) {
      expect((STRATA_CYCLE as readonly string[]).includes(pale), pale).toBe(false)
    }
  })
  it('순서 고정(DECISIONS 2026-11-19 P2) — 바꾸면 지난 지층 색이 전부 바뀐다', () => {
    expect([...STRATA_CYCLE]).toEqual(['sand', 'gunpowder', 'seed', 'lava', 'ash', 'acid', 'stone', 'plant', 'wood', 'water'])
  })
  it('색 = STRATA_CYCLE[(dayNumber-1) % 10]', () => {
    expect(strataMaterial(1)).toBe('sand')
    expect(strataMaterial(10)).toBe('water')
    expect(strataMaterial(11)).toBe('sand')
    expect(strataMaterial(42)).toBe(STRATA_CYCLE[41 % 10])
  })
  it('9일 데일리 주기에서도 띠 색은 10종을 순환한다(그날 레벨과 무관)', () => {
    expect(DAILY_POOL_IDS).toHaveLength(9)
    // 레벨이 같은 날(9일 간격)끼리도 색이 다르다
    for (let n = 1; n <= 90; n++) {
      expect(dailyIdFor(n)).toBe(dailyIdFor(n + 9))
      expect(strataMaterial(n)).not.toBe(strataMaterial(n + 9))
    }
    // 연속 10일이면 10종이 한 번씩
    const s = readStrata(store(), 30, 10)
    expect(new Set(s.map((x) => x.material)).size).toBe(10)
    // 이웃한 날은 항상 다른 색
    for (let n = 1; n < 100; n++) expect(strataMaterial(n)).not.toBe(strataMaterial(n + 1))
  })
})

describe('readStrata', () => {
  it('옛 데일리와 Spill 데일리는 같은 번호 체계(#1 = 2026-10-09 UTC)', () => {
    expect(LEGACY_LAUNCH_UTC).toBe(LAUNCH_UTC)
    expect(legacyDayNumber(LAUNCH_UTC + 5 * DAY)).toBe(dayNumber(LAUNCH_UTC + 5 * DAY))
    expect(LEGACY_DAILY_KEY).toBe('sandlab.daily.v1')
    expect(DAILY_KEY).toBe('sandlab.spill-daily.v1')
  })
  it('옛 데일리 코드(challenge/daily/share.saveDaily)가 쓴 기록을 그대로 읽는다', () => {
    const m = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) })
    try {
      legacySaveDaily(3, { stars: 2, ink: 1234 })
      const s = readStrata({ getItem: (k) => m.get(k) ?? null }, 3)
      expect(s[2]).toMatchObject({ dayNumber: 3, stars: 2, missed: false })
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('아무 기록 없음: days개, 오래된 날 → 오늘 순서, 전부 missed·0별', () => {
    const s = readStrata(store(), 40)
    expect(s).toHaveLength(30)
    expect(s[0].dayNumber).toBe(11)
    expect(s[29].dayNumber).toBe(40)
    for (const x of s) {
      expect(x.missed).toBe(true)
      expect(x.stars).toBe(0)
      expect(x.material).toBe(strataMaterial(x.dayNumber))
    }
  })
  it('출시 전 날(#1 이전)은 만들지 않는다', () => {
    const s = readStrata(store(), 3)
    expect(s.map((x) => x.dayNumber)).toEqual([1, 2, 3])
    expect(readStrata(store(), 0)).toEqual([])
    expect(readStrata(store(), 5, 0)).toEqual([])
  })
  it('dateUTC는 그 번호의 UTC 날짜(YYYY-MM-DD)', () => {
    expect(dateUTCFor(1)).toBe('2026-10-09')
    expect(dateUTCFor(24)).toBe('2026-11-01')
    expect(dateUTCFor(42)).toBe('2026-11-19')
    const s = readStrata(store(), 42, 2)
    expect(s.map((x) => x.dateUTC)).toEqual(['2026-11-18', '2026-11-19'])
  })
  it('옛 키만 있음({stars, ink}) — 그대로 지층이 된다', () => {
    const s = readStrata(store(oldKey({ 2: { stars: 3, ink: 410 }, 4: { stars: 1, ink: 999 } })), 5)
    expect(s.map((x) => [x.dayNumber, x.stars, x.missed])).toEqual([
      [1, 0, true],
      [2, 3, false],
      [3, 0, true],
      [4, 1, false],
      [5, 0, true],
    ])
  })
  it('새 키만 있음 — ticks·mask 없는 옛 기록도 읽힌다', () => {
    const s = readStrata(store(newKey({ 30: { stars: 2, moves: 1 }, 31: { stars: 3, moves: 2, ticks: 300, mask: 7 } })), 31, 2)
    expect(s).toEqual([
      { dayNumber: 30, dateUTC: '2026-11-07', material: strataMaterial(30), stars: 2, missed: false },
      { dayNumber: 31, dateUTC: '2026-11-08', material: strataMaterial(31), stars: 3, missed: false },
    ])
  })
  it('둘 다 있고 같은 날이 겹치면 새 키 우선, 겹치지 않는 날은 병합', () => {
    const s = readStrata(
      store({
        ...oldKey({ 10: { stars: 1, ink: 500 }, 11: { stars: 2, ink: 300 } }),
        ...newKey({ 11: { stars: 3, moves: 1 }, 12: { stars: 1, moves: 4 } }),
      }),
      12,
      3,
    )
    expect(s.map((x) => [x.dayNumber, x.stars, x.missed])).toEqual([
      [10, 1, false],
      [11, 3, false],
      [12, 1, false],
    ])
  })
  it('새 키 항목이 깨졌으면 같은 날 옛 키 기록을 쓴다', () => {
    const s = readStrata(store({ ...oldKey({ 5: { stars: 2, ink: 1 } }), ...newKey({ 5: 'junk' }) }), 5, 1)
    expect(s[0]).toMatchObject({ dayNumber: 5, stars: 2, missed: false })
  })
  it('결측일은 missed: true, 0별, 색은 그대로 순환(공백층)', () => {
    const s = readStrata(store(newKey({ 20: { stars: 2, moves: 1 }, 22: { stars: 2, moves: 1 } })), 22, 3)
    expect(s[1]).toEqual({ dayNumber: 21, dateUTC: dateUTCFor(21), material: strataMaterial(21), stars: 0, missed: true })
  })
  it('손상 JSON(둘 중 하나·둘 다)은 무시하고 나머지로 만든다, 던지지 않는다', () => {
    const both = readStrata(store({ [LEGACY_DAILY_KEY]: '{bad', [DAILY_KEY]: 'nope' }), 3)
    expect(both.every((x) => x.missed)).toBe(true)
    const oneBad = readStrata(store({ [LEGACY_DAILY_KEY]: '{bad', ...newKey({ 3: { stars: 1, moves: 1 } }) }), 3)
    expect(oneBad[2]).toMatchObject({ stars: 1, missed: false })
    const nonObj = readStrata(store({ [LEGACY_DAILY_KEY]: 'null', [DAILY_KEY]: '[1,2,3]' }), 3)
    expect(nonObj.every((x) => x.missed)).toBe(true)
    const throwing = { getItem: () => { throw new Error('blocked') } }
    expect(() => readStrata(throwing, 3)).not.toThrow()
    expect(readStrata(throwing, 3).every((x) => x.missed)).toBe(true)
  })
  it('stars는 0~3 정수로 자른다', () => {
    const s = readStrata(store(newKey({ 1: { stars: 7, moves: 1 }, 2: { stars: -2, moves: 1 }, 3: { stars: 2.6, moves: 1 } })), 3)
    expect(s.map((x) => x.stars)).toEqual([3, 0, 3])
    expect(s.every((x) => !x.missed)).toBe(true)
  })
  it('UTC 자정 경계: 오늘 = dayNumber(now) 기준으로 마지막 층이 넘어간다', () => {
    const recs = store(newKey({ 9: { stars: 2, moves: 1 }, 10: { stars: 3, moves: 1 } }))
    const beforeMidnight = LAUNCH_UTC + 9 * DAY - 1 // 2026-10-17 23:59:59.999Z = #9
    const atMidnight = LAUNCH_UTC + 9 * DAY // 2026-10-18 00:00Z = #10
    const a = readStrata(recs, dayNumber(beforeMidnight), 2)
    const b = readStrata(recs, dayNumber(atMidnight), 2)
    expect(a.map((x) => [x.dayNumber, x.dateUTC])).toEqual([
      [8, '2026-10-16'],
      [9, '2026-10-17'],
    ])
    expect(b.map((x) => [x.dayNumber, x.dateUTC])).toEqual([
      [9, '2026-10-17'],
      [10, '2026-10-18'],
    ])
    expect(b[1]).toMatchObject({ stars: 3, missed: false, material: 'water' })
  })
})
