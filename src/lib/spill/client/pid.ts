export const PID_KEY = 'spill.v1.pid'

interface Store {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const PID_RE = /^[0-9a-f]{32}$/

export function isPid(x: unknown): x is string {
  return typeof x === 'string' && PID_RE.test(x)
}

function randomHex(): string {
  const b = new Uint8Array(16)
  const c = (globalThis as { crypto?: { getRandomValues?(a: Uint8Array): Uint8Array } }).crypto
  if (c?.getRandomValues) c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function defaultStore(): Store | null {
  try {
    return (globalThis as { localStorage?: Store }).localStorage ?? null
  } catch {
    return null
  }
}

export function getPid(storage: Store | null = defaultStore()): string {
  try {
    const v = storage?.getItem(PID_KEY)
    if (isPid(v)) return v
  } catch {
    storage = null
  }
  const p = randomHex()
  try {
    storage?.setItem(PID_KEY, p)
  } catch {
    return p
  }
  return p
}
