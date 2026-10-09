import GalleryBrowser from '@/components/GalleryBrowser'

export const metadata = {
  title: 'Sandlab Gallery — scenes people made',
  description: 'Browse falling-sand scenes made in Sandlab. Vote for the ones you like.',
  // 루트 레이아웃의 canonical(=홈)을 덮어쓴다 — sitemap은 /gallery를 싣는데 canonical이 홈이면 신호 충돌.
  alternates: { canonical: '/gallery' },
  openGraph: { title: 'Sandlab Gallery — scenes people made', url: '/gallery' },
}

export default function Page() {
  return <GalleryBrowser />
}
