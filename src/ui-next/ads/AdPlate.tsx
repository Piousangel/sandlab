'use client'

/**
 * 광고 안내판(S11, P3) — 컴포넌트와 위치 규칙만. 실제 페이지 배치는 P8(/play)·P10(글 페이지: 본문 중간 strip + 글 끝 rect).
 *
 * 규칙(props·스타일로 강제):
 * 1. 콘텐츠 카드(bone-2 유리 카드)와 다른 면: --sl-ad 회백 + 45° 빗금 + 점선 테두리, 위에 'Advertisement' 라벨(11px, ink-2).
 *    광고를 콘텐츠로 위장하지 않는다(AdSense 정책 '광고와 콘텐츠 혼동').
 * 2. 인터랙티브 요소·라이브 루프(캔버스·시험관 루프·버튼 줄)와 24px 이상 떨어진다: 바깥 여백이 --sl-s-5(24px) 아래로 못 내려간다
 *    (`clearance`는 24·32·48만 받는다). 캔버스·퍼즐 화면에는 아예 못 둔다 — 그 페이지에는 로더가 없고 verify-ads가 막는다.
 * 3. 높이 예약: 광고가 오기 전에도 최종 높이를 차지한다(CLS 0). format마다 고정 높이.
 * 4. 광고 비활성이면 DOM에 아무것도 그리지 않는다. P11: 맨 먼저 `ADS_ENABLED`(config.ts, AdSense 승인 전 false — 허브와 같은 규칙)가 꺼져 있으면 null.
 *    그다음 지금 광고 로딩 방식(ContentShell의 `ads` → AdLoader, verify-ads 허용 목록)을
 *    그대로 따른다 — `ads`(그 페이지가 로더를 싣는가)와 `slot`(AdSense 광고 단위 id)이 둘 다 있어야 렌더한다.
 *    자동광고는 대시보드에서 꺼져 있고 광고 단위도 아직 없다(AD_SLOTS가 비어 있음) → P3 시점에는 어디서도 렌더되지 않는다.
 * 5. 회색 면 위에 두지 않는다(R3) — 바탕 Bone 위에만. 같은 파일 안 중첩은 pnpm lint:ui가 잡는다.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { ADS_ENABLED, AD_CLIENT, AD_FORMATS, type AdFormat, type AdSlotPair } from './config'

export type AdClearance = 24 | 32 | 48

type Props = {
  /** 이 페이지가 광고 로더를 싣는가(ContentShell의 ads와 같은 값을 넘긴다). false면 null. */
  ads: boolean
  /** AdSense 광고 단위 id(strip은 좁은·넓은 화면 한 쌍). 없으면 null(단위를 만들기 전·오너 결정 전). */
  slot: string | AdSlotPair | null | undefined
  format?: AdFormat
  /** 주변 인터랙티브·라이브 루프와의 최소 간격(px). 24 미만은 타입에서 막는다. */
  clearance?: AdClearance
  /** 광고 켜짐 스위치. 기본 = ADS_ENABLED(config.ts). 테스트가 켜진 모양을 볼 때만 넘긴다. */
  enabled?: boolean
}

type AdsQueue = { push(x: object): void }

export function AdPlate(props: Props) {
  if (!(props.enabled ?? ADS_ENABLED) || !props.ads || !props.slot) return null
  const strip = !!AD_FORMATS[props.format ?? 'rect'].wide
  // strip 자리는 단위 한 쌍, 나머지는 단위 하나 — 모양이 안 맞으면 그리지 않는다(잘못된 크기 단위 = 정책 위험)
  if (strip !== (typeof props.slot === 'object')) return null
  return <Plate {...props} slot={props.slot} />
}

