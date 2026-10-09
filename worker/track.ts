/**
 * /api/track 본문 검증 — 화이트리스트 이벤트만, AE 카디널리티·남용을 원천 차단.
 * 챌린지 이벤트는 레벨 id(ref)와 잉크(value)만 싣는다. 개인 식별자는 받지 않는다.
 */
const CHALLENGE = new Set(['challenge_start', 'challenge_clear', 'challenge_reset'])
const PLAIN = new Set(['kofi_click'])
const REF = /^[a-z0-9-]{1,40}$/

export function parseTrack(body: unknown): { event: string; ref: string; value: number } | null {
  if (!body || typeof body !== 'object') return null
  const b = body as { event?: unknown; ref?: unknown; value?: unknown }
  if (typeof b.event !== 'string') return null
  const v = b.value
  const value = typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1e7 ? v : 0
  if (PLAIN.has(b.event)) return { event: b.event, ref: '', value: 0 }
  if (CHALLENGE.has(b.event)) {
    if (typeof b.ref !== 'string' || !REF.test(b.ref)) return null
    return { event: b.event, ref: b.ref, value }
  }
  return null
}
