/**
 * 동사 액션 → 격자 변경 (§4.1). 좌표는 타일 단위. 수 제한·maxLen·합법 타일 판정은
 * 컨트롤러(S2) 몫이고, 여기는 결정적으로 "적용"만 한다.
 */
import type { Grid } from './grid'
import { TILE, TH, TW, W, setCell } from './grid'
import { M } from './materials'

export type ActionVerb = 'dig' | 'drop' | 'line' | 'trigger'

export interface Action {
  verb: ActionVerb
  tx: number
  ty: number
  tx2: number
  ty2: number
  /** drop: spark|ice|acid, line: fuse|plank, trigger: gate 이름 */
  arg?: string
}

const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
const abs = (n: number) => (n < 0 ? -n : n)

/**
 * 시작 타일에서 끝 타일 쪽으로 8방향 직선 스냅한 타일 목록.
 * 기울기가 축에 가까우면(|짧은 변|×2 ≤ |긴 변|) 축 방향, 아니면 대각선. 길이 = 긴 변.
 */
export function tilePath(tx: number, ty: number, tx2: number, ty2: number): [number, number][] {
  const dx = tx2 - tx
  const dy = ty2 - ty
  const ax = abs(dx)
  const ay = abs(dy)
  let sx = sign(dx)
  let sy = sign(dy)
  if (ay * 2 <= ax) sy = 0
  else if (ax * 2 <= ay) sx = 0
  const len = ax > ay ? ax : ay
  const out: [number, number][] = []
  for (let k = 0; k <= len; k++) {
    const x = tx + sx * k
    const y = ty + sy * k
    if (x >= 0 && y >= 0 && x < TW && y < TH) out.push([x, y])
  }
  return out
}

function forTile(tx: number, ty: number, fn: (i: number) => void): void {
  if (tx < 0 || ty < 0 || tx >= TW || ty >= TH) return
  for (let y = ty * TILE; y < ty * TILE + TILE; y++)
    for (let x = tx * TILE; x < tx * TILE + TILE; x++) fn(y * W + x)
}

const DROP: Record<string, { mat: number; size: number }> = {
  spark: { mat: M.fire, size: 1 },
  ice: { mat: M.ice, size: 2 },
  acid: { mat: M.acid, size: 1 },
}
const LINE: Record<string, number> = { fuse: M.fuse, plank: M.plank }

/** 액션 적용. 반환값 = 바뀐 셀 수(0이면 불법/무효). gates = 레벨 gate 이름 목록. */
export function applyAction(g: Grid, a: Action, gates: readonly string[]): number {
  let n = 0
  switch (a.verb) {
    case 'dig':
      for (const [x, y] of tilePath(a.tx, a.ty, a.tx2, a.ty2))
        forTile(x, y, (i) => { if (g.mat[i] === M.dirt) { setCell(g, i, M.empty); n++ } })
      return n
    case 'drop': {
      const d = DROP[a.arg ?? '']
      if (!d) throw new Error(`unknown drop: ${a.arg}`)
      for (let y = 0; y < d.size; y++)
        for (let x = 0; x < d.size; x++)
          forTile(a.tx + x, a.ty + y, (i) => { if (g.mat[i] === M.empty) { setCell(g, i, d.mat); n++ } })
      return n
    }
    case 'line': {
      const m = LINE[a.arg ?? '']
      if (m === undefined) throw new Error(`unknown line material: ${a.arg}`)
      for (const [x, y] of tilePath(a.tx, a.ty, a.tx2, a.ty2))
        forTile(x, y, (i) => { if (g.mat[i] === M.empty) { setCell(g, i, m); n++ } })
      return n
    }
    case 'trigger': {
      const tag = gates.indexOf(a.arg ?? '') + 1
      if (tag === 0) return 0
      for (let i = 0; i < g.mat.length; i++)
        if (g.mat[i] === M.gate && g.life[i] === tag) { setCell(g, i, M.empty); n++ }
      return n
    }
  }
}
