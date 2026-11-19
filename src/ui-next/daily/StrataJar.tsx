'use client'

/**
 * /daily 지층 병(리디자인 P7). 유리병 단면에 최근 30일 데일리가 물결 층으로 쌓이고, 오른쪽에 날짜 지시선 캡션(지시선은 여기에만 — S5).
 * 계산은 strataModel.ts(순수). 그림(SVG)은 aria-hidden이고 같은 내용을 화면 밖 목록(ol)으로 읽힌다.
 * 기록은 기기 localStorage(readStrata — 키 불변). DailySpill이 클라이언트에서만 이 화면을 그리므로 첫 렌더에서 바로 읽는다(빈 병 → 층 깜빡임·CLS 없음).
 */
import { useState } from 'react'
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

function readJar(today: number, storage?: Pick<Storage, 'getItem'>): Jar {
  let s = storage
  if (!s) {
    try {
      s = typeof window !== 'undefined' ? window.localStorage : undefined
    } catch {
      s = undefined
    }
  }
  const all = s ? readStrata(s, today, today) : readStrata({ getItem: () => null }, today, today)
  return buildJar(all, today, JAR.innerH)
}

export function StrataJar({ today, storage }: { today: number; storage?: Pick<Storage, 'getItem'> }) {
  const [jar] = useState(() => readJar(today, storage))
  const { layers, labels } = jar
  return (
    <section className="sl-st" aria-labelledby="sl-st-h" data-layers={layers.length} data-solved={jar.solvedDays} data-today={jar.todayKind}>
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
            {layers.map((_, i) => (
              <Layer key={layers[i].dayNumber} layers={layers} i={i} />
            ))}
            <Edges layers={layers} />
          </g>
          <rect x={2} y={10} width={JAR.w - 4} height={H - 12} rx={16} fill="none" stroke={TUBE_LINE} strokeWidth={1.5} />
          <rect x={7} y={22} width={3} height={H - 70} rx={1.5} fill="rgba(255,255,255,.8)" />
          <rect x={0.75} y={4} width={JAR.w - 1.5} height={8} rx={4} fill="rgba(255,255,255,.6)" stroke={TUBE_LINE} strokeWidth={1.5} />
        </svg>
        <svg className="sl-st-leaders" width={JAR.w + 30} height={H} aria-hidden="true" focusable="false">
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
        <div className="sl-st-notes" aria-hidden="true">
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
