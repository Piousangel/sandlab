'use client'

import { useEffect, useState } from 'react'
import { todayFromPayload } from './visitors'

/**
 * 오늘 방문자 수(/api/visitors, 워커가 엣지 60초 캐시). 불러오는 중·실패·표 없음은 null — 화면은 자리만 잡고 비워 둔다(CLS 0).
 * 문구는 src/lib/visitors.ts의 visitorsLine(넓은 자리)·visitorsShort(좁은 자리).
 */
export function useTodayVisitors(): number | null {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/visitors')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { day?: string; today?: number | null } | null) => {
        // 응답 날짜가 지금 UTC 날짜와 다르면(자정 직후 캐시) 쓰지 않는다
        if (alive) setN(todayFromPayload(j, Date.now()))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return n
}

/** 문구 뒤에 붙는 기준 시간대 */
export const VISITORS_RESET_NOTE = 'since 00:00 UTC'
