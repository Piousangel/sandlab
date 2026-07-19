/**
 * 사이트 절대 URL — 단일 진실 공급원.
 *
 * 커스텀 도메인(sandlab.app)이 Worker에 붙으면 이 한 줄만 바꾸면 된다.
 * metadataBase·OG·canonical·sitemap·robots가 전부 이걸 참조하므로 도메인 전환이 한 곳으로 끝난다.
 * (worker의 /s/:id·공유 링크는 url.origin을 써서 자동 적응 — 코드 변경 불필요.)
 */
export const SITE = 'https://sandlab.piousangel.workers.dev'
