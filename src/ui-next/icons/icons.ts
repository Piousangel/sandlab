// 리디자인 v2 「Glass & Grain」 아이콘 세트 v1.
// 규칙(redesign-concept.md 3.4): 20×20 그리드, 2px 스트로크, 끝·모서리 둥글게, currentColor만,
// 아이콘마다 '알갱이 점'(r=1.25 채운 원) 1개. 점을 넣으면 읽기가 나빠지는 것은 GRAIN_EXCEPTIONS에 사유를 적는다.
// 아직 어떤 페이지에도 연결하지 않는다(P1 기반 자산). 수정 후 `npx tsx scripts/gen-icons.mts`로 스프라이트 재생성.

const STROKE =
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'

/** 스트로크 경로 */
const p = (d: string) => `<path d="${d}" ${STROKE}/>`
/** 스트로크 원 */
const ring = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" ${STROKE}/>`
/** 채운 원(알갱이 점이 아닌 면) */
const disc = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor"/>`
/** 알갱이 점 — 세트의 공통 모티프 */
const grain = (cx: number, cy: number) => disc(cx, cy, GRAIN_R)

export const GRAIN_R = 1.25

export const ICONS = {
  // 붓기 = 거꾸로 든 시험관(스포이트) 끝에서 알갱이 하나가 떨어진다.
  pour: p('M6 2.5h8M7.5 2.5v7l2.5 3.5 2.5-3.5v-7M7.5 7h5') + grain(10, 16.75),
  // 삽 — 날 끝에서 흙 알갱이가 튄다.
  dig: p('M11 9 16 4M14.5 2.5l3 3M8 6.5l5.5 5.5-2.5 2.5c-1.8 1.8-4.6 2.3-6.8 1.6-.7-2.2-.2-5 1.6-6.8Z') + grain(16, 16),
  undo: p('M7 4.5 3.5 8 7 11.5M4 8h7.5a4.5 4.5 0 0 1 0 9H8') + grain(4.75, 17),
  retry: p('M2.5 10a7.5 7.5 0 1 0 7.5-7.5 8.1 8.1 0 0 0-5.6 2.3L2.5 6.7M2.5 2.5v4.2h4.2') + grain(10, 10),
  // 속도 = 계기 바늘. 알갱이 점이 바늘 축.
  speed: p('M3 14.5a7 7 0 1 1 14 0M10 14.5l3.5-5') + grain(10, 14.5),
  pause: p('M7 4.5v11M13 4.5v11'),
  'sound-on': p('M3 8v4h3l4 3.5v-11L6 8H3ZM13.5 7.5a3.5 3.5 0 0 1 0 5') + grain(16.75, 10),
  'sound-off': p('M3 8v4h3l4 3.5v-11L6 8H3ZM13.5 8l4 4M17.5 8l-4 4'),
  share: p('M10 11V3M6.5 6.5 10 3l3.5 3.5M4 10.5v5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5v-5') + grain(10, 14),
  link: p(
    'M9 6.5 10.75 4.75a3.5 3.5 0 0 1 5 5L14 11.5M11 13.5l-1.75 1.75a3.5 3.5 0 0 1-5-5L6 8.5M8 12l4-4',
  ),
  // 녹화 = 캠코더. 알갱이 점이 REC 표시등.
  record: p('M4.5 5.5h6a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2ZM12.5 9l5-3v8l-5-3') + grain(6, 9),
  // 지우개가 지나간 자리에 부스러기 하나.
  erase: p('M8 16.5 3.6 12.1a1.5 1.5 0 0 1 0-2.1l6.4-6.4a1.5 1.5 0 0 1 2.1 0l4.3 4.3a1.5 1.5 0 0 1 0 2.1l-6.3 6.5ZM6.5 7.5l6 6M8 16.5h4.5') + grain(16, 16.5),
  // 붓 크기: 작은 점(알갱이) → 중간 → 큰 면.
  'brush-size': grain(3.25, 12.75) + disc(8.25, 11.75, 2.25) + disc(14.75, 10.75, 3.25),
  // 겹친 액자 2장, 앞 액자에 산과 해(알갱이 점).
  gallery: p('M6 3h10a2 2 0 0 1 2 2v8') + p('M4.5 6.5h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z') + p('M2.5 15.5l3.5-3.5 4 4') + grain(11, 10),
  // 모래시계 — 아래에 쌓인 알갱이.
  daily: p('M5 3h10M5 17h10M6.5 3v1.8c0 2.4 3.5 3.4 3.5 5.2s-3.5 2.8-3.5 5.2V17M13.5 3v1.8c0 2.4-3.5 3.4-3.5 5.2s3.5 2.8 3.5 5.2V17') + grain(10, 14.6),
  // 비커 속 지층 2겹 위로 알갱이 하나가 내려앉는다.
  strata: p('M4 3v11.5A2.5 2.5 0 0 0 6.5 17h7a2.5 2.5 0 0 0 2.5-2.5V3M4 13.5h12M4 10c2-1.2 4 1.2 6 0s4-1.2 6 0') + grain(10, 5.75),
  // 유리알(빈 별): 테두리 + 안쪽 반사광(알갱이 점).
  'star-empty': ring(10, 10, 7) + grain(7.5, 7.5),
  // 유리알(찬 별): 채운 구슬, 반사광은 구멍으로(evenodd).
  'star-full':
    '<path d="M10 2a8 8 0 1 1 0 16a8 8 0 1 1 0-16ZM7.5 6.25a1.25 1.25 0 1 0 0 2.5a1.25 1.25 0 1 0 0-2.5Z" fill="currentColor" fill-rule="evenodd"/>',
  // 보석: 거들 선 + 아래 면의 반짝임.
  gem: p('M6 3.5h8L17.5 8 10 17 2.5 8 6 3.5ZM2.5 8h15') + grain(10, 11.75),
  // 자물쇠 — 열쇠 구멍이 알갱이 점.
  lock: p('M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9M5.5 9h9a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9Z') + grain(10, 13),
  next: p('M7.5 4.5 13 10l-5.5 5.5'),
  back: p('M12.5 4.5 7 10l5.5 5.5'),
  menu: p('M3 7h14M3 13h9') + grain(16, 13),
  // i의 점 = 알갱이 점.
  info: ring(10, 10, 7.5) + p('M10 9.5V14') + grain(10, 6.5),
  // 톱니 6개, 축이 알갱이 점.
  settings:
    p(
      'M7.89 4.49 8.34 2.17h3.32l.45 2.32 1.6.92 2.24-.76 1.66 2.88-1.78 1.55v1.84l1.78 1.55-1.66 2.88-2.24-.76-1.6.92-.45 2.32H8.34l-.45-2.32-1.6-.92-2.24.76-1.66-2.88 1.78-1.55V9.08L2.39 7.53l1.66-2.88 2.24.76Z',
    ) + grain(10, 10),
  remix: p('M15.5 8.5A6 6 0 0 0 4.6 7.2M4.5 11.5a6 6 0 0 0 10.9 1.3M15.8 3.8v4.7h-4.7M4.2 16.2v-4.7h4.7'),
  // 액자 하나 — 산과 해(알갱이 점).
  frame: p('M5 4h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM3 13.5l4-4 3.5 3.5 1.5-1.5 3 3') + grain(13.25, 7.75),
} as const

