import type { Hist } from './hist'

export interface ClearBody {
  pid: string
  moves: number
  ticks: number
  lh: string
}

const base = (id: string) => `/api/spill/level/${encodeURIComponent(id)}`

export async function postClear(id: string, body: ClearBody, f: typeof fetch = fetch): Promise<boolean> {
  try {
    const r = await f(`${base(id)}/clear`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true })
    return r.ok
  } catch {
    return false
  }
}

export async function fetchHist(id: string, f: typeof fetch = fetch): Promise<Hist | null> {
  try {
    const r = await f(`${base(id)}/hist`)
    if (!r.ok) return null
    const j = (await r.json()) as Partial<Hist>
    if (!Array.isArray(j.cells) || typeof j.total !== 'number') return null
    return { cells: j.cells, total: j.total }
  } catch {
    return null
  }
}
