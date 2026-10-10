/**
 * /api/track 본문 검증 — 화이트리스트 이벤트만, AE 카디널리티·남용을 원천 차단.
 * 챌린지 이벤트는 레벨 id(ref)와 잉크(value)만 싣는다. 개인 식별자는 받지 않는다.
 * S1 계측: gpu_unsupported·puzzle_land는 UA 분류(kakao|insta|other)만, share_click은 공유 지점만 ref로 받는다.
 */
import { UA_CLASSES, SHARE_SURFACES } from '../src/lib/sand/ua'

const CHALLENGE = new Set(['challenge_start', 'challenge_clear', 'challenge_reset'])
const PLAIN = new Set(['kofi_click'])
const BY_UA = new Set(['gpu_unsupported', 'puzzle_land'])
const UA_REFS = new Set<string>(UA_CLASSES)
const SHARE_REFS = new Set<string>(SHARE_SURFACES)
const REF = /^[a-z0-9-]{1,40}$/

export function parseTrack(body: unknown): { event: string; ref: string; value: number } | null {
  if (!body || typeof body !== 'object') return null
  const b = body as { event?: unknown; ref?: unknown; value?: unknown }
  if (typeof b.event !== 'string') return null
  const v = b.value
  const value = typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1e7 ? v : 0
  const ref = typeof b.ref === 'string' ? b.ref : null
  if (PLAIN.has(b.event)) return { event: b.event, ref: '', value: 0 }
  if (CHALLENGE.has(b.event)) {
    if (ref === null || !REF.test(ref)) return null
    return { event: b.event, ref, value }
  }
  if (BY_UA.has(b.event)) {
    if (ref === null || !UA_REFS.has(ref)) return null
    // value = 화면 코드. gpu_unsupported: 0=홈 샌드박스, 1=퍼즐. puzzle_land: 0만. 없는 화면을 만들지 않게 거부한다.
    const raw = b.value === undefined ? 0 : b.value
    const allowed = b.event === 'gpu_unsupported' ? [0, 1] : [0]
    return allowed.includes(raw as number) ? { event: b.event, ref, value: raw as number } : null
  }
  if (b.event === 'share_click') return ref !== null && SHARE_REFS.has(ref) ? { event: b.event, ref, value: 0 } : null
  return null
}
