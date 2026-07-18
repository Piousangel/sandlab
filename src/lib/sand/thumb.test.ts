import { describe, it, expect } from 'vitest'
import { isBlank } from './thumb'

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
