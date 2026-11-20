'use client'

/**
 * /daily 지층 병(리디자인 P7). 유리병 단면에 최근 30일 데일리가 물결 층으로 쌓이고, 오른쪽에 날짜 지시선 캡션(지시선은 여기에만 — S5).
 * 계산은 strataModel.ts(순수). 그림(SVG)은 aria-hidden이고 같은 내용을 화면 밖 목록(ol)으로 읽힌다.
 * 기록은 기기 localStorage(readStrata — 키 불변). DailySpill이 클라이언트에서만 이 화면을 그리므로 첫 렌더에서 바로 읽는다(빈 병 → 층 깜빡임·CLS 없음).
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { readStrata } from '@/lib/strata'
import { Icon } from '../icons/Icon'
import { buildJar, layerSentence, waveAmp, INK, type Jar, type JarLayer } from './strataModel'

/** 병 크기(px). 안쪽 높이는 고정 — 층이 적으면 아래에 쌓이고 위는 빈 유리(출시 초기·0층). */
export const JAR = { w: 112, innerH: 220, ix: 9, iy: 18 } as const
const IW = JAR.w - JAR.ix * 2
const H = JAR.iy + JAR.innerH + 8
const TUBE_LINE = 'rgba(42, 33, 24, 0.58)'
const INK_2 = '#5E5040'

type Pt = [number, number]
/** 경계 곡선 네 점(왼 → 오) — 시안의 '부은' 물결 단면. */
function curve(y: number, a: number): [Pt, Pt, Pt, Pt] {
  const x0 = JAR.ix
  const x1 = JAR.ix + IW
  return [
    [x0, y + a],
    [x0 + IW * 0.3, y - a],
    [x0 + IW * 0.6, y + a * 1.2],
    [x1, y - a * 0.6],
  ]
}
const f = (p: Pt) => `${Math.round(p[0] * 10) / 10} ${Math.round(p[1] * 10) / 10}`
const fwd = (c: [Pt, Pt, Pt, Pt]) => `M${f(c[0])} C${f(c[1])} ${f(c[2])} ${f(c[3])}`
const rev = (c: [Pt, Pt, Pt, Pt]) => `L${f(c[3])} C${f(c[2])} ${f(c[1])} ${f(c[0])}`

function topCurve(layers: JarLayer[], i: number) {
  return curve(JAR.iy + layers[i].top, waveAmp(layers, i))
}
function bottomCurve(layers: JarLayer[], i: number): [Pt, Pt, Pt, Pt] {
  if (i === 0) return curve(JAR.iy + JAR.innerH + 2, 0)
  return topCurve(layers, i - 1)
}

function Layer({ layers, i }: { layers: JarLayer[]; i: number }) {
  const l = layers[i]
  const t = topCurve(layers, i)
  const b = bottomCurve(layers, i)
  const region = `${fwd(t)} ${rev(b)} Z`
  if (l.kind === 'pending') {
    // '아직' — 채움 없이 점선 윤곽만(결측의 빗금 공백과 다른 모양)
    return (
      <g data-layer="pending">
        <path d={fwd(t)} fill="none" stroke={INK_2} strokeWidth={1.25} strokeDasharray="3 3" />
        <path d={`M${t[0][0] + 1.5} ${f(t[0]).split(' ')[1]} L${b[0][0] + 1.5} ${f(b[0]).split(' ')[1]} M${t[3][0] - 1.5} ${f(t[3]).split(' ')[1]} L${b[3][0] - 1.5} ${f(b[3]).split(' ')[1]}`} fill="none" stroke={INK_2} strokeWidth={1.25} strokeDasharray="3 3" />
      </g>
    )
  }
  if (l.kind === 'missed') {
    return (
      <g data-layer="missed">
        <path d={region} fill="url(#sl-st-hatch)" />
        <path d={fwd(t)} fill="none" stroke={INK_2} strokeWidth={1} strokeDasharray="2 2" opacity={0.8} />
      </g>
    )
  }
  const mid = JAR.iy + l.top + l.h / 2
  return (
    <g data-layer="solved" data-material={l.material} data-stars={l.stars} data-edge={l.edge ? '1' : undefined}>
      <path d={region} fill={l.color} />
      <path d={region} fill={`url(#sl-st-grain${l.stars})`} />
      {l.vein && (
        <g data-vein={l.vein}>
          {[0.62, 0.3, 0.8].map((x, k) => (
            <circle key={k} cx={JAR.ix + IW * x} cy={mid + (k - 1) * 0.6} r={k ? 1.3 : 1.8} fill="#FFFFFF" stroke={INK} strokeWidth={0.75} />
          ))}
        </g>
      )}
    </g>
  )
}

