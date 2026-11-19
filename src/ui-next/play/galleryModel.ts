/**
 * /play 전시실(리디자인 P8) 순수 계산 — 월드 카드·잠금·'곧 공개' 칸·주 행동 하나.
 * 잠금 규칙은 prod 목록(LevelList)과 같은 catalog 함수(worldUnlocked·levelOpen·lockMessage)를 그대로 쓴다.
 */
import { groupByWorld, levelOpen, lockMessage, worldUnlocked } from '@/lib/spill/client/catalog'
import type { PlayGalleryLevel } from '../shell/playTypes'

/** 마지막 월드가 이 수보다 적으면 '곧 공개' 칸을 붙인다(월드 1 = 10칸 기준). */
export const WORLD_SIZE = 10
/** '곧 공개' 칸 수 상한 — 실제 레벨이 아닌 칸을 늘어놓지 않는다(가짜 레벨 금지, 줄 하나를 채우는 정도). */
export const SOON_MAX = 2

export interface GalleryCell {
  id: string
  name: string
  /** 월드 안 순번(1부터) */
  n: number
  stars: number
  open: boolean
  guide: boolean
}

export interface GalleryWorld {
  world: number
  name: string
  got: number
  total: number
  cells: GalleryCell[]
  soon: number
  /** 잠긴 칸을 눌렀을 때 안내 */
  lock: string
}

export function clampStars(n: number | undefined): number {
  return Math.max(0, Math.min(3, Math.round(n ?? 0)))
}

export function galleryWorlds(levels: readonly PlayGalleryLevel[], starsOf: (id: string) => number): GalleryWorld[] {
  const of = (id: string) => clampStars(starsOf(id))
  const groups = groupByWorld(levels)
  return groups.map((g, gi) => {
    const open = worldUnlocked(g.world, levels, of)
    const last = gi === groups.length - 1
    return {
      world: g.world,
      name: g.name,
      got: g.levels.reduce((n, l) => n + of(l.id), 0),
      total: g.levels.length * 3,
      cells: g.levels.map((l, i) => ({ id: l.id, name: l.name, n: i + 1, stars: of(l.id), open: levelOpen(open, i), guide: l.guide })),
      soon: last && g.world > 1 ? Math.min(SOON_MAX, Math.max(0, WORLD_SIZE - g.levels.length)) : 0,
      lock: lockMessage(g.world, levels),
    }
  })
}

/**
 * 화면의 주 행동 하나(높이 고정 — 진행 상태가 읽힌 뒤 문구만 바뀐다, CLS 0).
 * 기록 없음 → 첫 레벨, 진행 중 → 열린 칸 중 3별 아닌 첫 레벨, 전부 3별 → 오늘의 데일리.
 */
export function primaryAction(worlds: readonly GalleryWorld[]): { href: string; label: string } {
  const cells = worlds.flatMap((w) => w.cells)
  if (cells.length === 0) return { href: '/daily', label: "Play today's daily" }
  const any = cells.some((c) => c.stars > 0)
  const first = cells[0]
  if (!any) return { href: `/play/${first.id}`, label: `Start with ${first.id} ${first.name}` }
  const next = cells.find((c) => c.open && c.stars < 3)
  if (!next) return { href: '/daily', label: "Every room solved. Play today's daily" }
  return { href: `/play/${next.id}`, label: `Continue with ${next.id} ${next.name}` }
}
