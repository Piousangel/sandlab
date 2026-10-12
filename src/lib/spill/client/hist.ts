import { formatMoves, formatSecs } from '../play/score'

export const TBUCKET_TICKS = 30
export const MIN_SAMPLE = 50

export interface Hist {
  cells: [number, number, number][]
  total: number
}

export interface HistBars {
  bars: { bucket: number; cnt: number }[]
  you: number
  sample: number
}

export function tbucket(ticks: number): number {
  return Math.floor(Math.max(0, ticks) / TBUCKET_TICKS)
}

export function histBars(h: Hist, moves: number, ticks: number): HistBars | null {
  if (!h || h.total < MIN_SAMPLE) return null
  const same = h.cells.filter((c) => c[0] === moves)
  const sameN = same.reduce((n, c) => n + c[2], 0)
  const use = sameN >= MIN_SAMPLE ? same : h.cells
  const by = new Map<number, number>()
  for (const [, b, n] of use) by.set(b, (by.get(b) ?? 0) + n)
  const me = tbucket(ticks)
  const keys = [...by.keys(), me]
  const lo = Math.min(...keys)
  const hi = Math.max(...keys)
  const bars = []
  for (let b = lo; b <= hi; b++) bars.push({ bucket: b, cnt: by.get(b) ?? 0 })
  return { bars, you: me - lo, sample: use.reduce((n, c) => n + c[2], 0) }
}

export function shareText(id: string, stars: number, moves: number, ticks: number, host: string): string {
  const s = '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars))
  return `Sandlab Spill ${id} ${s} ${formatMoves(moves)} · ${formatSecs(ticks)} ${host}/play/${id}`
}
