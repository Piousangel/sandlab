'use client'

/**
 * 데일리 챌린지 — 날짜(UTC)로 오늘의 레벨을 고르고(정적 export라 클라이언트에서), 클리어하면 서버에
 * 제출(IP당 하루 1건) → 오늘 통계로 대략의 위치 → 공유. 공유는 사용자 클릭으로만, 실패를 성공으로
 * 표시하지 않는다(인계서 activation 함정).
 */
import { useEffect, useState } from 'react'
import ChallengePlayer from './ChallengePlayer'
import { dayNumber, dailyFor } from '@/lib/challenge/daily'
import { shareText, rankLabel, loadDaily, saveDaily } from '@/lib/challenge/daily/share'
import type { Level } from '@/lib/challenge/types'

type Stats = { clears: number; inkPercentiles: number[]; stars: [number, number, number] }

export default function DailyPlayer() {
  const [today, setToday] = useState<{ n: number; level: Level } | null>(null)
  const [mine, setMine] = useState<{ stars: number; ink: number } | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [share, setShare] = useState<'idle' | 'copied' | 'shared' | 'manual'>('idle')

  useEffect(() => {
    const n = dayNumber(Date.now())
    setToday({ n, level: dailyFor(n) })
    setMine(loadDaily(n))
  }, [])

  useEffect(() => {
    if (!today) return
    // 내 기록이 생긴 뒤엔 캐시(60초)를 건너뛴다 — 방금 제출한 내 결과가 통계에 보이도록
    fetch(`/api/daily/${today.n}/stats`, { cache: mine ? 'no-store' : 'default' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setStats(s))
      .catch(() => {})
  }, [today, mine])

  if (!today) return <p style={{ opacity: 0.6 }}>Loading today&apos;s challenge…</p>

  const onClear = async ({ stars, ink, autoplay }: { stars: 1 | 2 | 3; ink: number; autoplay: boolean }) => {
    const first = !loadDaily(today.n)
    // autoplay(검증용)는 로컬에서만 제출한다 — 실서비스 통계를 오염시키지 않게
    const submit = first && (!autoplay || location.hostname === 'localhost')
    if (!autoplay) saveDaily(today.n, { stars, ink })
    if (submit) {
      try {
        await fetch('/api/daily', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ day: today.n, levelId: today.level.id, ink, stars }),
        })
      } catch {
        /* 오프라인 — 결과는 그대로 보여준다 */
      }
    }
    setMine(loadDaily(today.n) ?? { stars, ink })
  }

  const text = mine ? shareText(today.n, mine.stars, mine.ink) : ''
  const doShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text })
        setShare('shared')
        return
      }
      await navigator.clipboard.writeText(text)
      setShare('copied')
    } catch {
      setShare('manual') // 거짓 'copied' 금지 — 직접 복사할 수 있게 문구를 보여준다
    }
  }

  const extra = mine && (
    <div style={{ margin: '0 0 14px', fontSize: 13.5 }}>
      <p style={{ margin: '0 0 8px', opacity: 0.8 }}>
        {stats ? `${rankLabel(mine.ink, stats.inkPercentiles)} · ${stats.clears.toLocaleString('en-US')} solved so far` : 'Daily #' + today.n}
      </p>
      <button
        onClick={doShare}
        style={{ background: '#f5a623', color: '#07090D', border: 0, borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
      >
        {share === 'copied' ? 'Copied ✓' : share === 'shared' ? 'Shared ✓' : 'Share result'}
      </button>
      {share === 'manual' && (
        <textarea readOnly value={text} onFocus={(e) => e.currentTarget.select()} rows={2} style={{ display: 'block', margin: '8px auto 0', width: '100%', maxWidth: 320, background: '#111', color: '#eef1f6', border: '1px solid #333', borderRadius: 6, fontSize: 12.5 }} />
      )}
    </div>
  )

  return (
    <>
      <h1 style={{ fontSize: 26, margin: '0 0 4px' }}>
        Daily #{today.n}: {today.level.title}
      </h1>
      <p style={{ margin: '0 0 12px', fontSize: 13.5, opacity: 0.6 }}>
        {mine ? `You solved today's puzzle with ${mine.ink.toLocaleString('en-US')} ink. Play again for fun; only your first clear counts.` : 'Everyone gets the same puzzle today. A new one starts at midnight UTC.'}
      </p>
      <ChallengePlayer level={today.level} onClear={onClear} resultExtra={extra} />
    </>
  )
}
