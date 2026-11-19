import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PRESETS } from '@/lib/sand/materials'
import { sceneIdFromHash } from '@/lib/sand/urlState'
import type { Stratum } from '@/lib/strata'
import atlas from '../../../public/ui-next/posters/atlas.json'
import * as Classic from '../shell/classic'
import { HomePour } from './HomePour'
import {
  BRUSH_SIZES,
  DEFAULT_BRUSH,
  DEMO_MS,
  HEADLINE,
  PALE,
  daysLabel,
  demoBrush,
  entryHeadline,
  hashNeedsReload,
  rackOrder,
  shouldDemo,
  strataBand,
  tabOf,
} from './model'

describe('시험관 랙(S7)', () => {
  const rack = rackOrder(PRESETS)
  it('18재료 전부, empty 없음, sand가 맨 앞(기본 선택)', () => {
    expect(rack).toHaveLength(18)
    expect(rack.map((m) => m.slug)).not.toContain('empty')
    expect(rack[0].slug).toBe('sand')
  })
  it('탭 순서 가루 to 액체 to 고체 to 기체, static은 Solid', () => {
    const tabs = rack.map(tabOf)
    expect([...new Set(tabs)]).toEqual(['powder', 'liquid', 'solid', 'gas'])
    expect(tabOf({ movement: 'static' })).toBe('solid')
  })
  it('모든 관이 아틀라스(#67 실엔진 포스터)에 타일이 있다', () => {
    for (const m of rack) expect(atlas.tiles, m.slug).toHaveProperty(m.slug)
  })
  it('옅은 재료 4종(salt·steam·ice·metal)은 결 패턴 대상', () => {
    expect([...PALE].sort()).toEqual(['ice', 'metal', 'salt', 'steam'])
  })
})

describe('붓 크기 점 3개', () => {
  it('반경 3/6/12, 기본 6(옛 홈 기본값)', () => {
    expect(BRUSH_SIZES.map((b) => b.r)).toEqual([3, 6, 12])
    expect(DEFAULT_BRUSH).toBe(6)
  })
})

describe('첫 방문 붓기 데모', () => {
  it('1.5초 동안만, 위쪽(6%)에서, 격자 안에서 붓는다', () => {
    expect(DEMO_MS).toBe(1500)
    for (let t = 0; t < DEMO_MS; t += 50) {
      const b = demoBrush(t, 1200, 600)!
      expect(b.y).toBe(36)
      expect(b.x).toBeGreaterThan(500)
      expect(b.x).toBeLessThan(700)
    }
    expect(demoBrush(DEMO_MS, 1200, 600)).toBeNull()
    expect(demoBrush(-1, 1200, 600)).toBeNull()
  })
  it('첫 방문 + 움직임 허용 + 빈 캔버스일 때만', () => {
    expect(shouldDemo({ seen: false, reducedMotion: false, restored: false })).toBe(true)
    expect(shouldDemo({ seen: true, reducedMotion: false, restored: false })).toBe(false)
    expect(shouldDemo({ seen: false, reducedMotion: true, restored: false })).toBe(false)
    expect(shouldDemo({ seen: false, reducedMotion: false, restored: true })).toBe(false)
  })
})

describe('진입 상태 헤드라인(B4 ④)', () => {
  it('빈 홈 / #s= 장면 / #g= 링크', () => {
    expect(entryHeadline({ kind: 'blank' }).title).toBe(HEADLINE)
    const s = entryHeadline({ kind: 'scene', id: 'AbC123', title: 'Shelf, slipping', creatorName: 'sora', remixCount: 3 })
    expect(s).toEqual({ title: 'Shelf, slipping', sub: 'by sora · 3 remixes' })
    expect(entryHeadline({ kind: 'scene', id: 'AbC123', title: '', creatorName: null, remixCount: 1 })).toEqual({
      title: 'Untitled',
      sub: 'From the gallery · 1 remix',
    })
    expect(entryHeadline({ kind: 'link' }).title).toBe('A scene someone shared')
  })
  it('홈 안 해시 이동: 다른 장면 링크로 바뀌면 새로고침, 같거나 장면이 아니면 그대로', () => {
    expect(hashNeedsReload('', '#s=AbC123', sceneIdFromHash)).toBe(true)
    expect(hashNeedsReload('#s=AbC123', '#s=XyZ789', sceneIdFromHash)).toBe(true)
    expect(hashNeedsReload('#s=AbC123', '#s=AbC123', sceneIdFromHash)).toBe(false)
    expect(hashNeedsReload('', '#g=AAAA', sceneIdFromHash)).toBe(true)
    expect(hashNeedsReload('', '#about', sceneIdFromHash)).toBe(false)
  })
})

describe('지층 띠', () => {
  const st = (dayNumber: number, missed: boolean): Stratum => ({ dayNumber, dateUTC: '', material: 'sand', stars: missed ? 0 : 2, missed })
  it('첫 기록일부터 오늘까지, 기록이 없으면 빈 띠', () => {
    expect(strataBand([st(1, true), st(2, true)])).toEqual([])
    const b = strataBand([st(1, true), st(2, false), st(3, true), st(4, false)])
    expect(b.map((s) => s.dayNumber)).toEqual([2, 3, 4])
    expect(daysLabel(b)).toBe('2 days')
    expect(daysLabel([st(5, false)])).toBe('1 day')
  })
})

describe('셸 치환(@ui-shell)', () => {
  it('classic(prod)은 HomePour = null to 홈이 지금 SandCanvas를 그린다', () => {
    expect(Classic.HomePour).toBeNull()
  })
})

describe('HomePour SSR(높이 예약·첫 화면)', () => {
  const html = renderToStaticMarkup(<HomePour />)
  it('헤드라인·우물 캔버스 1200x600·Share 흐림(aria-disabled)', () => {
    expect(html).toContain(`<h1 class="sl-home-h1">${HEADLINE}</h1>`)
    expect(html).toMatch(/<canvas[^>]*width="1200"[^>]*height="600"/)
    expect(html).toMatch(/aria-disabled="true"[^>]*><svg[^>]*><use href="#i-share"/)
  })
  it('랙 18관 + 탭 5개 + 붓 크기 3개, Undo 없음', () => {
    expect(html.match(/class="sl-tube-btn"/g)).toHaveLength(18)
    expect(html.match(/role="tab"/g)).toHaveLength(5)
    expect(html.match(/class="sl-size"/g)).toHaveLength(3)
    expect(html).not.toContain("<use href=\"#i-undo\"")
    expect(html).not.toMatch(/>Undo</)
  })
  it('오늘 카드·지층·벽이 SSR에 자리를 잡는다(마운트 뒤 밀림 없음)', () => {
    expect(html).toContain('sl-today')
    expect(html).toContain('sl-strata')
    expect(html.match(/class="sl-wall-frame"/g)).toHaveLength(2)
  })
})
