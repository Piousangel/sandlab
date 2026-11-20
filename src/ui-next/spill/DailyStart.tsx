'use client'

/**
 * 데일리 시작 화면(리디자인 P4). 프리뷰 빌드에서만 shell/next.ts를 거쳐 들어온다.
 *
 * 채도 낮춘 보드 미리보기(실루엣) + 이름판 + 전폭 "Solve today" + S4 한 줄("첫 클리어가 공식 기록").
 * S5: PAR·별·보석 개수 같은 스포일러는 보이지 않는다(목표 문장 한 줄만). 이미 풀었으면 "Practice"(연습 — 기록 안 덮음).
 */
import { useEffect, useRef, useState } from 'react'
import { SpillController } from '@/lib/spill/play/controller'
import { SpillRenderer, computeScale } from '@/lib/spill/render/canvas'
import { loadSoundPref, saveSoundPref } from '@/lib/spill/render/audio'
import { describeLevel } from '@/lib/spill/client/describe'
import { LAUNCH_UTC } from '@/lib/spill/client/daily'
import { Icon, IconSprite } from '../icons/Icon'
import { msUntilUtcMidnight } from '../shell/dailyPill'
import type { DailyStartProps } from '../shell/spillTypes'
import { SpillHeader } from './SpillHud'
import { StrataJar } from '../daily/StrataJar'
import { goalLine } from './goalLine'
import { preloadSpillPlayer } from '../daily/LazySpillPlayer'
import { afterLoad } from '../afterLoad'

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

function left(nowMs: number): string {
  const mins = Math.ceil(msUntilUtcMidnight(nowMs) / 60_000)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
}


/** 미리보기 크기: 정수 장치 픽셀 배율(플레이 보드와 같은 규칙), 화면 높이의 절반 안쪽. */
function previewScale() {
  const vw = document.documentElement.clientWidth || window.innerWidth
  const vh = window.innerHeight
  return computeScale(Math.min(vw - 40, 360), Math.max(160, vh * 0.44), window.devicePixelRatio || 1)
}

export function DailyStart({ dayNumber, level, solved, onStart, children }: DailyStartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ cssW: 240, cssH: 360 })
  const [sound, setSound] = useState(true)
  const [until, setUntil] = useState('')
  const d = describeLevel(level)
  // 그날 UTC 날짜 — dayNumber의 역(#1 = LAUNCH_UTC). DailySpill이 아니라 여기서 계산한다(prod 번들에 export를 늘리지 않게)
  const dateMs = LAUNCH_UTC + (dayNumber - 1) * 86_400_000

  // 플레이 화면 청크는 첫 그림 뒤에 미리 받는다(P12 LCP — LazySpillPlayer). 누르는 순간(onPointerDown·onClick)에도 부른다.
  useEffect(() => afterLoad(preloadSpillPlayer), [])

  useEffect(() => {
    setSound(loadSoundPref())
    const fit = () => {
      const s = previewScale()
      setSize({ cssW: s.cssW, cssH: s.cssH })
    }
    fit()
    window.addEventListener('resize', fit)
    const tick = () => setUntil(left(Date.now()))
    tick()
    const id = window.setInterval(tick, 15_000)
    return () => {
      window.removeEventListener('resize', fit)
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    try {
      // 시작 전 판(틱 0) 한 장만 그린다 — 시뮬은 돌리지 않는다
      const ctl = new SpillController(level)
      new SpillRenderer(c).draw(ctl.sim.grid, 0)
    } catch {
      /* 2d 컨텍스트가 없으면 빈 유리만 보인다 */
    }
  }, [level])

  const toggleSound = () => {
    const on = !sound
    setSound(on)
    saveSoundPref(on)
  }

  return (
    <div className="sl-ds">
      <IconSprite />
      <div className="sl-ds-main">
        <SpillHeader badge={null} name="Daily" backHref="/play" backLabel="All levels" sound={sound} onSound={toggleSound} heading={false} />
        <div className="sl-ds-hub">
        <div className="sl-ds-body">
          <div>
            <h1 className="sl-ds-head">
              <span className="sl-ds-kicker">
                No.{dayNumber} · {fmtDate(dateMs)}
              </span>
              <span className="sl-ds-title">{level.name}</span>
            </h1>
            {d.goals.length > 0 && <p className="sl-ds-goal">{goalLine(d.goals)}</p>}
          </div>
          <figure className="sl-ds-preview" style={{ margin: 0 }}>
            <div className="sl-ds-glass">
              <canvas
                ref={canvasRef}
                width={160}
                height={240}
                className="sl-ds-canvas"
                style={{ width: size.cssW, height: size.cssH }}
                aria-label={`Today's puzzle board, ${level.name}`}
                role="img"
              />
            </div>
            <figcaption className="sl-ds-plate">
              World {level.world} · {d.materials.length ? d.materials.join(', ') : level.name}
            </figcaption>
          </figure>
          <button
            type="button"
            className="sl-ds-go"
            onPointerDown={preloadSpillPlayer}
            onClick={() => {
              preloadSpillPlayer()
              onStart()
            }}
          >
            <span>{solved ? 'Practice' : 'Solve today'}</span>
            <Icon name="next" />
          </button>
          <p className="sl-ds-note">{solved ? "Today's official record is saved. Replays are practice." : "Your first clear is today's official record."}</p>
          <div className="sl-ds-foot">
            <span>{until ? `New puzzle in ${until}` : 'New puzzle at midnight UTC'}</span>
            <a href="/play">
              All levels
              <Icon name="next" size={16} />
            </a>
          </div>
        </div>
        {/* P7: 지층 병(최근 30일) — 오늘 카드 아래(모바일)·오른쪽(데스크톱) */}
        <StrataJar today={dayNumber} />
        </div>
      </div>
      {children && <div className="sl-sp-aside">{children}</div>}
    </div>
  )
}
