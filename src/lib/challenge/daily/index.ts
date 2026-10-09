/**
 * 데일리 챌린지 — 날짜(UTC) → 풀 순번 → 레벨. 모두 순수 함수라 모든 사용자가 같은 날 같은 퍼즐을 받는다.
 * 풀은 검증된 /play 레벨 20개를 시드 고정으로 반전·이동한 변형 30개(transform.ts).
 */
import { LEVELS } from '../levels'
import type { Level } from '../types'
import { transformLevel, xRange } from './transform'
import { DAILY_STARS } from './stars'

/** 데일리 #1 = 2026-10-10 00:00 UTC */
export const LAUNCH_UTC = Date.UTC(2026, 9, 10)
const DAY_MS = 86_400_000

export function dayNumber(nowMs: number): number {
  return Math.max(1, Math.floor((nowMs - LAUNCH_UTC) / DAY_MS) + 1)
}

// 원본 순서 — 연속한 날 같은 메커니즘이 겹치지 않게 섞은 고정 순열(바꾸면 지난 데일리 번호가 다른 퍼즐이 된다)
const ORDER = [0, 11, 4, 15, 2, 9, 13, 6, 18, 1, 7, 14, 3, 17, 10, 5, 12, 19, 8, 16]
const POOL_SIZE = 30
// 2026-10-09 /play/verify?set=daily: d-026(oil-slick 변형)·d-028(fuse 변형)이 반전·이동 후 클리어 실패
const VERIFIED_AS_BASE = new Set(['d-026', 'd-028'])
const MAX_SHIFT = 150

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function build(i: number): Level {
  const base = LEVELS[ORDER[i % ORDER.length]]
  const rnd = mulberry32(1000 + i)
  const id = `d-${String(i + 1).padStart(3, '0')}`
  let mirror = rnd() < 0.5
  const probe = transformLevel(base, { dx: 0, mirror }, '')
  const [lo, hi] = xRange(probe)
  const a = Math.max(lo, -MAX_SHIFT)
  const b = Math.min(hi, MAX_SHIFT)
  let dx = Math.round(a + rnd() * (b - a))
  // 실크롬 검증에서 변형이 풀리지 않은 항목은 검증된 원본 배치로 고정한다(VERIFIED_AS_BASE).
  if (VERIFIED_AS_BASE.has(id)) {
    mirror = false
    dx = 0
  }
  const lvl = transformLevel(base, { dx, mirror }, id)
  const fix = DAILY_STARS[id]
  if (!fix) return lvl
  const scale = fix.scale ?? 1
  return {
    ...lvl,
    stars: fix.stars,
    palette: Object.fromEntries(Object.entries(lvl.palette).map(([m, n]) => [m, Math.ceil(n * scale)])),
  }
}

export const DAILY_POOL: Level[] = Array.from({ length: POOL_SIZE }, (_, i) => build(i))

export function dailyFor(n: number): Level {
  return DAILY_POOL[(Math.max(1, n) - 1) % DAILY_POOL.length]
}
