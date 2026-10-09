import { describe, it, expect } from 'vitest'
import { packParams, PARAMS_BYTES } from './params'

const base = { W: 1200, H: 600, offset: 1, tick: 7, matCount: 19, brushX: 10, brushY: -1, brushR: 6,
  brushMat: 0xffffffff, prevX: -1, prevY: 20, recording: true, paintEmptyOnly: true, inkCap: 6000 }

describe('packParams', () => {
  it('64바이트(WGSL uniform 16바이트 정렬)', () => {
    expect(PARAMS_BYTES).toBe(64)
    expect(packParams(base).byteLength).toBe(64)
  })
  it('셰이더 Params 필드 순서대로 u32/i32를 쓴다', () => {
    const b = packParams(base)
    const u = new Uint32Array(b)
    const i = new Int32Array(b)
    expect([u[0], u[1], u[2], u[3], u[4]]).toEqual([1200, 600, 1, 7, 19])
    expect([i[5], i[6], i[7]]).toEqual([10, -1, 6])
    expect(u[8]).toBe(0xffffffff)
    expect([i[9], i[10]]).toEqual([-1, 20])
    expect(u[11]).toBe(1)
    expect(u[12]).toBe(1) // paintEmptyOnly
    expect(u[13]).toBe(6000) // inkCap — 이번 브러시 재료의 누적 잉크 상한(GPU에서 즉시 적용)
  })
  it('플래그 false는 0', () => {
    const u = new Uint32Array(packParams({ ...base, recording: false, paintEmptyOnly: false }))
    expect([u[11], u[12]]).toEqual([0, 0])
  })
})

describe('inkCap', () => {
  it('상한 없음은 0xffffffff', () => {
    const u = new Uint32Array(packParams({ ...base, inkCap: 0xffffffff }))
    expect(u[13]).toBe(0xffffffff)
  })
})
