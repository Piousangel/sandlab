'use client'

/**
 * 프리뷰 빌드에서 DailySpill의 `./SpillPlayer` 자리에 들어가는 지연 로드 래퍼(next.config.ts PREVIEW_SWAPS, P12 LCP).
 * 데일리는 시작 화면(DailyStart)을 먼저 보여 주고 "Solve today"를 누른 뒤에야 플레이 화면을 그린다 — 플레이 화면 JS(SpillPlayer·결과 카드,
 * 24KB gzip)가 첫 그림 전에 받을 필요가 없다. 시작 화면이 load 뒤 유휴에 preloadSpillPlayer()로 미리 받고, 누르는 순간에도 부른다
 * (같은 import라 청크는 한 번만 받는다) — 보통은 누를 때 이미 받아 둔 상태라 대기 화면이 안 보인다. prod는 DailySpill이 SpillPlayer를 바로 쓴다.
 */
import { lazy, Suspense, type ComponentProps } from 'react'
import type SpillPlayerType from '@/components/spill/SpillPlayer'
import { LazyBoundary } from '@/ui-next/LazyBoundary'

const load = () => import('@/components/spill/SpillPlayer')
const Player = lazy(load)

/** 플레이 화면 청크를 미리 받는다(여러 번 불러도 한 번만 받는다). 실패는 무시 — 누를 때 lazy가 다시 시도한다. */
export function preloadSpillPlayer(): void {
  load().catch(() => {})
}

export default function LazySpillPlayer(props: ComponentProps<typeof SpillPlayerType>) {
  return (
    <LazyBoundary
      fallback={
        <div className="sl-sp-wait" role="alert">
          <p>The puzzle didn&apos;t load.</p>
          <button type="button" className="sl-sp-wait-btn" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      }
    >
    <Suspense
      fallback={
        <p className="sl-sp-wait" role="status">
          Loading the puzzle…
        </p>
      }
    >
      <Player {...props} />
    </Suspense>
    </LazyBoundary>
  )
}
