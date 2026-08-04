import { describe, it, expect } from 'vitest'
import { encodeScene, decodeScene } from './urlState'
import { EMPTY_ID } from './materials'

/** 테스트용 격자 생성 (Uint32Array<ArrayBuffer>). */
function grid(w: number, h: number, fill: (i: number) => number): Uint32Array<ArrayBuffer> {
  const c = new Uint32Array(w * h)
  for (let i = 0; i < w * h; i++) c[i] = fill(i)
  return c
}

describe('urlState encode/decode 왕복', () => {
  it('빈 격자는 전부 empty로 왕복된다', async () => {
    const w = 8
    const h = 4
    const cells = grid(w, h, () => EMPTY_ID)
    const dec = await decodeScene(await encodeScene(cells, w, h))
    expect(dec).not.toBeNull()
    expect(dec!.w).toBe(w)
    expect(dec!.h).toBe(h)
    expect([...dec!.cells]).toEqual([...cells])
  })

  it('여러 물질이 run 경계를 넘어 보존된다', async () => {
    const w = 10
    const h = 3
    const cells = grid(w, h, (i) => i % 5) // 물질 0..4
    const dec = await decodeScene(await encodeScene(cells, w, h))
    expect([...dec!.cells]).toEqual([...cells])
  })

  it('셀 상위 비트(수명 등)는 버리고 물질 바이트만 저장한다', async () => {
    // 셀은 상위 비트에 수명을 담을 수 있으나 인코더는 물질만 저장한다.
    const w = 6
    const h = 2
    const cells = grid(w, h, (i) => (i % 3) | (0x1234 << 16)) // 상위 비트 = 수명 유사
    const dec = await decodeScene(await encodeScene(cells, w, h))
    for (let i = 0; i < w * h; i++) expect(dec!.cells[i]).toBe(i % 3)
  })

  it('긴 단일 run도 정확히 복원된다', async () => {
    const w = 100
    const h = 20
    const cells = grid(w, h, () => 7)
    const dec = await decodeScene(await encodeScene(cells, w, h))
    expect([...dec!.cells]).toEqual([...cells])
  })

  it('교대 패턴(최악의 RLE)도 왕복된다', async () => {
    const w = 16
    const h = 16
    const cells = grid(w, h, (i) => i % 2)
    const dec = await decodeScene(await encodeScene(cells, w, h))
    expect([...dec!.cells]).toEqual([...cells])
  })

  it('깨진 입력은 null을 돌려준다(던지지 않는다)', async () => {
    expect(await decodeScene('!!!!not-valid$$$')).toBeNull()
    expect(await decodeScene('')).toBeNull()
  })

  it('물질 id가 256을 넘으면 조용히 잘리지 않고 던진다', async () => {
    // RLE은 물질 하나당 1바이트. 지금 PRESETS(20종)로는 못 만드는 값이지만,
    // 이 상한을 넘는 셀이 들어오면 다른 물질로 잘못 저장되지 않도록 크게 터뜨려야 한다.
    const w = 4
    const h = 1
    const cells = grid(w, h, () => 300) // 300 & 0xff === 44 — 잘리면 다른 물질이 된다
    await expect(encodeScene(cells, w, h)).rejects.toThrow(/exceeds/)
  })

  it('255 이하 물질 id는 정상 왕복된다(경계값)', async () => {
    const w = 4
    const h = 1
    const cells = grid(w, h, () => 255)
    const dec = await decodeScene(await encodeScene(cells, w, h))
    expect([...dec!.cells]).toEqual([...cells])
  })
})
