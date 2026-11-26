import JsonLd from '@/components/JsonLd'
import { gameJsonLd } from '@/lib/gameJsonLd'
import { TAGLINE } from '@/lib/site'
// 홈 = 새 셸 「Pour」(리디자인 P6, P12 컷오버). 옛 홈(SandCanvas)은 #108에서 지웠다 — classic 빌드는 next.config.ts가 막는다.
import { HomePour } from '@ui-shell'

// 홈 샌드박스만 WebGPU가 필요하다 — 구조화 데이터도 홈에서만 WebGPU를 말한다.
const JSON_LD = gameJsonLd('sandbox', { name: 'Sandlab', path: '', description: TAGLINE })

export default function Page() {
  return (
    <>
      <JsonLd data={JSON_LD} />
      {HomePour && <HomePour />}
    </>
  )
}
