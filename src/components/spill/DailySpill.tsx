'use client'

/**
 * /daily — 오늘(UTC)의 Spill 레벨을 고르고 SpillPlayer로 플레이한다. 정적 export라 레벨은 클라이언트가 고른다.
 * 첫 클리어(별·수, 리디자인 P4부터 ticks·mask도)는 기기에 저장하고 공유 문구를 만든다.
 * 공유 문구 = shareTextV2(공식 기록 기준, 레벨 id 없음 — P5). 본문 버튼과 결과 화면(onCleared가 돌려준 text)이 같은 문구를 쓴다.
 * 새 셸(프리뷰 빌드)에서는 플레이 전에 시작 화면(@ui-shell DailyStart)을 먼저 보여 준다 — classic(prod)은 null이라 지금 그대로. 서버 계정·순위표 없음 — 레벨별 분포는 SpillPlayer의 결과 카드가 이미 보여준다.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import SpillPlayer from './SpillPlayer'
import { LEVELS } from '@/lib/spill/levels'
import { levelById } from '@/lib/spill/client/catalog'
import { describeLevel } from '@/lib/spill/client/describe'
import { dailyIdFor, dayNumber, loadDaily, saveDaily, type DailyRec } from '@/lib/spill/client/daily'
import { shareTextV2 } from '@/lib/spill/client/share'
import type { DailyClear } from '@/ui-next/shell/spillTypes'
import { DailyAside, DailyStart } from '@ui-shell'
import { trackEvent } from '@/lib/sand/gallery'
import type { LevelDef } from '@/lib/spill/level/define'

const a = { color: '#A04F00', fontWeight: 700 } as const

export default function DailySpill({ children }: { children?: ReactNode }) {
  const [today, setToday] = useState<{ n: number; level: LevelDef } | null>(null)
  const [mine, setMine] = useState<DailyRec | null>(null)
  const [share, setShare] = useState<'idle' | 'copied' | 'shared' | 'manual'>('idle')
  const [started, setStarted] = useState(false)
  // 이 세션에서 이미 공식 기록을 냈는가 — 저장이 막힌 기기(사생활 모드 등)는 loadDaily가 늘 null이라 이것으로 연습을 가린다
  const officialDone = useRef(false)

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

  const onCleared = ({ stars, moves, ticks, mask }: { stars: number; moves: number; ticks: number; mask: number }): DailyClear => {
    // 공식 기록 = 그날 첫 클리어(S4). ticks·mask도 이때만 저장된다 — 재도전(연습)은 기록을 덮지 않는다(saveDaily도 한 번 더 막는다)
    const official = !loadDaily(n) && !officialDone.current
    if (official) {
      officialDone.current = true
      saveDaily(n, { stars, moves, ticks, mask })
      trackEvent('daily_clear', level.id, moves)
    }
    // 저장이 막힌 기기(사생활 모드 등)는 이번 판을 그대로 공유한다
    const record = loadDaily(n) ?? { stars, moves, ticks, mask }
    setMine(record)
    // 상위 N%: 서버 집계 엔드포인트가 아직 없다(P5는 자리만) — null이면 결과 화면이 줄을 그리지 않는다
    return { n, official, record, text: shareTextV2(record, n), standing: null }
  }

  const text = mine ? shareTextV2(mine, n) : ''
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

  if (DailyStart && !started) {
    return (
      <DailyStart dayNumber={n} level={level} solved={!!mine} onStart={() => setStarted(true)}>
        {/* 레벨 요약(d.summary)은 보석·par 별을 말하므로 시작 화면에는 싣지 않는다(S5) — 플레이 화면 패널에는 그대로 */}
        {children}
      </DailyStart>
    )
  }

  return (
    <SpillPlayer level={level} nextId={null} onCleared={onCleared} badge={DailyStart ? `No.${n}` : undefined} back={DailyStart ? { href: '/daily', label: 'Daily start' } : undefined}>
      {/* 새 셸(P7): 레벨 id·옛 Share 버튼 없는 패널. classic은 null → 아래 지금 패널 그대로 */}
      {DailyAside ? (
        <DailyAside n={n} level={level} mine={mine}>
          {children}
        </DailyAside>
      ) : (
      <section style={{ marginTop: 18 }}>
        {/* 플레이 화면 헤더(Hud)가 이미 h1 — 페이지 제목 중복을 피해 h2(겉모습은 인라인 스타일 그대로) */}
        <h2 style={{ fontSize: 20, margin: '0 0 4px' }}>
          Daily #{n}: {level.name}
        </h2>
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
      )}
    </SpillPlayer>
  )
}
