import { describe, expect, it } from 'vitest'
import { levelShareText } from './shareLevel'

describe('levelShareText(레벨 모드 공유 텍스트 v2)', () => {
  it('유리알 ●○·이름·수·시간·레벨 링크', () => {
    expect(levelShareText({ id: '1-1', name: 'First Dig' }, 3, 1, 348)).toBe('Sandlab Spill · First Dig ●●● 1 move · 5.8s\nhttps://sandlab.app/play/1-1')
    expect(levelShareText({ id: '2-3', name: 'Gate' }, 1, 2, null)).toBe('Sandlab Spill · Gate ●○○ 2 moves\nhttps://sandlab.app/play/2-3')
  })
  it('이모지(그림 문자) 없음', () => {
    expect(/\p{Extended_Pictographic}/u.test(levelShareText({ id: '1-1', name: 'x' }, 2, 1, 60))).toBe(false)
  })
})
