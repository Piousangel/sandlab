'use client'

/**
 * /daily — 오늘(UTC)의 Spill 레벨을 고르고 SpillPlayer로 플레이한다. 정적 export라 레벨은 클라이언트가 고른다.
 * 첫 클리어(별·수)는 기기에 저장하고 공유 문구를 만든다. 서버 계정·순위표 없음 — 레벨별 분포는 SpillPlayer의 결과 카드가 이미 보여준다.
 */
import { useEffect, useState, type ReactNode } from 'react'
import SpillPlayer from './SpillPlayer'
import { LEVELS } from '@/lib/spill/levels'
import { levelById } from '@/lib/spill/client/catalog'
import { describeLevel } from '@/lib/spill/client/describe'
import { dailyIdFor, dayNumber, loadDaily, saveDaily, shareText, type DailyRec } from '@/lib/spill/client/daily'
import { trackEvent } from '@/lib/sand/gallery'
import type { LevelDef } from '@/lib/spill/level/define'

const a = { color: '#A04F00', fontWeight: 700 } as const

export default function DailySpill({ children }: { children?: ReactNode }) {
  const [today, setToday] = useState<{ n: number; level: LevelDef } | null>(null)
  const [mine, setMine] = useState<DailyRec | null>(null)
  const [share, setShare] = useState<'idle' | 'copied' | 'shared' | 'manual'>('idle')

  useEffect(() => {
    const n = dayNumber(Date.now())
    const level = levelById(LEVELS, dailyIdFor(n)) ?? LEVELS[0]
    setToday({ n, level })
    setMine(loadDaily(n))
    trackEvent('daily_start', level.id)
  }, [])

  if (!today) return <p style={{ opacity: 0.6, padding: 24 }}>Loading today&apos;s challenge…</p>
  const { n, level } = today
  const d = describeLevel(level)

  const onCleared = ({ stars, moves }: { stars: number; moves: number }) => {
    if (!loadDaily(n)) {
      saveDaily(n, { stars, moves })
      trackEvent('daily_clear', level.id, moves)
    }
    setMine(loadDaily(n) ?? { stars, moves })
  }

  const text = mine ? shareText(n, mine.stars, mine.moves, level.id) : ''
  const doShare = async () => {
    trackEvent('share_click', 'daily')
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

  return (
    <SpillPlayer level={level} nextId={null} onCleared={onCleared}>
      <section style={{ marginTop: 18 }}>
        <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>
          Daily #{n}: {level.name}
        </h1>
        <p style={{ margin: '0 0 10px', opacity: 0.75 }}>
          {mine
            ? `Solved today in ${mine.moves} ${mine.moves === 1 ? 'move' : 'moves'} (${'★'.repeat(mine.stars)}). Replay for fun; your first clear is what the share text uses.`
            : 'Everyone gets the same puzzle today. A new one starts at midnight UTC.'}
        </p>
        {mine && (
          <>
            <button
              onClick={doShare}
              style={{ background: '#F28A1B', color: '#3B2A1A', border: 0, borderRadius: 999, boxShadow: '0 3px 0 #C96A08', padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
            >
              {share === 'copied' ? 'Copied ✓' : share === 'shared' ? 'Shared ✓' : 'Share result'}
            </button>
            {share === 'manual' && (
              <textarea readOnly value={text} onFocus={(e) => e.currentTarget.select()} rows={3} style={{ display: 'block', marginTop: 8, width: '100%', background: '#FFFDF6', color: '#3B2A1A', border: '2px solid #EAD9B8', borderRadius: 6, fontSize: 12.5 }} />
            )}
          </>
        )}
        <h2>About today&apos;s level</h2>
        <p>{d.summary}</p>
        {level.hint && (
          <details>
            <summary style={{ cursor: 'pointer' }}>Show a hint</summary>
            <p>{level.hint}</p>
          </details>
        )}
        <p style={{ opacity: 0.75 }}>
          <a href={`/play/${level.id}`} style={a}>Open {level.id} in the level list</a> · <a href="/play" style={a}>All levels</a>
        </p>
        {children}
      </section>
    </SpillPlayer>
  )
}
