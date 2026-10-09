import { describe, it, expect } from 'vitest'
import {
  PRESETS,
  buildIndex,
  hexToRgb,
  packMaterials,
  MAX_REACTIONS,
  EMPTY_ID,
} from './materials'

describe('materials 데이터 무결성', () => {
  it('모든 반응이 실재하는 물질 slug를 참조한다', () => {
    // 오타난 slug는 조용히 EMPTY_ID로 resolve돼 반응이 무성의하게 죽는다 — 여기서 잡는다.
    const slugs = new Set(PRESETS.map((m) => m.slug))
    const special = new Set(['self', 'empty'])
    for (const m of PRESETS) {
      for (const r of m.reactions) {
        expect(slugs.has(r.with), `${m.slug}.with=${r.with}`).toBe(true)
        expect(slugs.has(r.become) || special.has(r.become), `${m.slug}.become=${r.become}`).toBe(true)
        expect(slugs.has(r.other) || special.has(r.other), `${m.slug}.other=${r.other}`).toBe(true)
      }
    }
  })

  it("자기 셀을 바꾸는 반응은 상대를 자기 재료로 바꾸지 않는다(자리 바꿈 버그)", () => {
    // 셰이더에서 other:'self' = 상대가 '이 재료'가 된다. become도 바뀌면 두 셀이 자리만 바꾼 꼴 —
    // 나무+불 → 나무는 불, 불은 나무가 돼 불이 나무를 남기고 다녔다. 얼음+물(become:self)처럼
    // 자기는 그대로이고 상대를 자기로 만드는(번짐) 반응만 other:'self'를 쓸 수 있다.
    for (const m of PRESETS) {
      for (const r of m.reactions) {
        if (r.become !== 'self' && r.become !== m.slug) {
          expect(r.other, `${m.slug}+${r.with}`).not.toBe('self')
        }
      }
    }
  })

  it('slug는 유일하다', () => {
    const slugs = PRESETS.map((m) => m.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('empty는 인덱스 0(EMPTY_ID)이다', () => {
    expect(buildIndex(PRESETS).get('empty')).toBe(EMPTY_ID)
  })

  it('PRESETS는 urlState의 1바이트 물질 인코딩(<256)에 들어간다', () => {
    // urlState.rleEncode는 물질을 1바이트로 저장한다. 256개를 넘으면 공유 링크가 깨진다.
    expect(PRESETS.length).toBeLessThanOrEqual(256)
  })

  it('hexToRgb는 #RRGGBB를 0..1로 파싱한다', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
    expect(hexToRgb('#ffffff')).toEqual([1, 1, 1])
    const [r, g, b] = hexToRgb('#804020')
    expect(r).toBeCloseTo(128 / 255)
    expect(g).toBeCloseTo(64 / 255)
    expect(b).toBeCloseTo(32 / 255)
  })

  it('packMaterials는 버퍼 크기가 물질 수에 맞고 chance를 [0,65535]로 양자화한다', () => {
    const { props, rx, count } = packMaterials(PRESETS)
    expect(count).toBe(PRESETS.length)
    expect(props.length).toBe(PRESETS.length * 8)
    expect(rx.length).toBe(PRESETS.length * MAX_REACTIONS * 4)
    for (let k = 3; k < rx.length; k += 4) {
      expect(rx[k]).toBeGreaterThanOrEqual(0)
      expect(rx[k]).toBeLessThanOrEqual(65535)
    }
  })
})
