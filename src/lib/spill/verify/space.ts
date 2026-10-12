export interface Item {
  key: string
  group: string
}

export function comboCount(items: readonly Item[], k: number): number {
  const sizes = new Map<string, number>()
  for (const it of items) sizes.set(it.group, (sizes.get(it.group) ?? 0) + 1)
  const e = new Array<number>(k + 1).fill(0)
  e[0] = 1
  for (const s of sizes.values())
    for (let j = k; j >= 1; j--) e[j] += e[j - 1] * s
  return e[k]
}

export function* combos<T extends Item>(items: readonly T[], k: number): Generator<T[]> {
  const pick: T[] = []
  const used = new Set<string>()
  function* rec(start: number): Generator<T[]> {
    if (pick.length === k) { yield pick.slice(); return }
    for (let i = start; i < items.length; i++) {
      const it = items[i]
      if (used.has(it.group)) continue
      pick.push(it)
      used.add(it.group)
      yield* rec(i + 1)
      used.delete(it.group)
      pick.pop()
    }
  }
  yield* rec(0)
}

export function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) >>> 0
  }
}

export function sampleCombos<T extends Item>(items: readonly T[], k: number, n: number, seed: number): T[][] {
  if (comboCount(items, k) <= n) return [...combos(items, k)]
  const next = rng(seed)
  const seen = new Set<string>()
  const out: T[][] = []
  let tries = 0
  while (out.length < n && tries < n * 50) {
    tries++
    const pick: T[] = []
    const groups = new Set<string>()
    let guard = 0
    while (pick.length < k && guard < k * 50) {
      guard++
      const it = items[next() % items.length]
      if (groups.has(it.group)) continue
      groups.add(it.group)
      pick.push(it)
    }
    if (pick.length < k) continue
    const key = pick.map((p) => p.key).sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(pick)
  }
  return out
}
