/**
 * 헤더 데일리 모래시계 pill의 글자(P3). 순수 함수 — 시각은 호출하는 쪽(클라이언트)이 넘긴다.
 * 새 퍼즐은 UTC 자정에 바뀐다(src/lib/spill/client/daily.ts dayNumber와 같은 기준).
 * SSR(정적 HTML)은 시각을 모르므로 SSR_PILL(시간 없는 문구)을 그리고, 마운트 뒤에만 남은 시간을 채운다.
 */
import { dayNumber } from '@/lib/spill/client/daily'

const DAY_MS = 86_400_000

export type PillText = { no: string; left: string; label: string }

// 접근 이름은 보이는 글자로 시작한다(WCAG 2.5.3 label-in-name — 음성 입력으로 "Daily"라고 말해도 눌리게). axe 실측으로 고침.
// P9(P6 3초 테스트 3/5 "No.42 00:52가 뭔지 모르겠다"): 보이는 글자는 늘 'Daily'로 시작하고 번호는 접근 이름에만 둔다.
// 보이는 글자 = `${no} · ${left}`(예 "Daily · 06:12") — ShellHeader가 left 앞에 ' · '를 붙인다.
export const SSR_PILL: PillText = { no: 'Daily', left: '', label: 'Daily puzzle' }

/** 다음 UTC 자정까지 남은 ms(0 < x ≤ 하루). 정확히 자정이면 하루 전체. */
export function msUntilUtcMidnight(nowMs: number): number {
  return DAY_MS - (((nowMs % DAY_MS) + DAY_MS) % DAY_MS)
}

export function pillText(nowMs: number): PillText {
  const n = dayNumber(nowMs)
  // 분 단위 올림: 남은 1분 미만이 00:00("끝났다")으로 읽히지 않게 00:01로 보인다. 자정 정각은 24:00.
  const mins = Math.ceil(msUntilUtcMidnight(nowMs) / 60_000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const pad = (x: number) => String(x).padStart(2, '0')
  return {
    no: 'Daily',
    left: `${pad(h)}:${pad(m)}`,
    label: `Daily · ${pad(h)}:${pad(m)}, puzzle No.${n}, ${h} ${h === 1 ? 'hour' : 'hours'} ${m} ${m === 1 ? 'minute' : 'minutes'} left`,
  }
}
