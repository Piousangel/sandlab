/**
 * 새 셸 링크 표(P3, S10). 헤더 내비·메뉴 시트·푸터가 이 표 하나에서 나온다(테스트가 sitemap과 대조).
 *
 * - 내비 라벨은 동사 4개(R5: 헤더 링크 4개 이하). 라벨은 그 라우트에 실제로 있는 화면을 가리킨다:
 *   Pour = 홈 샌드박스, Solve = Spill 퍼즐 목록(/play), Browse = 갤러리, Learn = 글 목록(S10 'Learn' 통일 — 옛 시안의 Notes 아님).
 * - `doc: true` = 글 콘텐츠 셸끼리의 이동이라 next/link로 클라이언트 이동해도 된다.
 *   그 밖(캔버스·갤러리·데일리·/play)은 일반 <a>로 전체 이동 — 콘텐츠 셸에서 로드된 광고 로더가 캔버스 화면까지
 *   따라가지 않게(ContentShell 주석, 2026-10-09 코드 리뷰). 지금 ContentShell 헤더와 같은 구분이다.
 */
export type ShellLink = { href: string; label: string; doc?: boolean }

export const NAV: readonly ShellLink[] = [
  { href: '/', label: 'Pour' },
  { href: '/play', label: 'Solve' },
  { href: '/gallery', label: 'Browse' },
  { href: '/learn', label: 'Learn', doc: true },
]

export const DAILY_HREF = '/daily'

/** 메뉴 시트의 보조 링크(내비 4개 아래). 소리 토글은 시트 컴포넌트가 따로 그린다. */
export const MENU_LINKS: readonly ShellLink[] = [
  { href: '/about', label: 'About', doc: true },
  { href: '/privacy', label: 'Privacy', doc: true },
  { href: '/terms', label: 'Terms', doc: true },
  { href: '/contact', label: 'Contact', doc: true },
]

/** 푸터(S10: Terms·Contact 포함). 지금 ContentShell 푸터 링크를 하나도 잃지 않는다('/'는 헤더 wordmark·Pour). */
export const FOOTER_LINKS: readonly ShellLink[] = [
  { href: '/learn', label: 'Learn', doc: true },
  { href: '/materials', label: 'Materials', doc: true },
  { href: '/about', label: 'About', doc: true },
  { href: '/privacy', label: 'Privacy', doc: true },
  { href: '/terms', label: 'Terms', doc: true },
  { href: '/contact', label: 'Contact', doc: true },
]

/** 현재 경로가 이 내비 항목의 구역인가. '/'는 정확히 홈일 때만. 끝 슬래시는 무시한다. */
export function isActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (href === '/') return p === '/'
  return p === href || p.startsWith(href + '/')
}
