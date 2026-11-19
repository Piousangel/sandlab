import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DAILY_KEY,
  DAILY_MASK_CLEAR,
  DAILY_MASK_GEM,
  DAILY_MASK_PAR,
  DAILY_POOL_IDS,
  LAUNCH_UTC,
  dailyIdFor,
  dayNumber,
  loadDaily,
  parseDailyRec,
  saveDaily,
  shareText,
  shareTextV2,
} from './daily'
import { STAR_CLEAR, STAR_GEMS, STAR_PAR } from '../play/score'
import { LEVELS } from '../levels'

const DAY = 86_400_000

describe('Spill 데일리', () => {
  it('번호 체계는 옛 데일리와 같다(#1 = 2026-10-09 UTC)', () => {
    expect(dayNumber(LAUNCH_UTC)).toBe(1)
    expect(dayNumber(LAUNCH_UTC + DAY - 1)).toBe(1)
    expect(dayNumber(LAUNCH_UTC + DAY)).toBe(2)
  })
  it('풀의 모든 id가 실제 레벨이다', () => {
    for (const id of DAILY_POOL_IDS) expect(LEVELS.some((l) => l.id === id), id).toBe(true)
  })
  it('연속한 날은 다른 레벨이고 한 바퀴에 풀 전체를 돈다', () => {
    const len = DAILY_POOL_IDS.length
    const seen = new Set<string>()
    for (let n = 1; n <= len; n++) {
      seen.add(dailyIdFor(n))
      expect(dailyIdFor(n)).not.toBe(dailyIdFor(n + 1))
    }
    expect(seen.size).toBe(len)
    expect(dailyIdFor(1)).toBe(dailyIdFor(1 + len))
  })
  it('같은 번호는 항상 같은 레벨', () => {
    expect(dailyIdFor(39)).toBe(dailyIdFor(39))
  })
  it('공유 문구에 번호·별·수·링크', () => {
    expect(shareText(39, 2, 1, '1-4')).toBe('Sandlab Daily #39 (1-4) ⭐⭐ 1 move\nhttps://sandlab.app/daily')
  })
})

