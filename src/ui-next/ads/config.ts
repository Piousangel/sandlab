/**
 * 광고 안내판 설정(S11). 게시자 id는 src/components/AdLoader.tsx·layout의 google-adsense-account와 같다
 * (prod 파일을 건드리지 않으려고 여기 따로 적는다 — 바꿀 때 세 곳을 같이).
 *
 * AD_SLOTS: AdSense 대시보드에서 광고 단위를 만들면 id를 채운다(오너 결정 — 지금은 자동광고 꺼짐·단위 없음).
 * 비어 있는 동안 AdPlate는 어디서도 렌더되지 않는다.
 */
export const AD_CLIENT = 'ca-pub-9363381710674627'

export type AdFormat = 'rect' | 'banner'

/**
 * 고정 높이(px, 라벨 제외) — 반응형 자동 크기 대신 고정해서 높이를 예약한다(CLS 0).
 * P8·P10에서 광고 단위를 만들 때 **고정 크기 단위**(대시보드에서 width·height 지정, data-ad-format·full-width-responsive 없음)로 만든다.
 * 안내판은 overflow:hidden이라 반응형 단위가 이 높이보다 크게 그려지면 광고가 잘린다 = AdSense 정책 위험(광고 가림).
 */
export const AD_FORMATS: Record<AdFormat, { height: number }> = {
  rect: { height: 250 }, // 300×250 계열, 본문 사이
  banner: { height: 100 }, // 320×100 / 728×90 계열, 목록 끝
}

export const AD_SLOTS: { play?: string; article?: string; materials?: string; about?: string } = {}
