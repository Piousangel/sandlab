/**
 * 세로 폰 재료 팔레트 격자 — 캔버스·컨트롤 아래 남는 높이를 빈칸으로 두지 않고 칩 크기로 흡수한다(스펙 §3·§9 S1).
 * 팔레트 영역(w×h)에 n개를 담는 열 수 중 셀이 가장 커지는 것을 고르고, 셀 크기에서 점·라벨 크기를 낸다.
 * 격자는 1fr 행·열로 영역을 꽉 채우므로 셀 사이 여백도 탭 영역이 된다.
 */
export interface PaletteGrid {
  cols: number
  rows: number
  /** 색 점 지름(px) */
  dot: number
  /** 라벨 글자 크기(px) */
  label: number
  /** 셀이 점+라벨을 담기에 너무 낮으면(분할 화면 등) 라벨을 숨긴다 — 넘친 라벨이 아래 행을 덮지 않게 */
  showLabel: boolean
}

/** 라벨이 들어갈 최소 셀 높이 — 점 하한 18 + 간격 2 + 라벨 하한 9 + 여유 */
const LABEL_MIN_CELL = 31

/** 칩(점 + 간격 + 라벨) 세로 높이 — SandCanvas가 쓰는 것과 같은 식(라벨 line-height 1, 간격 = 점의 12%). */
export function chipContentHeight(g: PaletteGrid): number {
  return g.dot + (g.showLabel ? Math.round(g.dot * 0.12) + g.label : 0)
}

const MIN_COLS = 3
const MAX_COLS = 9
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function paletteGrid(w: number, h: number, n: number): PaletteGrid {
  let best = { cols: 6, rows: Math.ceil(n / 6), cell: -1 }
  for (let cols = MIN_COLS; cols <= MAX_COLS; cols++) {
    const rows = Math.ceil(n / cols)
    if (cols * (rows - 1) >= n) continue // 통째로 빈 행이 생기는 조합은 제외
    const cell = Math.min(w / cols, h / rows)
    if (cell > best.cell) best = { cols, rows, cell }
  }
  const cell = Math.max(0, best.cell)
  const showLabel = cell >= LABEL_MIN_CELL
  const label = Math.round(clamp(cell * 0.15, 9, 14) * 2) / 2
  // 라벨을 보일 때: 점 + 간격(12%) + 라벨이 셀 높이를 넘지 않게 점 상한을 둔다. 숨길 때: 점이 셀을 넘지 않게.
  const dotFit = showLabel ? Math.floor((cell - label) / 1.12) : Math.floor(cell)
  const dot = Math.max(18, Math.min(Math.round(clamp(cell * 0.46, 18, 56)), dotFit))
  return { cols: best.cols, rows: best.rows, dot, label, showLabel }
}
