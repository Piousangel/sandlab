import { describe, it, expect } from 'vitest'
import sitemap from './sitemap'
import { SITE } from '@/lib/site'
import { LEVELS } from '@/lib/spill/levels'
import { OLD_LEVEL_IDS } from '../../worker/spill-redirects'

describe('sitemap', () => {
  const urls = sitemap().map((e) => e.url)
  it('콘텐츠 페이지를 모두 담는다', () => {
    for (const p of ['', '/gallery', '/learn', '/learn/margolus-falling-sand', '/learn/materials-as-data', '/learn/history-of-falling-sand-games', '/materials', '/materials/lava', '/materials/water', '/about', '/privacy', '/play', '/daily']) {
      expect(urls).toContain(`${SITE}${p}`)
    }
  })
  it('empty 재료 페이지와 중복 URL이 없다', () => {
    expect(urls).not.toContain(`${SITE}/materials/empty`)
    expect(urls).not.toContain(`${SITE}/materials/wall`) // page:false — 허브에만
    expect(urls).not.toContain(`${SITE}/play/verify`) // 개발용
    expect(new Set(urls).size).toBe(urls.length)
  })
  it('Spill 레벨을 전부 담고 301로 옮긴 옛 레벨 URL은 뺀다', () => {
    for (const l of LEVELS) expect(urls).toContain(`${SITE}/play/${l.id}`)
    for (const id of OLD_LEVEL_IDS) expect(urls).not.toContain(`${SITE}/play/${id}`)
    expect(urls.filter((u) => u.startsWith(`${SITE}/play/`) && !u.endsWith('/guide'))).toHaveLength(LEVELS.length)
    expect(urls).not.toContain(`${SITE}/spill/bench`)
  })
  it('레벨마다 공략 페이지를 담는다', () => {
    for (const l of LEVELS) expect(urls).toContain(`${SITE}/play/${l.id}/guide`)
  })
})