/**
 * 대비 3:1 미만 재료 층의 ink 1px 경계 — 모든 채움을 그린 뒤 따로 그린다(층별로 그리면 윗층 채움이 선 위쪽 절반을 덮어 0.5px이 된다 — 리뷰).
 */
function Edges({ layers }: { layers: JarLayer[] }) {
  return (
    <g data-edges="">
      {layers.map((l, i) =>
        l.edge ? (
          <path key={l.dayNumber} d={`${fwd(topCurve(layers, i))} ${i > 0 ? fwd(bottomCurve(layers, i)) : ''}`} fill="none" stroke={INK} strokeWidth={1} />
        ) : null,
      )}
    </g>
  )
}

/** 별 수 = 결(알갱이 점 밀도). 1·2·3별 패턴 + 결측 빗금. 점은 ink 반투명이라 밝은 재료(sand·seed·acid)에서도 보인다. */
function Patterns() {
  const dots: Record<1 | 2 | 3, Pt[]> = {
    1: [[2, 2]],
    2: [[2, 2], [6, 6]],
    3: [[2, 2], [6, 6], [6, 1.5]],
  }
  return (
    <defs>
      {([1, 2, 3] as const).map((s) => (
        <pattern key={s} id={`sl-st-grain${s}`} patternUnits="userSpaceOnUse" width={8} height={8}>
          {dots[s].map(([x, y], k) => (
            <rect key={k} x={x} y={y} width={1.25} height={1.25} fill={INK} opacity={0.32} />
          ))}
        </pattern>
      ))}
      <pattern id="sl-st-hatch" patternUnits="userSpaceOnUse" width={5} height={5} patternTransform="rotate(45)">
        <rect width={1} height={5} fill={INK} opacity={0.25} />
      </pattern>
      <clipPath id="sl-st-clip">
        <rect x={JAR.ix} y={JAR.iy - 6} width={IW} height={JAR.innerH + 6} rx={10} />
      </clipPath>
    </defs>
  )
}

function pickStorage(storage?: Pick<Storage, 'getItem'>): Pick<Storage, 'getItem'> | undefined {
  if (storage) return storage
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined
  }
}

function readJar(today: number, storage?: Pick<Storage, 'getItem'>): Jar {
  const s = pickStorage(storage)
  const all = s ? readStrata(s, today, today) : readStrata({ getItem: () => null }, today, today)
  return buildJar(all, today, JAR.innerH)
}

/**
 * 오늘 층을 '처음' 보는가 — 결과 화면의 "+1 stratum" 뒤 /daily로 돌아온 그 한 번만 병 입구에서 알갱이가 떨어져 층이 쌓인다.
 * 본 날은 POURED_KEY에 dayNumber로 남긴다(기록 키와 별개 — 지워져도 애니메이션이 한 번 더 날 뿐).
 */
export const POURED_KEY = 'sandlab.strata.poured.v1'
export function isFreshPour(jar: Pick<Jar, 'todayKind'>, today: number, storage?: Pick<Storage, 'getItem'>): boolean {
  if (jar.todayKind !== 'solved') return false
  let seen: string | null = null
  try {
    seen = storage?.getItem(POURED_KEY) ?? null
  } catch {
    seen = null
  }
  return seen !== String(today)
}

/**
 * 들어올 때 붓기 순서(아래 → 위). 층 사이 간격은 층 수에 맞춰 줄여, 지시선·캡션 페이드까지 합친 전체가 보상 상한(900ms) 안에 끝난다.
 * fresh(오늘 처음)이면 맨 위 층은 나머지가 다 쌓인 뒤 병 입구에서 떨어진다(이 한 번만 상한을 넘는다 — 오늘의 보상 순간).
 * 길이(settle·drop·fade)는 CSS 변수로 넘긴다 — CSS에 숫자를 따로 적지 않는다.
 */
