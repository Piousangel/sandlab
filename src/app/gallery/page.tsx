// 갤러리 = 「The Wall」(리디자인 P9, P12 컷오버). 옛 GalleryBrowser는 #108에서 지웠다 — classic 빌드는 next.config.ts가 막는다.
import { GalleryWall } from '@ui-shell'

export const metadata = {
  title: 'Sandlab Gallery — scenes people made',
  description: 'Browse falling-sand scenes made in Sandlab. Vote for the ones you like.',
  // 루트 레이아웃의 canonical(=홈)을 덮어쓴다 — sitemap은 /gallery를 싣는데 canonical이 홈이면 신호 충돌.
  alternates: { canonical: '/gallery' },
  openGraph: { title: 'Sandlab Gallery — scenes people made', url: '/gallery' },
}

export default function Page() {
  // 보이는 h1("The Wall")은 GalleryWall이 직접 그린다
  return GalleryWall ? <GalleryWall /> : null
}
