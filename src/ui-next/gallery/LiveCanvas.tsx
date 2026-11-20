'use client'

/**
 * 액자 하나를 실엔진으로 재생(P9). 부모(GalleryWall)가 `live` id 하나만 들고 있어 이 컴포넌트는 동시에 최대 1개 마운트된다
 * (동시 라이브 캔버스 ≤ 1 — 18개 동시 루프 금지, 계획서 S7 정신).
 *
 * - 썸네일 위에 겹친다: 엔진이 첫 프레임을 그리기 전까지 투명 → 준비되면 data-on으로 나타남(레이아웃 변화 0 — 같은 자리 absolute).
 * - 화면 밖으로 스크롤·탭 숨김·GPU 손실이면 스스로 멈춘다(onEnd). WebGPU가 없으면 onFail → 부모가 재생 버튼을 거둔다.
 * - 장면은 GET /api/scenes/:id(풀 데이터, 1시간 캐시) — 쓰기 없음.
 */
import { useEffect, useRef, useState } from 'react'
import { SandEngine } from '@/lib/sand/engine'
import { PRESETS } from '@/lib/sand/materials'
import { decodeScene } from '@/lib/sand/urlState'
import { getScene } from '@/lib/sand/gallery'

const W = 1200
const H = 600

export function LiveCanvas({ id, onEnd, onFail }: { id: string; onEnd: () => void; onFail: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [on, setOn] = useState(false)
  // 콜백은 렌더마다 새로 오지만 엔진은 id가 바뀔 때만 다시 만든다
  const cb = useRef({ onEnd, onFail })
  cb.current = { onEnd, onFail }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let disposed = false
    const eng = new SandEngine({ canvas, width: W, height: H, materials: PRESETS })
    eng.onLost = () => !disposed && cb.current.onEnd()
    ;(async () => {
      try {
        await eng.init()
      } catch {
        if (!disposed) cb.current.onFail()
        return
      }
      try {
        const sc = await getScene(id)
        const scene = await decodeScene(sc.data)
        if (disposed) return
        if (!scene || scene.w !== W || scene.h !== H) return cb.current.onEnd()
        eng.upload(scene.cells)
        eng.start()
        requestAnimationFrame(() => !disposed && setOn(true))
      } catch {
        if (!disposed) cb.current.onEnd()
      }
    })()

    // 처음 등록 때도 한 번 불린다 — 누른 순간 액자가 화면 밖(1px도 안 보임)이면 바로 멈추는 게 맞다. 조금이라도 보이면 계속(threshold 0).
    const io = new IntersectionObserver(
      ([e]) => {
        if (e && !e.isIntersecting) cb.current.onEnd()
      },
      { threshold: 0 },
    )
    io.observe(canvas)
    const onVis = () => document.visibilityState === 'hidden' && cb.current.onEnd()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      disposed = true
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      eng.destroy()
    }
  }, [id])

  return <canvas ref={ref} width={W} height={H} className="sl-gw-live" data-on={on || undefined} aria-hidden="true" />
}
