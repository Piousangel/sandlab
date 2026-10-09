/**
 * 데일리 제출 검증·통계 — 워커엔 GPU가 없어 플레이를 재생 검증할 수 없다. 그래서 순위표 없이
 * 집계만 내고, 형식·범위·일관성(그날 레벨, 예산 안 잉크, 잉크로 계산한 별)만 확인한다.
 */
import { dayNumber, dailyFor } from '../src/lib/challenge/daily'
import { starsFor } from '../src/lib/challenge/clear'

export interface DailySubmit {
  day: number
  levelId: string
  ink: number
  stars: 1 | 2 | 3
}

export function validateDaily(body: unknown, nowMs: number): DailySubmit | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const { day, levelId, ink, stars } = b
  if (!Number.isInteger(day) || typeof levelId !== 'string' || !Number.isInteger(ink) || !Number.isInteger(stars)) return null
  const today = dayNumber(nowMs)
  if (Math.abs((day as number) - today) > 1 || (day as number) < 1) return null // 시간대 경계 ±1일
  const lvl = dailyFor(day as number)
  if (lvl.id !== levelId) return null
  const budget = Object.values(lvl.palette).reduce((a, n) => a + n, 0)
  if ((ink as number) < 1 || (ink as number) > budget) return null
  if (starsFor(ink as number, lvl.stars) !== stars) return null
  return { day: day as number, levelId, ink: ink as number, stars: stars as 1 | 2 | 3 }
}

/** 최근접 순위 백분위(p10·25·50·75·90) + 별 분포 [1★, 2★, 3★]. */
export function summarize(rows: { ink: number; stars: number }[]) {
  const inks = rows.map((r) => r.ink).sort((a, b) => a - b)
  const pct = (p: number) => inks[Math.max(0, Math.ceil((p / 100) * inks.length) - 1)]
  const stars: [number, number, number] = [0, 0, 0]
  for (const r of rows) if (r.stars >= 1 && r.stars <= 3) stars[r.stars - 1]++
  return { clears: rows.length, inkPercentiles: inks.length ? [10, 25, 50, 75, 90].map(pct) : [], stars }
}
