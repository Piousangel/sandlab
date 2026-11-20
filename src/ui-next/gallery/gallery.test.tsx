import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { isValidId, type SceneMeta } from '@/lib/sand/gallery'
import { sceneIdFromHash } from '@/lib/sand/urlState'
import * as Classic from '../shell/classic'
import { GalleryWall } from './GalleryWall'
import { PICKS, SANDLAB_CREATOR, isSandlabPick, pickThumb } from './picks'
import { SORTS, appendPage, canPlay, creditLine, emptyState, endLive, hasMore, liveKey, nextLive, openHref, remixLabel, voteLabel } from './model'

const pub = (p: string) => fileURLToPath(new URL(`../../../public${p}`, import.meta.url))
const meta = (id: string): SceneMeta => ({ id, title: id, votes: 0, createdAt: 0, w: 1200, h: 600 })

describe('큐레이션 Sandlab pick 12점', () => {
  it('12점, id는 갤러리 id 형식이고 겹치지 않는다', () => {
    expect(PICKS).toHaveLength(12)
    expect(new Set(PICKS.map((p) => p.id)).size).toBe(12)
    for (const p of PICKS) expect(isValidId(p.id), p.id).toBe(true)
  })
  it('썸네일은 저장소 안 webp, 개당 20KB 이하', () => {
    for (const p of PICKS) {
      const f = pub(pickThumb(p.id))
      expect(existsSync(f), f).toBe(true)
      expect(statSync(f).size, p.id).toBeLessThanOrEqual(20_000)
    }
  })
  it('색조 메모가 이웃끼리 같지 않다(다양성 검토용 tone)', () => {
    for (let i = 1; i < PICKS.length; i++) expect(PICKS[i].tone).not.toBe(PICKS[i - 1].tone)
  })
  it('isSandlabPick — 목록 밖·빈 값은 false', () => {
    expect(isSandlabPick(PICKS[0].id)).toBe(true)
    expect(isSandlabPick('abcdefghijk')).toBe(false)
    expect(isSandlabPick(null)).toBe(false)
  })
})

describe('문구·규칙', () => {
  it('작성자 줄: 이름이 있으면 by, 없으면 Unsigned', () => {
    expect(creditLine('Mina')).toBe('by Mina')
    expect(creditLine('  ')).toBe('Unsigned')
    expect(creditLine(null)).toBe('Unsigned')
    expect(creditLine(SANDLAB_CREATOR)).toBe('by Sandlab')
  })
  it('단수·복수', () => {
    expect(remixLabel(1)).toBe('1 remix')
    expect(remixLabel(undefined)).toBe('0 remixes')
    expect(voteLabel(1)).toBe('1 vote')
    expect(voteLabel(3)).toBe('3 votes')
  })
  it('정렬은 Hot·New·Top 세 개(기존 API)', () => {
    expect(SORTS.map((s) => s.id)).toEqual(['hot', 'new', 'top'])
  })
  it('More 병합은 이미 있는 id를 버린다(새 업로드로 offset이 밀린 경우)', () => {
    const r = appendPage([meta('aaaaaa'), meta('bbbbbb')], [meta('bbbbbb'), meta('cccccc')])
    expect(r.map((s) => s.id)).toEqual(['aaaaaa', 'bbbbbb', 'cccccc'])
    expect(hasMore(24, 44)).toBe(true)
    expect(hasMore(44, 44)).toBe(false)
  })
  it('빈 상태: hot은 New로, 나머지는 붓기로', () => {
    expect(emptyState('hot', false).action).toBe('new')
    expect(emptyState('new', false).action).toBe('pour')
    expect(emptyState('top', false).action).toBe('pour')
    expect(emptyState('hot', true).action).toBe('pour')
  })
  it('라이브는 한 번에 하나: 새 요청이 대체, 같은 버튼은 멈춤, reduced-motion이면 hover 무시', () => {
    const B = (key: string) => ({ key, via: 'button' as const })
    const H = (key: string) => ({ key, via: 'hover' as const })
    expect(nextLive(null, 'a', 'button', false)).toEqual(B('a'))
    expect(nextLive(B('a'), 'b', 'button', false)).toEqual(B('b'))
    expect(nextLive(B('a'), 'a', 'button', false)).toBeNull()
    expect(nextLive(H('a'), 'b', 'hover', false)).toEqual(H('b'))
    expect(nextLive(H('a'), 'b', 'hover', true)).toEqual(H('a'))
    expect(nextLive(null, 'b', 'button', true)).toEqual(B('b'))
  })
  it('hover로 재생 중인 액자의 Play는 멈춤이 아니라 고정, 고정된 재생은 hover가 빼앗지 않고 마우스가 떠나도 계속', () => {
    const pinned = nextLive({ key: 'a', via: 'hover' }, 'a', 'button', false)
    expect(pinned).toEqual({ key: 'a', via: 'button' })
    expect(nextLive(pinned, 'b', 'hover', false)).toEqual(pinned)
    expect(endLive(pinned, 'a', 'leave')).toEqual(pinned)
    expect(endLive(pinned, 'a', 'end')).toBeNull()
    expect(endLive({ key: 'a', via: 'hover' }, 'a', 'leave')).toBeNull()
    expect(endLive({ key: 'a', via: 'hover' }, 'b', 'end')).toEqual({ key: 'a', via: 'hover' })
  })
  it('라이브 키는 구역별 — 큐레이션 id가 아래 목록에 다시 나와도 두 액자가 같이 켜지지 않는다', () => {
    expect(liveKey('pick', 'x')).not.toBe(liveKey('all', 'x'))
    expect(nextLive(null, liveKey('pick', 'x'), 'button', false)?.key).toBe('pick:x')
  })
  it('1200x600만 재생 가능(옛 960x540 업로드는 Play 없음)', () => {
    expect(canPlay(1200, 600)).toBe(true)
    expect(canPlay(960, 540)).toBe(false)
  })
  it('작품 링크는 P6 홈 진입 형식(#s=)이고 그대로 파싱된다', () => {
    expect(openHref('LmIK_BTArCk')).toBe('/#s=LmIK_BTArCk')
    expect(sceneIdFromHash(openHref('LmIK_BTArCk').slice(1))).toBe('LmIK_BTArCk')
  })
})

describe('GalleryWall SSR', () => {
  const html = renderToStaticMarkup(<GalleryWall />)
  it('h1 하나, 큐레이션 12점이 정적 HTML에 있다(API 없이도 빈 벽이 아니다)', () => {
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('The Wall')
    for (const p of PICKS) {
      expect(html).toContain(`href="/#s=${p.id}"`)
      expect(html).toContain(pickThumb(p.id))
    }
    expect(html.match(/by Sandlab/g)).toHaveLength(12)
  })
  it('SSR에는 라이브 캔버스가 없다(재생은 사용자 동작 뒤 한 점만)', () => {
    expect(html).not.toContain('<canvas')
  })
  it('정렬 버튼 세 개, Hot이 눌린 상태로 시작', () => {
    expect(html).toMatch(/aria-pressed="true"[^>]*>Hot</)
    expect(html).toContain('>New<')
    expect(html).toContain('>Top<')
  })
  it('댓글 없음(절대 규칙)', () => {
    expect(html.toLowerCase()).not.toContain('comment')
  })
  it('classic 셸은 GalleryWall = null(prod /gallery 그대로)', () => {
    expect(Classic.GalleryWall).toBeNull()
  })
})