function Plate({ slot, format = 'rect', clearance = 24 }: Props & { slot: string | AdSlotPair }) {
  const labelId = useId()
  const f = AD_FORMATS[format]
  return (
    <aside
      className={typeof slot === 'object' ? `sl-ad sl-ad--${format}` : 'sl-ad'}
      data-sl-ad={format}
      // 본문 파리티 검사(scripts/qa/content-parity.mjs)가 광고 라벨을 본문 글자로 세지 않게
      data-sl-chrome="ad"
      aria-labelledby={labelId}
      // 간격 바닥은 CSS max() — 타입을 우회해 작은 값이 와도 24px(--sl-s-5) 아래로 안 내려간다
      // strip(P10)은 브레이크포인트마다 높이가 달라 인라인 높이 대신 shell.css(.sl-ad--strip)가 예약한다
      style={{ marginBlock: `max(var(--sl-s-5), ${clearance}px)`, height: typeof slot === 'object' ? undefined : f.height + LABEL_BLOCK }}
    >
      <span className="sl-ad-label" id={labelId}>
        Advertisement
      </span>
      {typeof slot === 'object' ? (
        <StripUnit pair={slot} minWidth={f.wide!.minWidth} />
      ) : (
        <AdUnit slot={slot} height={f.height} width={f.width} />
      )}
    </aside>
  )
}

/** 라벨 줄(11px 글자 + 위아래 여백) — 예약 높이에 포함한다. shell.css .sl-ad-label과 맞춘다. */
export const LABEL_BLOCK = 24

/**
 * 고정 크기 2단계(strip): 화면 폭에 맞는 단위 **하나만** `ins.adsbygoogle`로 그린다.
 * `adsbygoogle.push({})`는 호출한 컴포넌트가 아니라 DOM에서 아직 안 채운 첫 `ins.adsbygoogle`을 채우므로,
 * 숨은 쪽 ins가 DOM에 있으면 그쪽이 잡혀 폭 0 오류가 난다(P10 리뷰). 마운트 전(정적 HTML)에는 클래스 없는 자리표시만
 * — 크기·보임은 shell.css 미디어 쿼리가 정해 높이 예약이 그대로다(CLS 0). 브레이크포인트를 넘으면(회전) 새 단위로 다시 push.
 */
function StripUnit({ pair, minWidth }: { pair: AdSlotPair; minWidth: number }) {
  const [which, setWhich] = useState<'narrow' | 'wide' | null>(null)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`)
    const pick = () => setWhich(mq.matches ? 'wide' : 'narrow')
    pick()
    mq.addEventListener('change', pick)
    return () => mq.removeEventListener('change', pick)
  }, [minWidth])
  if (!which)
    return (
      <>
        <span className="sl-ad-face sl-ad-face--narrow" />
        <span className="sl-ad-face sl-ad-face--wide" />
      </>
    )
  return <AdUnit key={which} slot={pair[which]} fixed={which} />
}

function AdUnit({ slot, height, width, fixed }: { slot: string; height?: number; width?: number; fixed?: 'narrow' | 'wide' }) {
  const pushed = useRef(false)
  useEffect(() => {
    if (pushed.current) return
    pushed.current = true
    try {
      const w = window as unknown as { adsbygoogle?: AdsQueue }
      ;(w.adsbygoogle = w.adsbygoogle ?? ([] as unknown as AdsQueue)).push({})
    } catch {
      /* 차단기·로더 없음 — 예약 높이만 남는다(CLS 0) */
    }
  }, [])
  return (
    <ins
      // fixed = 고정 크기 2단계(strip): 폭·높이를 shell.css 미디어 쿼리가 준다(AdSense가 ins의 CSS 크기를 그대로 쓴다)
      className={fixed ? `adsbygoogle sl-ad-face sl-ad-face--${fixed}` : 'adsbygoogle sl-ad-face'}
      // 고정 크기 단위는 ins도 그 크기로 가운데에 둔다(단위와 다른 ins 크기 = 크기 불일치 위험, P10)
      style={fixed ? undefined : { display: 'block', width: width ?? '100%', height, margin: '0 auto' }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
    />
  )
}
