import GalleryBrowser from '@/components/GalleryBrowser'

export const metadata = {
  title: 'Sandlab Gallery — scenes people made',
  description: 'Browse falling-sand scenes made in Sandlab. Vote for the ones you like.',
  // 루트 레이아웃의 canonical(=홈)을 덮어쓴다 — sitemap은 /gallery를 싣는데 canonical이 홈이면 신호 충돌.
  alternates: { canonical: '/gallery' },
  openGraph: { title: 'Sandlab Gallery — scenes people made', url: '/gallery' },
}

const SR_ONLY = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 } as const

export default function Page() {
  // 화면에 보이는 제목이 없어 h1이 0개였다(03시 QA) — 스크린리더·검색용 제목만 둔다(겉모습 변화 0)
  return (
    <>
      <h1 style={SR_ONLY}>Sandlab Gallery — scenes people made</h1>
      <GalleryBrowser />
    </>
  )
}
