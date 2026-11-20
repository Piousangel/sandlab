/**
 * 광고 안내판 설정(S11). 게시자 id는 src/components/AdLoader.tsx·layout의 google-adsense-account와 같다
 * (prod 파일을 건드리지 않으려고 여기 따로 적는다 — 바꿀 때 세 곳을 같이).
 *
 * AD_SLOTS: AdSense 대시보드에서 광고 단위를 만들면 id를 채운다(오너 결정 — 지금은 자동광고 꺼짐·단위 없음).
 * 비어 있는 동안 AdPlate는 어디서도 렌더되지 않는다.
 */
export const AD_CLIENT = 'ca-pub-9363381710674627'

/**
 * 광고 켜짐 스위치(P11, 허브 siteConfig.adsenseEnabled와 같은 규칙). **AdSense 승인 전에는 false** — AD_SLOTS에 단위가 있어도
 * 안내판 DOM 0(빈 'Advertisement' 판이 보이지 않게, 컷오버 P12에도 그대로). 승인되면 이 한 줄만 true로(오너 확인, 고위험 리뷰 2회).
 * 광고 로더(AdLoader, 심사·게재 자격용)는 이 스위치와 무관 — verify-ads 허용 목록이 정한다.
 */
export const ADS_ENABLED = false

export type AdFormat = 'rect' | 'banner' | 'strip'

/**
 * 고정 높이(px, 라벨 제외) — 반응형 자동 크기 대신 고정해서 높이를 예약한다(CLS 0).
 * P8·P10에서 광고 단위를 만들 때 **고정 크기 단위**(대시보드에서 width·height 지정, data-ad-format·full-width-responsive 없음)로 만든다.
 * 안내판은 overflow:hidden이라 반응형 단위가 이 높이보다 크게 그려지면 광고가 잘린다 = AdSense 정책 위험(광고 가림).
 */
export const AD_FORMATS: Record<AdFormat, { height: number; wide?: { minWidth: number; width: number; height: number }; width?: number }> = {
  rect: { width: 300, height: 250 }, // 고정 300×250 단위 — ins도 300×250(단위 크기와 같게, 가운데)
  banner: { height: 100 }, // 320×100 / 728×90 계열, 목록 끝
  /**
   * 글 본문 중간 띠(P10): 좁은 화면 320×100, 768px 이상 728×90 — 반응형 단위가 아니라 **고정 크기 단위 2개**를
   * 브레이크포인트(800px — 열 728 + 여백 32 + 데스크톱 스크롤바가 들어가는 폭)로 갈아 끼운다(AD_SLOTS.contentMid.narrow·wide). 보이는 쪽 ins만 push한다(숨은 ins push = 폭 0 오류).
   * 높이는 shell.css 미디어 쿼리가 예약한다(CLS 0). 값은 shell.css와 같아야 한다(content.test가 대조).
   */
  strip: { width: 320, height: 100, wide: { minWidth: 800, width: 728, height: 90 } },
}

/** strip 자리의 단위 한 쌍(좁은 화면·넓은 화면). */
export type AdSlotPair = { narrow: string; wide: string }

/**
 * 광고 단위 id — 오너가 AdSense에서 만든 **고정 크기 디스플레이 단위**(11-20, 표·운영 규칙은 docs/team/adsense-units.md).
 * 비어 있으면(null·undefined) 그 자리는 렌더 0. 단위 id는 공개 값(HTML에 그대로 나간다).
 * - play: /play 월드 카드 아래, 300×250 (sl-play-300x250, P8)
 * - contentMid: 글 페이지 본문 중간, 320×100 (sl-content-mid-320x100) / 768px 이상 728×90 (sl-content-mid-728x90) (P10)
 * - contentEnd: 글 페이지 글 끝, 300×250 — **단위 아직 없음 → null(렌더 0)**. 만들면 id만 채운다.
 * 글 페이지 = /learn/<글>, /materials, /materials/<재료>, /about, /play/<id>/guide (verify-ads 허용 목록과 같다).
 * 새 셸(프리뷰)에서만 쓰인다 — prod(classic)는 이 안내판을 그리지 않는다(컷오버 P12 전까지 prod 화면 변화 0).
 */
export const AD_SLOTS: { play: string | null; contentMid: AdSlotPair | null; contentEnd: string | null } = {
  play: '9581379414',
  contentMid: { narrow: '6955216070', wide: '5642134405' },
  contentEnd: null,
}
