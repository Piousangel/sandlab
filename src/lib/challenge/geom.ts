/** 점(px,py)과 선분(a→b) 사이 거리의 제곱 — 셰이더 distSqToSegment와 같은 정의(격자 정수 좌표). */
export function distSqToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax
  const aby = by - ay
  const denom = abx * abx + aby * aby
  let t = 0
  if (denom > 0.0001) t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / denom))
  const dx = px - (ax + abx * t)
  const dy = py - (ay + aby * t)
  return dx * dx + dy * dy
}

/** 선분 캡슐(반지름 r)이 덮는 격자 픽셀을 순회. 격자 밖은 건너뛴다. */
export function forEachCapsulePixel(
  W: number, H: number, x0: number, y0: number, x1: number, y1: number, r: number,
  fn: (i: number) => void,
): void {
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - r))
  const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1) + r))
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - r))
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1) + r))
  const r2 = r * r
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) if (distSqToSegment(x, y, x0, y0, x1, y1) <= r2) fn(y * W + x)
}
