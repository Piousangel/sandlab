export const OLD_LEVEL_IDS: readonly string[] = [
  'fill-cup', 'over-the-wall', 'put-out', 'lava-bridge', 'acid-door', 'grow-up', 'fuse', 'dissolve', 'stop-the-flow', 'oil-slick',
  'layer-cake', 'steam-vent', 'trapdoor', 'acid-stairs', 'salt-and-sand', 'deep-roots', 'two-leaks', 'double-fuse', 'float-and-burn', 'lava-fuse',
]

const TARGET: ReadonlyMap<string, string> = new Map(OLD_LEVEL_IDS.map((id) => [id, '/play']))

export function spillRedirect(pathname: string): string | null {
  const m = pathname.match(/^\/play\/([a-z0-9-]+)\/?$/)
  return m ? TARGET.get(m[1]) ?? null : null
}
