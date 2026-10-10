import SpillBench from '@/components/spill/SpillBench'

// 개발용(S0 실기기 벤치) — 색인·광고·sitemap 모두 제외. 사용자 폰에서 열어야 해서 빌드에는 포함한다.
export const metadata = { title: 'Spill bench — Sandlab', robots: { index: false, follow: false } }

export default function Page() {
  return <SpillBench />
}
