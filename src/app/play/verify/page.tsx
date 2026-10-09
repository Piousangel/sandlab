import LevelVerifier from '@/components/LevelVerifier'

// 개발용 — 색인·광고·sitemap 모두 제외.
export const metadata = { title: 'Level verifier — Sandlab', robots: { index: false, follow: false } }

export default function Page() {
  return <LevelVerifier />
}