// ── P2(S4): DailyRec 확장 — ticks·mask 선택 필드, 키 불변, 첫 클리어 고정 ──
const mem = (init: Record<string, string> = {}) => {
  const m = new Map<string, string>(Object.entries(init))
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('DailyRec 저장(S4)', () => {
  let store: ReturnType<typeof mem>
  beforeEach(() => {
    store = mem()
    vi.stubGlobal('localStorage', store)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('저장 키는 sandlab.spill-daily.v1 그대로', () => {
    expect(DAILY_KEY).toBe('sandlab.spill-daily.v1')
  })
  it('mask 비트는 score.ts 별 비트와 같다(CLEAR=1, GEM=2, PAR=4)', () => {
    expect([DAILY_MASK_CLEAR, DAILY_MASK_GEM, DAILY_MASK_PAR]).toEqual([STAR_CLEAR, STAR_GEMS, STAR_PAR])
    expect([DAILY_MASK_CLEAR, DAILY_MASK_GEM, DAILY_MASK_PAR]).toEqual([1, 2, 4])
  })
  it('지금 화면 호출(stars·moves만)은 바이트 단위로 예전과 같은 JSON을 쓴다', () => {
    saveDaily(42, { stars: 2, moves: 1 })
    expect(store.m.get(DAILY_KEY)).toBe('{"42":{"stars":2,"moves":1}}')
    expect(loadDaily(42)).toEqual({ stars: 2, moves: 1 })
  })
  it('지금 화면 흐름(DailySpill.onCleared) 재현: 첫 클리어 저장, 재도전은 첫 기록 유지', () => {
    // DailySpill: if (!loadDaily(n)) saveDaily(n, {stars, moves}); setMine(loadDaily(n) ?? {stars, moves})
    const onCleared = (n: number, stars: number, moves: number) => {
      if (!loadDaily(n)) saveDaily(n, { stars, moves })
      return loadDaily(n) ?? { stars, moves }
    }
    expect(onCleared(50, 1, 4)).toEqual({ stars: 1, moves: 4 })
    expect(onCleared(50, 3, 1)).toEqual({ stars: 1, moves: 4 })
    expect(store.m.get(DAILY_KEY)).toBe('{"50":{"stars":1,"moves":4}}')
  })
  it('첫 클리어 때 ticks·mask를 함께 저장하고 그대로 읽는다', () => {
    saveDaily(7, { stars: 3, moves: 2, ticks: 312, mask: 7 })
    expect(loadDaily(7)).toEqual({ stars: 3, moves: 2, ticks: 312, mask: 7 })
  })
  it('공식 기록 = 그날 첫 클리어 — 재도전 결과가 덮어쓰지 않는다', () => {
    saveDaily(7, { stars: 1, moves: 4, ticks: 900, mask: 1 })
    saveDaily(7, { stars: 3, moves: 1, ticks: 120, mask: 7 })
    expect(loadDaily(7)).toEqual({ stars: 1, moves: 4, ticks: 900, mask: 1 })
  })
  it('ticks·mask 없는 옛 기록도 그대로 읽힌다(필드 생략)', () => {
    store.m.set(DAILY_KEY, '{"39":{"stars":2,"moves":3}}')
    const r = loadDaily(39)
    expect(r).toEqual({ stars: 2, moves: 3 })
    expect(r && 'ticks' in r).toBe(false)
    expect(r && 'mask' in r).toBe(false)
  })
  it('다른 날 기록은 건드리지 않고 추가한다', () => {
    store.m.set(DAILY_KEY, '{"39":{"stars":2,"moves":3}}')
    saveDaily(40, { stars: 1, moves: 5, ticks: 60, mask: 1 })
    expect(JSON.parse(store.m.get(DAILY_KEY)!)).toEqual({
      39: { stars: 2, moves: 3 },
      40: { stars: 1, moves: 5, ticks: 60, mask: 1 },
    })
  })
  it('손상 JSON: 읽기는 null, 저장은 원본을 덮지 않고 조용히 넘어간다', () => {
    store.m.set(DAILY_KEY, '{oops')
    expect(loadDaily(1)).toBeNull()
    expect(() => saveDaily(1, { stars: 1, moves: 1 })).not.toThrow()
    expect(store.m.get(DAILY_KEY)).toBe('{oops')
  })
  it('JSON이지만 객체가 아니면(null·배열·숫자·문자열) null, 저장도 덮지 않는다', () => {
    for (const raw of ['null', '[1,2]', '5', '"x"']) {
      store.m.set(DAILY_KEY, raw)
      expect(loadDaily(0), raw).toBeNull()
      expect(loadDaily(1), raw).toBeNull()
      saveDaily(1, { stars: 1, moves: 1 })
      expect(store.m.get(DAILY_KEY), raw).toBe(raw)
    }
  })
  it('그날 값이 깨진 항목이면 null, 첫 유효 클리어가 그 자리를 채운다', () => {
    store.m.set(DAILY_KEY, '{"3":"junk","4":{"stars":"2","moves":1}}')
    expect(loadDaily(3)).toBeNull()
    expect(loadDaily(4)).toBeNull()
    saveDaily(3, { stars: 2, moves: 2 })
    expect(loadDaily(3)).toEqual({ stars: 2, moves: 2 })
  })
  it('잘못된 ticks·mask는 읽을 때 생략한다', () => {
    store.m.set(
      DAILY_KEY,
      JSON.stringify({ 1: { stars: 2, moves: 1, ticks: 'x', mask: 9 }, 2: { stars: 2, moves: 1, ticks: -5, mask: 1.5 } }),
    )
    expect(loadDaily(1)).toEqual({ stars: 2, moves: 1 })
    expect(loadDaily(2)).toEqual({ stars: 2, moves: 1 })
  })
  it('저장소가 막혀도 예외 없음', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } })
    expect(loadDaily(5)).toBeNull()
    expect(() => saveDaily(5, { stars: 1, moves: 1, ticks: 1, mask: 1 })).not.toThrow()
  })
  it('parseDailyRec: 유효 기록만 정규화해 돌려준다', () => {
    expect(parseDailyRec({ stars: 3, moves: 0, ticks: 0, mask: 0 })).toEqual({ stars: 3, moves: 0, ticks: 0, mask: 0 })
    expect(parseDailyRec({ stars: 3, moves: 1, extra: 'drop' })).toEqual({ stars: 3, moves: 1 })
    expect(parseDailyRec(null)).toBeNull()
    expect(parseDailyRec([1])).toBeNull()
    expect(parseDailyRec({ stars: NaN, moves: 1 })).toBeNull()
    expect(parseDailyRec({ stars: 1 })).toBeNull()
  })
})

