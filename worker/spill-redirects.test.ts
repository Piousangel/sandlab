import { describe, it, expect } from 'vitest'
import { spillRedirect, OLD_LEVEL_IDS } from './spill-redirects'
import { LEVELS as OLD } from '../src/lib/challenge/levels'

describe('옛 /play/<old-id> → 301 (§7.6)', () => {
  it('옛 20레벨 id를 전부 담는다', () => {
    expect(OLD_LEVEL_IDS).toHaveLength(20)
    expect([...OLD_LEVEL_IDS].sort()).toEqual(OLD.map((l) => l.id).sort())
  })
  it('옛 id는 /play로', () => {
    for (const id of OLD_LEVEL_IDS) {
      expect(spillRedirect(`/play/${id}`)).toBe('/play')
      expect(spillRedirect(`/play/${id}/`)).toBe('/play')
    }
  })
  it('새 레벨·목록·검증 페이지·그 밖의 경로는 건드리지 않는다', () => {
    expect(spillRedirect('/play')).toBeNull()
    expect(spillRedirect('/play/')).toBeNull()
    expect(spillRedirect('/play/1-1')).toBeNull()
    expect(spillRedirect('/play/verify')).toBeNull()
    expect(spillRedirect('/daily')).toBeNull()
    expect(spillRedirect('/play/fill-cup/extra')).toBeNull()
    expect(spillRedirect('/materials/fill-cup')).toBeNull()
  })
})
