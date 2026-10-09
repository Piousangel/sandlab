/** 브러시 원(중심 x,y, 반지름 r)이 칠 가능 영역 안에 완전히 들어가는가. 영역 끝(x+w, y+h)은 미포함. */
export function canPaintAt(area: { x: number; y: number; w: number; h: number }, x: number, y: number, r: number): boolean {
  return x - r >= area.x && y - r >= area.y && x + r < area.x + area.w && y + r < area.y + area.h
}