// ── P2: 공유 텍스트 v2 — 레벨 id 없음, 이모지 대신 유리알 문자 ●(찬 알)·○(빈 알) ──
describe('shareTextV2', () => {
  it('레벨 id를 넣지 않는다(9일 주기 노출 방지)', () => {
    for (let n = 1; n <= DAILY_POOL_IDS.length; n++) {
      const t = shareTextV2({ stars: 2, moves: 1, ticks: 100, mask: 3 }, n)
      expect(t.includes(dailyIdFor(n)), `#${n}`).toBe(false)
      expect(t.includes('(')).toBe(false)
    }
  })
  it('유리알은 별 수만큼 앞에서부터 — 칸 위치에 뜻이 없어 mask 유무로 같은 기록이 다르게 보이지 않는다', () => {
    expect(shareTextV2({ stars: 3, moves: 2, ticks: 312, mask: 7 }, 42)).toBe(
      'Sandlab Daily #42 ●●● 2 moves · 5.2s\nhttps://sandlab.app/daily',
    )
    const clearPar = shareTextV2({ stars: 2, moves: 1, ticks: 60, mask: DAILY_MASK_CLEAR | DAILY_MASK_PAR }, 42)
    const clearGem = shareTextV2({ stars: 2, moves: 1, ticks: 60, mask: DAILY_MASK_CLEAR | DAILY_MASK_GEM }, 42)
    const noMask = shareTextV2({ stars: 2, moves: 1, ticks: 60 }, 42)
    expect(clearPar).toBe('Sandlab Daily #42 ●●○ 1 move · 1.0s\nhttps://sandlab.app/daily')
    expect(clearGem).toBe(clearPar)
    expect(noMask).toBe(clearPar)
  })
  it('mask가 있으면 별 수는 mask 비트 수를 따른다', () => {
    expect(shareTextV2({ stars: 3, moves: 3, mask: DAILY_MASK_CLEAR }, 9)).toBe('Sandlab Daily #9 ●○○ 3 moves\nhttps://sandlab.app/daily')
  })
  it('mask 없는 옛 기록은 별 수만큼 앞에서부터 채운다, ticks 없으면 시간 생략', () => {
    expect(shareTextV2({ stars: 2, moves: 1 }, 39)).toBe('Sandlab Daily #39 ●●○ 1 move\nhttps://sandlab.app/daily')
    expect(shareTextV2({ stars: 1, moves: 6 }, 1)).toBe('Sandlab Daily #1 ●○○ 6 moves\nhttps://sandlab.app/daily')
  })
  it('별 수는 0~3으로 자른다', () => {
    expect(shareTextV2({ stars: 9, moves: 1 }, 2)).toContain(' ●●● ')
    expect(shareTextV2({ stars: -1, moves: 1 }, 2)).toContain(' ○○○ ')
  })
  it('이모지(그림 문자)를 쓰지 않는다', () => {
    const t = shareTextV2({ stars: 3, moves: 2, ticks: 312, mask: 7 }, 42)
    expect(/\p{Extended_Pictographic}/u.test(t)).toBe(false)
  })
  it('기존 shareText는 그대로 남아 있다(지금 화면이 씀, P5에서 교체)', () => {
    expect(shareText(39, 2, 1, '1-4')).toBe('Sandlab Daily #39 (1-4) ⭐⭐ 1 move\nhttps://sandlab.app/daily')
  })
})