export const POUR = { step: 28, span: 260, freshGap: 160, settle: 400, drop: 620, land: 0.72, fade: 240 } as const
export function pourDelays(n: number, fresh: boolean): { delays: number[]; end: number; total: number } {
  const step = Math.min(POUR.step, POUR.span / Math.max(1, n - 1))
  const delays = Array.from({ length: n }, (_, i) => Math.round(i * step))
  const f = fresh && n > 0
  if (f) delays[n - 1] = Math.round((n - 1) * step) + POUR.freshGap
  const last = n ? delays[n - 1] : 0
  const end = last + (f ? POUR.drop : POUR.settle)
  return { delays, end, total: end + POUR.fade }
}

/** 알갱이 한 알의 낙하 — 거리에 맞춘 길이(자유낙하처럼 √거리)와, 오늘 층이 바닥에 닿는 순간(drop의 land 지점)에 같이 닿는 지연. */
export function grainTiming(dropDelay: number, fall: number, jitter: number): { delay: number; dur: number } {
  const dur = Math.round(110 + 18 * Math.sqrt(Math.max(0, fall)))
  return { delay: Math.max(0, Math.round(dropDelay + POUR.drop * POUR.land - dur - jitter)), dur }
}

const GRAINS: { x: number; d: number }[] = [
  { x: 0.22, d: 0 },
  { x: 0.48, d: 60 },
  { x: 0.7, d: 20 },
  { x: 0.36, d: 120 },
  { x: 0.6, d: 90 },
  { x: 0.82, d: 150 },
]

