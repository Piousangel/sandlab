import SandCanvas from '@/components/SandCanvas'
import JsonLd from '@/components/JsonLd'
import { gameJsonLd } from '@/lib/gameJsonLd'
import { TAGLINE } from '@/lib/site'
// 리디자인 P6: 프리뷰(NEXT_PUBLIC_UI=next)만 새 홈. prod(classic)는 HomePour = null → 지금 SandCanvas 그대로.
import { HomePour } from '@ui-shell'

// 홈 샌드박스만 WebGPU가 필요하다 — 구조화 데이터도 홈에서만 WebGPU를 말한다.
const JSON_LD = gameJsonLd('sandbox', { name: 'Sandlab', path: '', description: TAGLINE })

export default function Page() {
  return (
    <>
      <JsonLd data={JSON_LD} />
      {HomePour ? <HomePour /> : <SandCanvas />}
    </>
  )
}
