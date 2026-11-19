/**
 * 지층(Strata) 역산 — 리디자인 v2 S3. 기기에 남은 데일리 기록으로 최근 N일의 층을 만든다(순수 함수, UI 없음).
 *
 * - 기록 출처 두 곳을 병합한다: 옛 챌린지 데일리 `sandlab.daily.v1`({stars, ink})와 Spill 데일리
 *   `sandlab.spill-daily.v1`({stars, moves, ticks?, mask?}). 둘 다 #1 = 2026-10-09 UTC 번호 체계라 같은 날을 같은 번호로 센다.
 *   같은 번호가 둘 다 있으면 새 키가 우선. 손상 JSON·깨진 항목은 없는 것으로 친다.
 * - 층 색은 그날 레벨 재료와 무관하게 `STRATA_CYCLE[(dayNumber-1) % 10]`. 데일리 풀 9개 중 8개가 water라
 *   레벨 재료로 칠하면 파란 띠만 쌓인다(리뷰 B1). 풀(9)과 순환표(10)가 서로소라 레벨이 같은 날끼리도 색이 다르다.
 * - 결측일(기록 없음)은 missed: true, stars 0 — "공백층". 오늘을 아직 안 풀었으면 마지막 층도 missed다(표시는 P7이 결정).
 */
import { LAUNCH_UTC, DAILY_KEY, parseDailyRec, readDailyMap } from './spill/client/daily'

/** 옛 챌린지 데일리 기록 키(src/lib/challenge/daily/share.ts). 이름을 바꾸면 옛 기록이 사라진다. */
export const LEGACY_DAILY_KEY = 'sandlab.daily.v1'

/**
 * 대비 좋은 재료 10종, **순서 고정**(바꾸면 지난 지층 색이 전부 바뀐다). DECISIONS 2026-11-19 P2.
 * 옅은 salt·steam·ice·metal은 Bone 위에서 사라져 뺐다. 18종(empty 제외) 중 옅은 4종을 뺀 14종에서
 * CIELAB ΔE76 최소 쌍 거리가 가장 큰 10종을 고르고(17.8), sand를 #1로 둔 뒤 이웃한 날(순환 포함) ΔE 최소가
 * 가장 크도록 배열(72.7)했다. 빠진 4종(fire·smoke·wall·oil)은 lava·ash·stone·wood와 거의 같은 색이다.
 */
export const STRATA_CYCLE = ['sand', 'gunpowder', 'seed', 'lava', 'ash', 'acid', 'stone', 'plant', 'wood', 'water'] as const
export type StrataMaterial = (typeof STRATA_CYCLE)[number]

export type Stratum = {
  dayNumber: number
  /** 그 번호의 UTC 날짜 YYYY-MM-DD */
  dateUTC: string
  material: StrataMaterial
  stars: 0 | 1 | 2 | 3
  missed: boolean
}

const DAY_MS = 86_400_000

export function strataMaterial(dayNumber: number): StrataMaterial {
  const i = (((Math.floor(dayNumber) - 1) % STRATA_CYCLE.length) + STRATA_CYCLE.length) % STRATA_CYCLE.length
  return STRATA_CYCLE[i]
}

export function dateUTCFor(dayNumber: number): string {
  return new Date(LAUNCH_UTC + (Math.floor(dayNumber) - 1) * DAY_MS).toISOString().slice(0, 10)
}

/** 옛 기록 {stars, ink}의 유효성 — stars만 본다(층에는 별만 쓴다). */
function legacyStars(v: unknown): number | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const s = (v as { stars?: unknown }).stars
  return typeof s === 'number' && Number.isFinite(s) ? s : null
}

function readKey(storage: Pick<Storage, 'getItem'>, key: string): Record<string, unknown> | null {
  try {
    return readDailyMap(storage.getItem(key))
  } catch {
    return null // 저장소 접근 자체가 막힘(사파리 사생활 모드 등)
  }
}

const clamp = (s: number) => Math.max(0, Math.min(3, Math.round(s))) as 0 | 1 | 2 | 3

/**
 * 오늘(today = dayNumber(Date.now()))까지 최근 `days`일의 층, 오래된 날 → 오늘 순서.
 * #1 이전 날은 만들지 않는다(그래서 출시 초기엔 days보다 짧다).
 */
export function readStrata(storage: Pick<Storage, 'getItem'>, today: number, days = 30): Stratum[] {
  const last = Math.floor(today)
  const first = Math.max(1, last - Math.floor(days) + 1)
  if (last < 1 || first > last) return []
  const fresh = readKey(storage, DAILY_KEY)
  const legacy = readKey(storage, LEGACY_DAILY_KEY)
  const out: Stratum[] = []
  for (let n = first; n <= last; n++) {
    const rec = parseDailyRec(fresh?.[n])
    const stars = rec ? rec.stars : legacyStars(legacy?.[n])
    out.push({
      dayNumber: n,
      dateUTC: dateUTCFor(n),
      material: strataMaterial(n),
      stars: stars === null ? 0 : clamp(stars),
      missed: stars === null,
    })
  }
  return out
}
