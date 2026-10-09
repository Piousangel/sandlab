/** 브러시 원(중심 x,y, 반지름 r)이 칠 가능 영역 안에 완전히 들어가는가. 영역 끝(x+w, y+h)은 미포함. */
export function canPaintAt(area: { x: number; y: number; w: number; h: number }, x: number, y: number, r: number): boolean {
  return x - r >= area.x && y - r >= area.y && x + r < area.x + area.w && y + r < area.y + area.h
}

type Area = { x: number; y: number; w: number; h: number }

/** 재료별 칠 영역(없으면 레벨 기본 paintArea). 점화 재료를 연료 근처에 못 칠하게 할 때 쓴다. */
export function areaFor(level: { paintArea: Area; areaFor?: Record<string, Area> }, mat: string): Area {
  return level.areaFor?.[mat] ?? level.paintArea
}