export function StrataJar({ today, storage }: { today: number; storage?: Pick<Storage, 'getItem'> & Partial<Pick<Storage, 'setItem'>> }) {
  const [jar] = useState(() => readJar(today, storage))
  const [fresh] = useState(() => isFreshPour(jar, today, pickStorage(storage)))
  const { layers, labels } = jar
  const { delays, end } = pourDelays(layers.length, fresh)
  const top = layers[layers.length - 1]
  const fall = top ? Math.max(8, top.top + 6) : 0

  // 붓기는 병이 화면에 들어올 때 시작한다 — 모바일(390)에선 병이 오늘 카드 아래(첫 화면 밖)라, 바로 틀면 오늘 층이 떨어지는 순간을 아무도 못 본다(자체 혹평).
  // 그때까지 CSS가 애니메이션을 멈춰 둔다(data-run 없음). IntersectionObserver가 없으면 바로 튼다.
  const ref = useRef<HTMLElement>(null)
  const [run, setRun] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setRun(true)
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setRun(true)
          io.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!fresh || !run) return
    // reduced-motion이면 떨어지는 순간을 보여 주지 않았으니 '본 날'로 적지 않는다(설정을 끄면 그때 한 번 본다)
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    try {
      const w = storage?.setItem ? storage : window.localStorage
      w.setItem?.(POURED_KEY, String(today))
    } catch {
      /* 저장 불가(사파리 사생활 모드)면 다음에도 한 번 더 붓는다 — 해 없음 */
    }
  }, [fresh, run, today, storage])
  return (
    <section
      ref={ref}
      className="sl-st"
      data-run={run ? '1' : undefined}
      aria-labelledby="sl-st-h"
      data-layers={layers.length}
      data-solved={jar.solvedDays}
      data-today={jar.todayKind}
      data-fresh={fresh ? '1' : undefined}
      style={{ '--sl-st-end': `${end}ms`, '--sl-st-settle': `${POUR.settle}ms`, '--sl-st-drop': `${POUR.drop}ms`, '--sl-st-fade': `${POUR.fade}ms` } as CSSProperties}
    >
      <div className="sl-st-h">
        <h2 id="sl-st-h">Your strata</h2>
        <span className="sl-st-rule" aria-hidden="true" />
        <span className="sl-st-count">{jar.solvedDays} solved · 30 days</span>
      </div>
      <p className="sl-st-run">
        {jar.nextVein
          ? `${jar.streak}-day run · vein at ${jar.nextVein.at} days, ${jar.nextVein.toGo} to go`
          : jar.streak >= 1
            ? `${jar.streak}-day run`
            : !jar.everSolved
              ? 'Each daily you solve pours one layer.'
              : 'Solve today to start a new run.'}
      </p>
      <div className="sl-st-row" style={{ height: H }}>
        <svg className="sl-st-jar" width={JAR.w} height={H} viewBox={`0 0 ${JAR.w} ${H}`} aria-hidden="true" focusable="false">
          <Patterns />
          <rect x={2} y={10} width={JAR.w - 4} height={H - 12} rx={16} fill="rgba(255,255,255,.38)" />
          <g clipPath="url(#sl-st-clip)">
            {/* 알갱이는 층 아래에 그린다 — 떨어지는 오늘 층이 내려와 덮으며 '쌓인다' */}
            {fresh && top?.kind === 'solved' && (
              <g className="sl-st-grains" data-grains="">
                {GRAINS.map((g, k) => (
                  <rect
                    key={k}
                    className="sl-st-grain"
                    x={JAR.ix + IW * g.x}
                    y={JAR.iy - 6}
                    width={2.5}
                    height={2.5}
                    fill={top.color}
                    stroke={INK}
                    strokeWidth={0.5}
                    style={(() => {
                      const t = grainTiming(delays[layers.length - 1], fall, g.d)
                      return { animationDelay: `${t.delay}ms`, animationDuration: `${t.dur}ms`, '--sl-st-fall': `${fall}px` } as CSSProperties
                    })()}
                  />
                ))}
              </g>
            )}
            {layers.map((l, i) => (
              <g
                key={l.dayNumber}
                className="sl-st-l"
                data-fresh={fresh && i === layers.length - 1 ? '1' : undefined}
                style={{ animationDelay: `${delays[i]}ms` }}
              >
                <Layer layers={layers} i={i} />
              </g>
            ))}
            <g className="sl-st-after">
              <Edges layers={layers} />
            </g>
          </g>
          <rect x={2} y={10} width={JAR.w - 4} height={H - 12} rx={16} fill="none" stroke={TUBE_LINE} strokeWidth={1.5} />
          <rect x={7} y={22} width={3} height={H - 70} rx={1.5} fill="rgba(255,255,255,.8)" />
          <rect x={0.75} y={4} width={JAR.w - 1.5} height={8} rx={4} fill="rgba(255,255,255,.6)" stroke={TUBE_LINE} strokeWidth={1.5} />
        </svg>
        <svg className="sl-st-leaders sl-st-after" width={JAR.w + 30} height={H} aria-hidden="true" focusable="false">
          {labels.map((lb, k) => {
            const ay = JAR.iy + lb.anchor
            const ly = JAR.iy + lb.y
            const x0 = JAR.ix + IW - 10
            return (
              <g key={k}>
                <circle cx={x0} cy={ay} r={2} fill={INK} />
                <path d={`M${x0} ${ay} L${JAR.w + 6} ${ay} L${JAR.w + 22} ${ly}`} fill="none" stroke={INK_2} strokeWidth={1} strokeDasharray={lb.dashed ? '2 2' : undefined} />
              </g>
            )
          })}
        </svg>
        <div className="sl-st-notes sl-st-after" aria-hidden="true">
          {labels.map((lb, k) => (
            <div key={k} className="sl-st-note" data-kind={lb.kind} style={{ top: JAR.iy + lb.y - 8 }}>
              {lb.date && <b>{lb.date}</b>}
              {lb.date && ' · '}
              {lb.text}
              {lb.stars !== null && (
                <span className="sl-st-stars">
                  {[0, 1, 2].map((s) => (
                    <Icon key={s} name={s < (lb.stars ?? 0) ? 'star-full' : 'star-empty'} size={12} />
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="sl-st-legend">One layer per solved daily; a better result pours a thicker layer. Dashed means missed or not yet.{jar.veinsShown ? ' White grains mark a vein: 7, 14 or 30 days in a row.' : ''}</p>
      <ol className="sl-st-sr">
        {layers.map((l) => (
          <li key={l.dayNumber}>{layerSentence(l)}</li>
        ))}
      </ol>
    </section>
  )
}
