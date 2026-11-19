'use client'

/**
 * 새 결과 화면(리디자인 P5, S1 = A 라이트). 프리뷰 빌드에서만 shell/next.ts를 거쳐 들어온다(classic = null → 지금 ResultCard).
 *
 * Bone 벽에 못 하나와 1px 걸이줄로 걸린 액자 — 안에는 실제 종료 보드(엔진 캔버스를 이 화면이 처음 그려질 때 한 번 복사, 목업 아님).
 * 그 아래 박물관 캡션 카드(Daily No.N · 이름 · 유리알 · 수 · 시간), 데일리 공식 기록이면 "+1 stratum".
 * 주 행동 = "Share image"(Ember 하나). 보조 = Copy text · Practice for 3 stars(S4 — 공식 기록은 첫 클리어, 문구로 명시) · Next level(레벨 모드).
 * 레벨 id는 화면에 없다. reduced-motion이면 처음부터 최종 상태(애니메이션·별 순차 공개 없음).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PRESETS } from '@/lib/sand/materials'
import { strataMaterial } from '@/lib/strata'
import { levelShareText } from '@/lib/spill/client/share'
import { describeLevel } from '@/lib/spill/client/describe'
import type { DailyRec } from '@/lib/spill/client/daily'
import { formatMoves, formatSecs } from '@/lib/spill/play/score'
import { trackEvent } from '@/lib/sand/gallery'
import { Icon } from '../icons/Icon'
import { msUntilUtcMidnight } from '../shell/dailyPill'
import type { SpillResultProps } from '../shell/spillTypes'
import {
  SHARE_FORMATS, caption, officialNote, practiceLabel, resultBoardScale, shareFileName, shareRoute, standingLine, type ShareFormat,
} from './model'
import { loadShareFonts, renderSharePng, type ShareCard } from './shareImage'

type Status = { text: string; manual?: boolean } | null

const pad = (x: number) => String(x).padStart(2, '0')
function untilText(nowMs: number): string {
  const mins = Math.ceil(msUntilUtcMidnight(nowMs) / 60_000)
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
}

function prefersReduced(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function SpillResult(p: SpillResultProps) {
  const { layout: l, level, daily } = p
  const desk = l.desktop
  const [reduced] = useState(prefersReduced)
  const got = [p.stars.clear, p.stars.gems, p.stars.par]
  const instant = reduced || p.starGapMs <= 0 || p.solution
  const [shown, setShown] = useState(instant ? 3 : 0)
  const [fmt, setFmt] = useState<ShareFormat>('square')
  const [status, setStatus] = useState<Status>(null)
  const [until, setUntil] = useState('')
  const [scale, setScale] = useState(() => resultBoardScale(l.vw, l.vh, 3, desk))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const pngs = useRef<Partial<Record<ShareFormat, Promise<Blob>>>>({})
  const ready = useRef<Partial<Record<ShareFormat, Blob>>>({})

  const cap = caption({ name: level.name, world: level.world, moves: p.moves, ticks: p.ticks, stars: p.stars, daily, solution: p.solution })
  const text = daily ? daily.text : levelShareText(level, p.stars.count, p.moves, p.ticks)
  const standing = daily ? standingLine(daily.standing) : null
  const note = p.solution ? null : officialNote(daily)
  // 데일리 연습 판: 액자 보드는 이번(연습) 판인데 공유는 공식 기록이라 이미지가 두 판을 섞게 된다(독립 리뷰 차단 1)
  // → 이미지 공유를 빼고 주 행동을 공식 기록 텍스트 복사로(Ember 하나 유지)
  const practice = !!daily && !daily.official
  const mat = daily ? strataMaterial(daily.n) : null
  const matColor = mat ? (PRESETS.find((m) => m.slug === mat)?.color ?? '#E8C87A') : null
  const d = describeLevel(level)
  const plate = d.materials.length ? d.materials.join(', ') : null

  // 실제 종료 프레임 복사 — 화면이 그려지기 전에(첫 페인트에 빈 액자가 보이지 않게). 이후 엔진 캔버스는 계속 돌아도 액자는 멈춘 그림.
  useLayoutEffect(() => {
    setScale(resultBoardScale(l.vw, l.vh, window.devicePixelRatio || 1, desk))
  }, [l.vw, l.vh, desk])

  // 엔진 캔버스(재료 + 발광은 같은 캔버스에 합성됨)만 복사한다 — 오버레이 캔버스(목표 테두리·연출 입자)는 넣지 않는다(작품만 건다)
  useLayoutEffect(() => {
    const src = p.board()
    const dst = canvasRef.current
    const ctx = dst?.getContext('2d', { alpha: false })
    if (src && ctx) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(src, 0, 0, dst!.width, dst!.height)
    }
    primaryRef.current?.focus({ preventScroll: true })
    // 닫힐 때(Practice·Retry → 준비 단계) 포커스를 RUN으로 돌려준다 — 결과 화면과 함께 포커스가 body로 사라지지 않게.
    // 실제로 문서에서 빠졌을 때만(StrictMode 재마운트에서 Share image 포커스를 빼앗지 않게)
    const node = rootRef.current
    return () => {
      requestAnimationFrame(() => {
        if (node && !node.isConnected) document.querySelector<HTMLElement>('[data-spill-run]')?.focus({ preventScroll: true })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 별(유리알) 순차 공개 — 지금 결과 카드와 같은 간격·효과음 훅. reduced-motion·간격 0이면 즉시 최종.
  useEffect(() => {
    if (p.solution) return
    if (instant) {
      got.forEach((g, i) => g && p.onStar(i))
      return
    }
    const ts = [0, 1, 2].map((i) =>
      setTimeout(() => {
        setShown(i + 1)
        if (got[i]) p.onStar(i)
      }, i * p.starGapMs + 120),
    )
    return () => ts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!daily) return
    const tick = () => setUntil(untilText(Date.now()))
    tick()
    const id = window.setInterval(tick, 15_000)
    return () => window.clearInterval(id)
  }, [daily])

  // 공유 PNG는 미리 만들어 둔다 — 누른 순간 바로 navigator.share를 불러야 사용자 활성화(iOS)가 살아 있다. 크기는 data 속성으로 남긴다(QA 실측).
  const card: ShareCard = daily
    ? { kicker: 'Sandlab Daily', title: `No.${daily.n}`, beads: daily.record.stars, stat: recordStat(daily.record) }
    : { kicker: `Sandlab Spill · World ${level.world}`, title: level.name, beads: p.stars.count, stat: cap.stat }
  const png = (f: ShareFormat): Promise<Blob> | null => {
    const c = canvasRef.current
    if (!c) return null
    if (!pngs.current[f]) {
      pngs.current[f] = loadShareFonts().then(() => renderSharePng(c, card, f))
      void pngs.current[f]!.then((b) => {
        ready.current[f] = b
        rootRef.current?.setAttribute(`data-png-${f}`, String(b.size))
      }).catch(() => {})
    }
    return pngs.current[f]!
  }
  useEffect(() => {
    if (p.solution || practice) return
    const id = window.setTimeout(() => {
      png('square')
      png('wide')
    }, 300)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copyText = async (why?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus({ text: why ? `${why} Copied the result text instead.` : 'Copied the result text.' })
    } catch {
      setStatus({ text: why ?? 'Copy the result text below.', manual: true })
    }
  }

  const shareImage = async () => {
    if (daily) trackEvent('share_click', 'daily')
    const finePointer = !!window.matchMedia?.('(pointer: fine)').matches
    const route = shareRoute({
      canShareFiles:
        typeof navigator.canShare === 'function' && typeof File === 'function' && navigator.canShare({ files: [new File([new Uint8Array(1)], 'probe.png', { type: 'image/png' })], title: 'Sandlab' }),
      finePointer,
    })
    const pending = png(fmt)
    if (route === 'copy-text' || !pending) return copyText('Image sharing is not supported on this device.')
    // 미리 만든 PNG가 있으면 기다리지 않고 바로 share(사용자 활성화가 살아 있을 때). 아직이면 기다린다 — iOS가 거절하면 아래 폴백
    let blob: Blob | undefined = ready.current[fmt]
    if (!blob) {
      try {
        blob = await pending
      } catch {
        return copyText('The image could not be made.')
      }
    }
    const name = shareFileName(daily, level.name, fmt)
    if (route === 'share-file') {
      try {
        // files + title만 — files와 text를 같이 주면 일부 앱(WhatsApp)이 이미지를 버린다(06시 리서치 2). 텍스트는 Copy text로 따로
        await navigator.share({ files: [new File([blob], name, { type: 'image/png' })], title: card.kicker + ' ' + card.title })
        setStatus({ text: 'Shared.' })
        return
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return setStatus(null)
        // 활성화 만료·대상 거절 → 터치 기기는 텍스트 복사, 데스크톱은 다운로드
        if (!finePointer) return copyText('The share sheet could not open.')
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setStatus({ text: `Image saved as ${name}.` })
  }

  const skip = () => {
    if (shown < 3) {
      setShown(3)
      p.onSkip()
    }
  }

  const frameW = scale.cssW + 16
  return (
    <section
      ref={rootRef}
      className="sl-rs"
      data-desk={desk ? '1' : undefined}
      data-reduced={reduced ? '1' : undefined}
      role="dialog"
      aria-label={p.solution ? 'Solution replay' : 'Level cleared'}
      style={{ top: desk ? 56 : 48 }}
      onClick={skip}
    >
      <div className="sl-rs-in">
        <div className="sl-rs-wall">
          <div className="sl-rs-hang" style={{ width: frameW }}>
            <span className="sl-rs-nail" aria-hidden />
            <svg className="sl-rs-wire" width={frameW} height={36} viewBox={`0 0 ${frameW} 36`} aria-hidden focusable="false">
              <path d={`M${Math.round(frameW * 0.14)} 36 L${frameW / 2} 4 L${frameW - Math.round(frameW * 0.14)} 36`} />
            </svg>
            <figure className="sl-rs-frame">
              <canvas
                ref={canvasRef}
                width={160}
                height={240}
                className="sl-rs-board"
                style={{ width: scale.cssW, height: scale.cssH }}
                role="img"
                aria-label={`Final board, ${level.name}`}
              />
            </figure>
          </div>
        </div>

        <div className="sl-rs-side">
          <div className="sl-rs-cap">
            <p className="sl-rs-kicker">{cap.kicker}</p>
            <h2 className="sl-rs-title">{cap.title}</h2>
            {p.solution ? (
              <p className="sl-rs-stat">{cap.stat}. Your own plan comes back when you try it.</p>
            ) : (
              <>
                <div className="sl-rs-stars">
                  <span className="sl-rs-beads" aria-hidden>
                    {[0, 1, 2].map((i) => {
                      // 찬 알은 앞에서부터(공유 텍스트와 같은 규칙), 순차 공개 중엔 아직 안 연 칸을 빈 알로. key가 바뀌면 다시 마운트돼 한 번 튄다
                      const full = i < p.stars.count && i < shown
                      return <Icon key={`${i}-${full ? 'f' : 'e'}`} name={full ? 'star-full' : 'star-empty'} size={26} className="sl-rs-bead" />
                    })}
                  </span>
                  <span className="sl-rs-starsl">{cap.starsLabel}</span>
                </div>
                <p className="sl-rs-parts">
                  {cap.parts.map((x, i) => (
                    <span key={x.label} data-got={x.got ? '1' : undefined}>
                      {i > 0 && <span aria-hidden> &middot; </span>}
                      {x.got ? x.label : <s>{x.label}</s>}
                      {!x.got && <span className="sl-sr"> (missed)</span>}
                    </span>
                  ))}
                </p>
                <p className="sl-rs-stat">
                  {cap.stat}
                  {plate && <span className="sl-rs-plate"> &middot; {plate}</span>}
                </p>
                {standing && <p className="sl-rs-standing">{standing}</p>}
              </>
            )}
          </div>

          {daily?.official && !p.solution && (
            <p className="sl-rs-stratum">
              <span className="sl-rs-swatch" style={{ background: matColor ?? undefined }} aria-hidden />
              <span>+1 stratum</span>
            </p>
          )}

          <div className="sl-rs-actions" onClick={(e) => e.stopPropagation()}>
            {p.solution ? (
              <button ref={primaryRef} type="button" className="sl-rs-share" onClick={p.onPractice}>
                <Icon name="retry" />
                <span>Try it yourself</span>
              </button>
            ) : (
              <>
                {practice ? (
                  <div className="sl-rs-primary">
                    <button ref={primaryRef} type="button" className="sl-rs-share" onClick={() => void copyText()}>
                      <Icon name="share" />
                      <span>Copy today&apos;s result</span>
                    </button>
                  </div>
                ) : (
                  <div className="sl-rs-primary">
                    <button ref={primaryRef} type="button" className="sl-rs-share" onClick={() => void shareImage()}>
                      <Icon name="frame" />
                      <span>Share image</span>
                    </button>
                    <div className="sl-rs-fmt" role="group" aria-label="Image shape">
                      {(Object.keys(SHARE_FORMATS) as ShareFormat[]).map((f) => (
                        <button key={f} type="button" aria-pressed={fmt === f} onClick={() => setFmt(f)}>
                          {SHARE_FORMATS[f].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="sl-rs-sec">
                  {!practice && (
                    <button type="button" className="sl-rs-btn" onClick={() => void copyText()}>
                      <Icon name="share" />
                      <span>Copy text</span>
                    </button>
                  )}
                  <button type="button" className="sl-rs-btn" onClick={p.onPractice}>
                    <Icon name="retry" />
                    <span>{practiceLabel(!!daily, p.stars.count)}</span>
                  </button>
                  {!daily && (
                    <a className="sl-rs-btn" href={p.nextHref ?? '/play'}>
                      <span>{p.nextHref ? 'Next level' : 'All levels'}</span>
                      <Icon name="next" />
                    </a>
                  )}
                </div>
                {note && <p className="sl-rs-note">{note}</p>}
                <p className="sl-rs-status" role="status" aria-live="polite">
                  {status?.text}
                </p>
                {status?.manual && <textarea className="sl-rs-copy" readOnly value={text} rows={2} aria-label="Result text" onFocus={(e) => e.currentTarget.select()} />}
              </>
            )}
          </div>

          {daily && !p.solution && <p className="sl-rs-until">{until ? `Next puzzle in ${until}` : 'Next puzzle at midnight UTC'}</p>}
        </div>
      </div>
    </section>
  )
}

/** 공유 이미지의 수·시간 = 공식 기록(공유 텍스트와 같은 기록 — 연습 판에서도 이미지·텍스트가 같은 것을 말한다). */
export function recordStat(r: DailyRec): string {
  return r.ticks !== undefined ? `${formatMoves(r.moves)} \u00b7 ${formatSecs(r.ticks)}` : formatMoves(r.moves)
}
