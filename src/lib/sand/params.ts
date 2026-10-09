/** 엔진 uniform(Params) 패킹 — shader.ts COMMON의 struct Params와 필드 순서·크기가 1:1이어야 한다. */
export interface ParamsState {
  W: number; H: number; offset: number; tick: number; matCount: number
  brushX: number; brushY: number; brushR: number; brushMat: number; prevX: number; prevY: number
  recording: boolean; paintEmptyOnly: boolean
  /** 현재 브러시 재료의 누적 잉크 상한(셀). 0xffffffff = 무제한(일반 샌드박스). */
  inkCap: number
}
/** 14개 필드(56B)를 uniform 정렬(16B)에 맞춰 64B로 패딩. */
export const PARAMS_BYTES = 64
export function packParams(s: ParamsState): ArrayBuffer {
  const p = new ArrayBuffer(PARAMS_BYTES)
  const u = new Uint32Array(p)
  const i = new Int32Array(p)
  u[0] = s.W; u[1] = s.H; u[2] = s.offset; u[3] = s.tick; u[4] = s.matCount
  i[5] = s.brushX; i[6] = s.brushY; i[7] = s.brushR
  u[8] = s.brushMat
  i[9] = s.prevX; i[10] = s.prevY
  u[11] = s.recording ? 1 : 0
  u[12] = s.paintEmptyOnly ? 1 : 0
  u[13] = s.inkCap >>> 0
  return p
}
