/**
 * 결정적 정수 해시 RNG (§7.2 결정성 규칙).
 *
 * 내부 연산은 Math.imul과 >>>0, 비트 연산만 쓴다 — 부동소수점이 끼면 기기마다 결과가
 * 달라질 여지가 생기고, 리플레이·도전장·헤드리스 검증이 전부 그 위에 서 있다.
 * murmur3 32비트 블록 믹스 + fmix32 마무리.
 */

function mix(h: number, k: number): number {
  k = Math.imul(k, 0xcc9e2d51)
  k = (k << 15) | (k >>> 17)
  k = Math.imul(k, 0x1b873593)
  h ^= k
  h = (h << 13) | (h >>> 19)
  return (Math.imul(h, 5) + 0xe6546b64) | 0
}

/** hash32(a, b, c, d) → uint32. 시뮬에선 (x>>1, y>>1, tick, salt) 형태로 쓴다. */
export function hash32(a: number, b: number, c: number, d: number): number {
  let h = 0x2f1d3c5b
  h = mix(h, a | 0)
  h = mix(h, b | 0)
  h = mix(h, c | 0)
  h = mix(h, d | 0)
  h ^= 16
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** 정수 퍼센트 → Q16 확률. 테이블 정의용(빌드 시 상수). */
export function q16(percent: number): number {
  return ((percent * 65536) / 100) | 0
}

/** 확률 비교: (h & 0xffff) < chanceQ16. chanceQ16=65536이면 항상 참. */
export function roll(h: number, chanceQ16: number): boolean {
  return (h & 0xffff) < chanceQ16
}
