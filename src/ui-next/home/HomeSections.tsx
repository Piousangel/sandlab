'use client'

/**
 * 홈 아래쪽 세 구역 — 오늘 카드(S5: 실루엣·제목·한 줄 + Solve today), 지층 띠(P2 readStrata, 띠 + "N days"만),
 * 벽 미리보기(갤러리 2점, 없으면 한 줄). 셋 다 높이를 CSS로 예약해 마운트 뒤 내용이 바뀌어도 아래가 밀리지 않는다(CLS).
 */
import { useEffect, useRef, useState } from 'react'
import { PRESETS } from '@/lib/sand/materials'
import { dayNumber, dailyIdFor } from '@/lib/spill/client/daily'
import { levelById } from '@/lib/spill/client/catalog'
import { describeLevel } from '@/lib/spill/client/describe'
import { LEVELS } from '@/lib/spill/levels'
import { SpillController } from '@/lib/spill/play/controller'
import { SpillRenderer } from '@/lib/spill/render/canvas'
import { listScenes, type SceneMeta } from '@/lib/sand/gallery'
import { readStrata, type Stratum } from '@/lib/strata'
import { Icon } from '../icons/Icon'
import { goalLine } from '../spill/DailyStart'
import { daysLabel, strataBand } from './model'

const COLOR: Record<string, string> = Object.fromEntries(PRESETS.map((m) => [m.slug, m.color]))

function useToday() {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => setN(dayNumber(Date.now())), [])
  if (n === null) return null
  const level = levelById(LEVELS, dailyIdFor(n))
  return level ? { n, level } : null
}

export function TodayCard() {
  const today = useToday()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !today) return
    try {
      // 시작 전 판(틱 0) 한 장 — 데일리 시작 화면(P4)과 같은 방법, 시뮬은 돌리지 않는다
      new SpillRenderer(c).draw(new SpillController(today.level).sim.grid, 0)
    } catch {
      /* 2d 컨텍스트가 없으면 빈 유리 */
    }
  }, [today])
  const goal = today ? describeLevel(today.level).goals : []
  return (
    <section className="sl-home-sec" aria-labelledby="sl-today-h">
      <h2 className="sl-home-label" id="sl-today-h">
        Today
      </h2>
      <div className="sl-today">
        <div className="sl-today-sil">
          <canvas ref={canvasRef} width={160} height={240} className="sl-today-canvas" aria-hidden="true" />
        </div>
        <div className="sl-today-txt">
          <p className="sl-today-kicker">{today ? `Daily No.${today.n}` : 'Daily puzzle'}</p>
          <p className="sl-today-title">{today ? today.level.name : 'Today’s puzzle'}</p>
          <p className="sl-today-goal">{goal.length ? goalLine(goal) : 'A new puzzle every day.'}</p>
        </div>
      </div>
      <a href="/daily" className="sl-cta">
        <span>Solve today</span>
        <Icon name="next" />
      </a>
    </section>
  )
}

export function StrataBand() {
  const [band, setBand] = useState<Stratum[] | null>(null)
  useEffect(() => {
    try {
      setBand(strataBand(readStrata(localStorage, dayNumber(Date.now()))))
    } catch {
      setBand([])
    }
  }, [])
  const empty = !band || band.length === 0
  return (
    <section className="sl-home-sec" aria-labelledby="sl-strata-h">
      <div className="sl-home-row">
        <h2 className="sl-home-label" id="sl-strata-h">
          Your strata
        </h2>
        <span className="sl-home-label sl-home-meta">{band ? daysLabel(band) : ''}</span>
      </div>
      <div className="sl-strata" data-empty={empty || undefined} role="img" aria-label={empty ? 'No layers yet' : `${daysLabel(band!)} of daily puzzles`}>
        {band?.map((s) => (
          <span
            key={s.dayNumber}
            className="sl-stratum"
            data-missed={s.missed || undefined}
            style={s.missed ? undefined : { background: COLOR[s.material] }}
          />
        ))}
        {band && empty && <span className="sl-strata-note">Solve a daily puzzle to lay your first layer.</span>}
      </div>
    </section>
  )
}

export function WallPreview() {
  const [scenes, setScenes] = useState<SceneMeta[] | null>(null)
  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        let r = (await listScenes('hot')).scenes
        if (r.length < 2) {
          const seen = new Set(r.map((s) => s.id))
          r = r.concat((await listScenes('new')).scenes.filter((s) => !seen.has(s.id)))
        }
        if (!off) setScenes(r.slice(0, 2))
      } catch {
        if (!off) setScenes([])
      }
    })()
    return () => {
      off = true
    }
  }, [])
  return (
    <section className="sl-home-sec" aria-labelledby="sl-wall-h">
      <div className="sl-home-row">
        <h2 className="sl-home-label" id="sl-wall-h">
          On the wall
        </h2>
        <a href="/gallery" className="sl-home-label sl-home-more">
          Browse
          <Icon name="next" size={16} />
        </a>
      </div>
      <ul className="sl-wall">
        {scenes && scenes.length === 0 && (
          <li className="sl-wall-empty">
            <a href="/gallery">The wall is quiet right now. Open the gallery.</a>
          </li>
        )}
        {(scenes ?? [null, null]).map((s, i) =>
          s ? (
            <li key={s.id}>
              <a href={`/#s=${s.id}`} className="sl-wall-card">
                <span className="sl-wall-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/scenes/${s.id}/thumb`} alt="" loading="lazy" width={320} height={160} />
                </span>
                <span className="sl-wall-title">{s.title || 'Untitled'}</span>
                <span className="sl-wall-meta">
                  <Icon name="remix" size={16} />
                  {s.remixCount === 1 ? '1 remix' : `${s.remixCount ?? 0} remixes`}
                </span>
              </a>
            </li>
          ) : (
            <li key={i} aria-hidden="true">
              <span className="sl-wall-card">
                <span className="sl-wall-frame" />
              </span>
            </li>
          ),
        )}
      </ul>
    </section>
  )
}
