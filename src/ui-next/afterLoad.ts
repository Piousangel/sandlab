/**
 * 첫 그림 뒤로 미룰 일(P12 LCP) — 페이지 load 이벤트가 지나고 브라우저가 한가할 때 fn을 한 번 부른다. 반환값 = 취소.
 *
 * 왜: 첫 화면에 꼭 필요하지 않은 모듈(판 미리보기 렌더러·플레이 화면)을 마운트 때 import()하면, 그 요청이 첫 그림 전에 끝나
 * 첫 그림을 기다리게 만든다(Lighthouse도 그렇게 센다 — 마운트 import는 프레임워크 청크·평가 뒤에 줄을 서서 오히려 LCP를 늦춘다).
 * load 뒤 유휴로 미루면 첫 그림과 겹치지 않는다. 사용자가 그 전에 직접 누르면 호출하는 쪽이 바로 import한다(같은 청크라 한 번만 받는다).
 */
export function afterLoad(fn: () => void, timeout = 2000): () => void {
  let off = false
  let idle = 0
  let timer = 0
  const run = () => {
    if (off) return
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    if (ric) idle = ric(() => !off && fn(), { timeout })
    else timer = window.setTimeout(() => !off && fn(), 200)
  }
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
  return () => {
    off = true
    window.removeEventListener('load', run)
    if (idle) (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idle)
    if (timer) window.clearTimeout(timer)
  }
}
