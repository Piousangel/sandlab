import { devActions, type RunResult } from './attempt'
import type { SpillController } from './controller'
import { HARD_CAP } from './failure'

export function startAutoplay(c: SpillController): void {
  c.clearAll()
  loadDev(c)
}

export function startWatch(c: SpillController): void {
  c.beginWatch()
  loadDev(c)
}

function loadDev(c: SpillController): void {
  const later = []
  for (const a of devActions(c.level)) {
    if (a.tick === 0 && a.verb !== 'trigger') {
      const r = c.act(a)
      if (!r.ok) throw new Error(`autoplay: dev setup action rejected (${r.reason})`)
    } else later.push(a)
  }
  c.schedule(later)
  c.run()
}

export function autoplaySync(c: SpillController, maxTicks = HARD_CAP + 1): RunResult | null {
  startAutoplay(c)
  c.advance(maxTicks)
  return c.getState().result
}
