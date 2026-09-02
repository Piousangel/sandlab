import type { Metadata, Viewport } from 'next'
import { SITE } from '@/lib/site'

// 쐐기(wedge)는 '테크 스펙'이 아니라 '무설치·무가입·링크로 공유'다.
// 핸드오프 근거: fps·셀 수는 자랑이지 제품이 아니다. 방문자에게 제일 약한 쐐기를 먼저 보이지 않는다.
const TAGLINE = 'Falling-sand you paint in the browser. No install, no sign-up — share any scene as a link, or post a 10-second clip.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Sandlab — falling sand you can share as a link',
  description: TAGLINE,
  openGraph: {
    title: 'Sandlab — falling sand you can share as a link',
    description: TAGLINE,
    type: 'website',
    url: SITE,
    siteName: 'Sandlab',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Sandlab — falling sand in the browser' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sandlab — falling sand you can share as a link',
    description: TAGLINE,
    images: ['/og.png'],
  },
  icons: { icon: '/icon.png', apple: '/icon.png' },
  alternates: { canonical: SITE },
  // AdSense 사이트 소유권 확인 — 모든 페이지에 있어야 한다 (ads.txt와 별개).
  other: { 'google-adsense-account': 'ca-pub-9363381710674627' },
}

// 구조화 데이터 — 크롤러/AI 답변 그라운딩용. WebSite + 무설치 브라우저 게임.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'Sandlab',
  url: SITE,
  applicationCategory: 'Game',
  operatingSystem: 'Web browser (WebGPU)',
  browserRequirements: 'Requires WebGPU (Chrome/Edge 113+, Safari 26+)',
  genre: 'Falling-sand simulation',
  description: TAGLINE,
  image: `${SITE}/og.png`,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

export const viewport: Viewport = {
  themeColor: '#07090D',
  // 노치·홈인디케이터 아이폰에서 도크가 시스템 UI에 가리지 않게 (#9와 함께 쓰임)
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#07090D',
          color: '#eef1f6',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
          overscrollBehavior: 'none',
        }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {/* Google AdSense 로더 — 심사·게재용. 자동광고는 대시보드에서 끄고 갤러리 하단 유닛만 쓴다
            (캔버스 미학 보호). 승인 전엔 광고가 뜨지 않는다. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9363381710674627"
          crossOrigin="anonymous"
        />
        {children}
      </body>
    </html>
  )
}
