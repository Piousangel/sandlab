import type { Metadata, Viewport } from 'next'
import { SITE, TAGLINE } from '@/lib/site'
import LandingBeacon from '@/components/LandingBeacon'
import { NOINDEX, UI_NEXT } from '@/ui-next/flag'
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
  // 새 셸(P12 LCP·컷오버): 탭 아이콘은 48px 2KB(public/ui-next/icon-48.png, icon.png를 줄인 것). 512px 52KB 원본은 브라우저가 load 직후 받아
  // 첫 그림 전 요청에 끼면 LCP를 0.3s 늘렸다(Lighthouse 실측). 48은 검색 결과 파비콘 권장(48의 배수)과도 맞다. 홈 화면 아이콘(apple)은 원본 그대로.
  icons: UI_NEXT ? { icon: [{ url: '/ui-next/icon-48.png', sizes: '48x48', type: 'image/png' }], apple: '/icon.png' } : { icon: '/icon.png', apple: '/icon.png' },
  alternates: { canonical: SITE },
  // AdSense 사이트 소유권 확인 — 모든 페이지에 있어야 한다 (ads.txt와 별개).
  other: { 'google-adsense-account': 'ca-pub-9363381710674627' },
  // 프리뷰 Worker(NEXT_PUBLIC_NOINDEX=1)는 색인 금지. prod 빌드에서는 이 키 자체가 없다(컷오버 뒤 prod도 UI_NEXT라 UI 플래그와 분리).
  ...(NOINDEX ? { robots: { index: false, follow: false } } : {}),
}

// VideoGame 구조화 데이터는 페이지별(src/lib/gameJsonLd.ts) — 홈만 WebGPU, Spill 퍼즐은 CPU.

// 새 셸(P12 컷오버, 독립 리뷰 ②): 주소창·오버스크롤·노치 여백 색 = Bone(--sl-bone). 옛 어두운 색이면 크림 화면 위로 검은 띠가 보인다.
// classic(되돌리기) 빌드는 옛 값 그대로.
const CHROME = UI_NEXT ? { bg: '#F4ECDD', fg: '#2A2118', scheme: 'light' } : { bg: '#07090D', fg: '#eef1f6', scheme: undefined }

export const viewport: Viewport = {
  themeColor: CHROME.bg,
  ...(CHROME.scheme ? { colorScheme: 'light' as const } : {}),
  // 노치·홈인디케이터 아이폰에서 도크가 시스템 UI에 가리지 않게 (#9와 함께 쓰임)
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...shellHtmlProps}>
      <body
        style={{
          margin: 0,
          background: CHROME.bg,
          color: CHROME.fg,
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
