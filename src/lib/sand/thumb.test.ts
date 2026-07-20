import { describe, it, expect } from 'vitest'
import { isBlank, THUMB_W, THUMB_H } from './thumb'

/** 씬 OG 이미지 = 썸네일. 이 치수가 FB·링크드인·카톡 대형 카드 임계 밑으로 내려가면 씬 공유가
 *  작은 카드로 떨어져 배급이 샌다. worker OG 메타는 이 상수에서 파생되므로 desync는 불가하지만,
 *  누가 상수 자체를 낮추는 건 이 테스트가 잡는다. */
describe('썸네일/OG 치수 불변식', () => {
  it('대형 소셜 카드 임계(600×315)를 넘긴다', () => {
    expect(THUMB_W).toBeGreaterThanOrEqual(600)
    expect(THUMB_H).toBeGreaterThanOrEqual(315)
  })

  it('격자(1200×600)와 같은 2:1 비율 — 씬이 안 찌그러진다', () => {
    expect(THUMB_W / THUMB_H).toBeCloseTo(2, 5)
  })
})

/** isBlank는 갤러리가 빈 화면 업로드로 오염되는 걸 막는다(채워진 비율 < 0.2%면 빈 것으로 본다). */
describe('isBlank', () => {
  it('전부 empty면 빈 것으로 본다', () => {
    const n = 10_000
    expect(isBlank(new Uint32Array(n), n)).toBe(true)
  })

  it('꽉 찬 격자는 빈 게 아니다', () => {
    const n = 10_000
    const c = new Uint32Array(n).fill(5)
    expect(isBlank(c, n)).toBe(false)
  })

  it('단 몇 셀만 그린 건(임계 이하) 빈 것으로 본다', () => {
    const n = 100_000
    const c = new Uint32Array(n)
    for (let i = 0; i < 10; i++) c[i * 7] = 5 // 극소량
    expect(isBlank(c, n)).toBe(true)
  })

  it('충분히 그린 건 빈 게 아니다', () => {
    const n = 100_000
    const c = new Uint32Array(n)
    for (let i = 0; i < n; i += 3) c[i] = 5 // 약 1/3
    expect(isBlank(c, n)).toBe(false)
  })
})
