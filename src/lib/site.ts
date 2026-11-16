/**
 * 사이트 절대 URL — 단일 진실 공급원.
 *
 * 커스텀 도메인(sandlab.app)이 Worker에 붙으면 이 한 줄만 바꾸면 된다.
 * metadataBase·OG·canonical·sitemap·robots가 전부 이걸 참조하므로 도메인 전환이 한 곳으로 끝난다.
 * (worker의 /s/:id·공유 링크는 url.origin을 써서 자동 적응 — 코드 변경 불필요.)
 */
export const SITE = 'https://sandlab.app'

/** 문의 주소 — /about, /privacy에 노출. Cloudflare Email Routing으로 운영자 메일함에 전달된다. */
export const CONTACT_EMAIL = 'hello@sandlab.app'

// 쐐기(wedge)는 '테크 스펙'이 아니라 '무설치·무가입·링크로 공유'다.
// 핸드오프 근거: fps·셀 수는 자랑이지 제품이 아니다. 방문자에게 제일 약한 쐐기를 먼저 보이지 않는다.
export const TAGLINE = 'Falling-sand you paint in the browser. No install, no sign-up — share any scene as a link, or post a 10-second clip.'
