/**
 * 프리뷰 빌드에서 `src/app/page.tsx`의 `@/components/SandCanvas` 자리에 들어가는 빈 모듈(next.config.ts PREVIEW_SWAPS, P12 LCP).
 * 프리뷰 홈은 늘 HomePour를 그리므로 옛 홈(SandCanvas)은 그려질 일이 없다 — import만으로 실리던 10KB(gzip)를 뺀다. prod는 그대로 SandCanvas.
 */
export default function ClassicHomeOff(): null {
  return null
}
