/**
 * 북극성 측정(NORTH-STAR 2장, 11-20) — 익명 기기 id와 첫 획 이벤트.
 *
 * - 기기 id: 허브 `src/lib/hit.ts`와 같은 방식. 브라우저에서 만든 무작위 UUID를 localStorage에 둔다.
 *   계정·이메일·IP와 연결되지 않고, 브라우저 데이터를 지우면 사라진다(Privacy 'Usage statistics').
 *   `/api/track` 본문의 `d`로 실려 AE blob5에 들어간다 → 주간 손댄 방문자 = 7일 distinct blob5.
 * - 첫 획: 홈 샌드박스에서 탭(세션)당 처음 모래를 부은 순간 1회 `first_stroke`. 첫 붓기율 = first_stroke ÷ 홈 landing(value 1).
 */

export const DEVICE_KEY = 'sandlab.did'
const FIRST_STROKE_KEY = 'sl-first-stroke'
/** 서버(worker/track.ts)와 같은 형식 — UUID 또는 폴백(base36 + '-'). */
export const DEVICE_RE = /^[a-z0-9-]{8,40}$/

/** 기기 id. 저장소가 막혀 있으면 빈 문자열(서버는 blob5를 비운다 — 북극성에서 빠질 뿐 이벤트는 그대로 센다). */
export function deviceId(storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocal()): string {
  if (!storage) return ''
  try {
    const saved = storage.getItem(DEVICE_KEY)
    if (saved && DEVICE_RE.test(saved)) return saved
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
    storage.setItem(DEVICE_KEY, id)
    return id
  } catch {
    return ''
  }
}

function safeLocal(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** 이 탭에서 첫 획을 아직 보내지 않았고, 자동 검증(autoplay·webdriver)이 아니면 true를 돌려주고 표시한다. */
export function claimFirstStroke(
  session: Pick<Storage, 'getItem' | 'setItem'> | null,
  search: string,
  webdriver: boolean,
): boolean {
  if (webdriver || new URLSearchParams(search).get('autoplay')) return false
  if (!session) return false
  try {
    if (session.getItem(FIRST_STROKE_KEY)) return false
    session.setItem(FIRST_STROKE_KEY, '1')
    return true
  } catch {
    return false
  }
}
