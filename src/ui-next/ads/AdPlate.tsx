'use client'

/**
 * 광고 안내판(S11, P3) — 컴포넌트와 위치 규칙만. 실제 페이지 배치는 P8(/play)·P10(Learn·Materials·About).
 *
 * 규칙(props·스타일로 강제):
 * 1. 콘텐츠 카드(bone-2 유리 카드)와 다른 면: --sl-ad 회백 + 45° 빗금 + 점선 테두리, 위에 'Advertisement' 라벨(11px, ink-2).
 *    광고를 콘텐츠로 위장하지 않는다(AdSense 정책 '광고와 콘텐츠 혼동').
 * 2. 인터랙티브 요소·라이브 루프(캔버스·시험관 루프·버튼 줄)와 24px 이상 떨어진다: 바깥 여백이 --sl-s-5(24px) 아래로 못 내려간다
 *    (`clearance`는 24·32·48만 받는다). 캔버스·퍼즐 화면에는 아예 못 둔다 — 그 페이지에는 로더가 없고 verify-ads가 막는다.
 * 3. 높이 예약: 광고가 오기 전에도 최종 높이를 차지한다(CLS 0). format마다 고정 높이.
 * 4. 광고 비활성이면 DOM에 아무것도 그리지 않는다: 지금 광고 로딩 방식(ContentShell의 `ads` → AdLoader, verify-ads 허용 목록)을
 *    그대로 따른다 — `ads`(그 페이지가 로더를 싣는가)와 `slot`(AdSense 광고 단위 id)이 둘 다 있어야 렌더한다.
 *    자동광고는 대시보드에서 꺼져 있고 광고 단위도 아직 없다(AD_SLOTS가 비어 있음) → P3 시점에는 어디서도 렌더되지 않는다.
 * 5. 회색 면 위에 두지 않는다(R3) — 바탕 Bone 위에만. 같은 파일 안 중첩은 pnpm lint:ui가 잡는다.
 */
import { useEffect, useId, useRef } from 'react'
import { AD_CLIENT, AD_FORMATS, type AdFormat } from './config'

export type AdClearance = 24 | 32 | 48

type Props = {
  /** 이 페이지가 광고 로더를 싣는가(ContentShell의 ads와 같은 값을 넘긴다). false면 null. */
  ads: boolean
  /** AdSense 광고 단위 id. 없으면 null(단위를 만들기 전·오너 결정 전). */
  slot: string | undefined
  format?: AdFormat
  /** 주변 인터랙티브·라이브 루프와의 최소 간격(px). 24 미만은 타입에서 막는다. */
  clearance?: AdClearance
}

type AdsQueue = { push(x: object): void }

export function AdPlate(props: Props) {
  if (!props.ads || !props.slot) return null
  return <Plate {...props} slot={props.slot} />
}

function Plate({ slot, format = 'rect', clearance = 24 }: Props & { slot: string }) {
  const labelId = useId()
  const f = AD_FORMATS[format]
  return (
    <aside
      className="sl-ad"
      data-sl-ad={format}
      aria-labelledby={labelId}
      // 간격 바닥은 CSS max() — 타입을 우회해 작은 값이 와도 24px(--sl-s-5) 아래로 안 내려간다
      style={{ marginBlock: `max(var(--sl-s-5), ${clearance}px)`, height: f.height + LABEL_BLOCK }}
    >
      <span className="sl-ad-label" id={labelId}>
        Advertisement
      </span>
      <AdUnit slot={slot} height={f.height} />
    </aside>
  )
}

/** 라벨 줄(11px 글자 + 위아래 여백) — 예약 높이에 포함한다. shell.css .sl-ad-label과 맞춘다. */
export const LABEL_BLOCK = 24

function AdUnit({ slot, height }: { slot: string; height: number }) {
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
      className="adsbygoogle sl-ad-face"
      style={{ display: 'block', width: '100%', height }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
    />
  )
}
