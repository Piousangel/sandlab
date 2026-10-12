export interface VibrateNav {
  vibrate?: (pattern: number | number[]) => boolean
}

export const HAPTICS = {
  latch: 12,
  gem: 8,
  clear: 30,
  reject: 6,
  fail: [18, 40, 18],
} as const

export type HapticKind = keyof typeof HAPTICS

function defaultNav(): VibrateNav | null {
  return typeof navigator === 'undefined' ? null : (navigator as unknown as VibrateNav)
}

export function vibrate(pattern: number | readonly number[], nav: VibrateNav | null = defaultNav()): boolean {
  try {
    if (!nav || typeof nav.vibrate !== 'function') return false
    return nav.vibrate(typeof pattern === 'number' ? pattern : [...pattern]) !== false
  } catch {
    return false
  }
}

export function haptic(kind: HapticKind, nav: VibrateNav | null = defaultNav(), enabled = true): boolean {
  if (!enabled) return false
  return vibrate(HAPTICS[kind], nav)
}
