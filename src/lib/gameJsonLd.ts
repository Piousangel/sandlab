import { SITE } from '@/lib/site'

/**
 * VideoGame 구조화 데이터 — 페이지별로 엔진 요구사항이 다르다.
 * - sandbox: 홈 캔버스. WebGPU(GPU 컴퓨트)가 필요하다.
 * - puzzle: Spill 퍼즐(/play, /daily). CPU 엔진이라 폰·WebGPU 미지원 브라우저에서도 돈다.
 * 레이아웃 공용으로 두면 모든 페이지가 WebGPU 요구를 말하게 되므로(11-17 /daily 오표기) 페이지가 직접 고른다.
 */
type Variant = 'sandbox' | 'puzzle'

const REQUIREMENTS: Record<Variant, { operatingSystem: string; browserRequirements: string }> = {
  sandbox: {
    operatingSystem: 'Web browser (WebGPU)',
    browserRequirements: 'Requires WebGPU (Chrome/Edge 113+, Safari 26+)',
  },
  puzzle: {
    operatingSystem: 'Web browser',
    browserRequirements: 'Requires JavaScript. Runs in any modern browser, including phones.',
  },
}

export function gameJsonLd(variant: Variant, page: { name: string; path: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: page.name,
    url: `${SITE}${page.path}`,
    applicationCategory: 'Game',
    ...REQUIREMENTS[variant],
    genre: variant === 'sandbox' ? 'Falling-sand simulation' : 'Physics puzzle',
    description: page.description,
    image: `${SITE}/og.png`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}
