import type { Metadata, Viewport } from 'next'
import { SITE, TAGLINE } from '@/lib/site'
import LandingBeacon from '@/components/LandingBeacon'
import { UI_NEXT } from '@/ui-next/flag'
// 리디자인 셸(S6): prod는 classic(아무것도 안 더함), NEXT_PUBLIC_UI=next 빌드만 새 셸 — next.config.ts 별칭
import { shellHtmlProps } from '@ui-shell'

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
  // 프리뷰 Worker(NEXT_PUBLIC_UI=next)는 색인 금지. prod 빌드에서는 이 키 자체가 없다.
  ...(UI_NEXT ? { robots: { index: false, follow: false } } : {}),
}

// VideoGame 구조화 데이터는 페이지별(src/lib/gameJsonLd.ts) — 홈만 WebGPU, Spill 퍼즐은 CPU.

export const viewport: Viewport = {
  themeColor: '#07090D',
  // 노치·홈인디케이터 아이폰에서 도크가 시스템 UI에 가리지 않게 (#9와 함께 쓰임)
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...shellHtmlProps}>
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
        {children}
        <LandingBeacon />
      </body>
    </html>
  )
}
