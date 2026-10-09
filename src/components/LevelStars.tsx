'use client'

/** 레벨 목록의 내 별점 — localStorage라 클라이언트에서만. 정적 HTML엔 빈 자리. */
import { useEffect, useState } from 'react'
import { loadProgress, type Best } from '@/lib/challenge/progress'

export default function LevelStars({ id }: { id: string }) {
  const [best, setBest] = useState<Best | null>(null)
  useEffect(() => setBest(loadProgress()[id] ?? null), [id])
  if (!best) return <span style={{ fontSize: 13, opacity: 0.4 }}>not cleared yet</span>
  return (
    <span style={{ fontSize: 14, color: '#f5c98a', letterSpacing: 2 }} aria-label={`${best.stars} stars`}>
      {'★'.repeat(best.stars)}
      <span style={{ opacity: 0.25 }}>{'★'.repeat(3 - best.stars)}</span>
    </span>
  )
}
