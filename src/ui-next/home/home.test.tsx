import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PRESETS } from '@/lib/sand/materials'
import { sceneIdFromHash } from '@/lib/sand/urlState'
import type { Stratum } from '@/lib/strata'
import atlas from '../../../public/ui-next/posters/atlas.json'
import * as Classic from '../shell/classic'
import { HomePour } from './HomePour'
import { TUBE_GLASS } from './Rack'
import {
  BRUSH_SIZES,
  DEFAULT_BRUSH,
  DEMO_MS,
  HEADLINE,
  PALE,
  STRIP_FRAMES,
  STRIP_MS,
  STRIP_SLUGS,
  daysLabel,
  demoBrush,
  entryHeadline,
  hashNeedsReload,
  rackOrder,
  rovingNext,
  rovingStop,
  shouldDemo,
  shouldPour,
  strataBand,
  warmList,
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

describe('P11 선택 관 한 번 붓기(S7)', () => {
  it('스트립 목록 = public/ui-next/posters/strips 파일, 고체 6종은 없음', () => {
    const files = readdirSync('public/ui-next/posters/strips')
      .map((f) => f.replace(/\.webp$/, ''))
      .sort()
    expect([...STRIP_SLUGS].sort()).toEqual(files)
    for (const m of rackOrder(PRESETS)) expect(STRIP_SLUGS.has(m.slug)).toBe(tabOf(m) !== 'solid')
  })
  it('재생 조건: 스트립 있음 + 새로 고름 + 움직임 허용 + Save-Data 아님(코어 수로 거르지 않음)', () => {
    const base = { slug: 'water', already: false, reducedMotion: false, saveData: false }
    expect(shouldPour(base)).toBe(true)
    expect(shouldPour({ ...base, slug: 'stone' })).toBe(false)
    expect(shouldPour({ ...base, already: true })).toBe(false)
    expect(shouldPour({ ...base, reducedMotion: true })).toBe(false)
    expect(shouldPour({ ...base, saveData: true })).toBe(false)
  })
  it('미리 받기: 보이는 순서 앞 6관 중 스트립 있는 것, Save-Data면 0', () => {
    const shown = rackOrder(PRESETS).map((m) => m.slug)
    const w = warmList(shown, false)
    expect(w.length).toBeGreaterThan(0)
    expect(w.length).toBeLessThanOrEqual(6)
    expect(w.every((s) => STRIP_SLUGS.has(s) && shown.indexOf(s) < 6)).toBe(true)
    expect(warmList(shown, true)).toEqual([])
    expect(warmList(['stone', 'wall', 'metal'], false)).toEqual([])
  })
  it('CSS 스트립 이동 = (프레임-1) x 관 폭, 길이는 보상 최대(900ms) 안', () => {
    const css = readFileSync('src/ui-next/home/home.css', 'utf8')
    expect(css).toContain(`translateX(-${(STRIP_FRAMES - 1) * TUBE_GLASS.w}px)`)
    expect(css).toContain(`steps(${STRIP_FRAMES}, jump-none)`)
    expect(STRIP_MS).toBeLessThanOrEqual(900)
  })
})

describe('P11 재료·도크 툴바 키보드(로빙)', () => {
  it('좌우 화살표는 감기, Home·End, 다른 키는 무시', () => {
    expect(rovingNext('ArrowRight', 17, 18)).toBe(0)
    expect(rovingNext('ArrowLeft', 0, 18)).toBe(17)
    expect(rovingNext('Home', 9, 18)).toBe(0)
    expect(rovingNext('End', 2, 18)).toBe(17)
    expect(rovingNext('Enter', 2, 18)).toBe(-1)
    expect(rovingNext('ArrowRight', 0, 0)).toBe(-1)
  })
  it('정지점: 마지막 포커스, 선택, 맨 앞 순(보이는 관 중에서)', () => {
    expect(rovingStop(['sand', 'water'], 'water', 'sand')).toBe('water')
    expect(rovingStop(['sand', 'water'], 'lava', 'water')).toBe('water')
    expect(rovingStop(['stone', 'wood'], null, 'sand')).toBe('stone')
    expect(rovingStop([], null, 'sand')).toBeNull()
  })
  const html = renderToStaticMarkup(<HomePour />)
  it('SSR: 재료 toolbar 하나, 관 18개 중 Tab 정지점은 선택된 sand 하나', () => {
    expect(html.match(/role="toolbar" aria-label="Material"/g)).toHaveLength(1)
    const tubes = html.match(/<button[^>]*class="sl-tube-btn"[^>]*>/g) ?? []
    expect(tubes).toHaveLength(18)
    const stops = tubes.filter((b) => b.includes('tabindex="0"'))
    expect(stops).toHaveLength(1)
    expect(stops[0]).toContain('aria-pressed="true"')
  })
  it('SSR: 엄지 도크 toolbar도 Tab 정지점 1개(Erase), 버튼 5개', () => {
    const dock = html.slice(html.indexOf('aria-label="Brush"'), html.indexOf('id="sl-share-why"'))
    const btns = dock.match(/<button[^>]*>/g) ?? []
    expect(btns).toHaveLength(5)
    expect(btns.filter((b) => b.includes('tabindex="0"'))).toHaveLength(1)
    expect(btns[0]).toContain('tabindex="0"')
  })
})
