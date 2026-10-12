import type { LevelDef } from '../level/define'

const NAMES: Record<number, string> = { 1: 'Flow', 2: 'Spark', 3: 'Frost & Magma', 4: 'Corrode' }

export interface WorldGroup {
  world: number
  name: string
  levels: LevelDef[]
}

export function worldName(world: number): string {
  return NAMES[world] ?? `World ${world}`
}

export function groupByWorld(levels: readonly LevelDef[]): WorldGroup[] {
  const map = new Map<number, LevelDef[]>()
  for (const l of levels) {
    const g = map.get(l.world)
    if (g) g.push(l)
    else map.set(l.world, [l])
  }
  return [...map.keys()].sort((a, b) => a - b).map((world) => ({ world, name: worldName(world), levels: map.get(world)! }))
}

export function ordered(levels: readonly LevelDef[]): LevelDef[] {
  return groupByWorld(levels).flatMap((g) => g.levels)
}

export function levelById(levels: readonly LevelDef[], id: string): LevelDef | undefined {
  return levels.find((l) => l.id === id)
}

export function nextLevel(levels: readonly LevelDef[], id: string): LevelDef | null {
  const list = ordered(levels)
  const i = list.findIndex((l) => l.id === id)
  return i >= 0 && i + 1 < list.length ? list[i + 1] : null
}

export function worldUnlocked(world: number, levels: readonly LevelDef[], starsOf: (id: string) => number): boolean {
  if (world <= 1) return true
  const prev = levels.filter((l) => l.world === world - 1)
  if (prev.length === 0) return true
  const got = prev.reduce((n, l) => n + starsOf(l.id), 0)
  return got >= prev.length * 2 && worldUnlocked(world - 1, levels, starsOf)
}

export function lockMessage(world: number, levels: readonly LevelDef[]): string {
  const prev = levels.filter((l) => l.world === world - 1).length
  return `Need ${prev * 2}★ from W${world - 1}`
}