export type IconName = keyof typeof ICONS

export const ICON_NAMES = Object.keys(ICONS) as IconName[]

/**
 * 알갱이 점을 넣지 않은 아이콘과 사유. 테스트가 이 목록 밖의 아이콘에 점이 정확히 1개인지 검사한다.
 */
export const GRAIN_EXCEPTIONS: Partial<Record<IconName, string>> = {
  pause: '두 막대가 기호 전체라 점이 붙으면 "일시정지"가 아니라 다른 글리프로 읽힌다',
  'sound-off': '오른쪽 X가 점 자리를 차지; 점이 있으면 소리가 나는 것처럼 보인다(꺼짐=알갱이 없음)',
  link: '두 고리 사이 빈 곳이 없어 점이 고리 끝과 붙어 보인다',
  next: '글줄 안 작은 방향 기호 — 점이 붙으면 목록 불릿/커서로 읽힌다',
  back: 'next와 같은 이유',
  remix: '두 화살촉이 가운데를 향해 점이 화살촉과 겹친다(시안 원본에도 점 없음)',
  'star-full': '반사광을 채운 점 대신 r=1.25 구멍(evenodd)으로 뚫었다 — 음각 알갱이',
}

/** <symbol> 묶음(외곽 <svg> 없이). */
export function spriteSymbols(): string {
  return ICON_NAMES.map((n) => `<symbol id="i-${n}" viewBox="0 0 20 20">${ICONS[n]}</symbol>`).join('')
}

/** 숨긴 스프라이트 전체. public/ui-next/icons.svg와 같은 내용(끝 개행 제외). */
export function spriteSvg(): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
    spriteSymbols() +
    '</svg>'
  )
}
