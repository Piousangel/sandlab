import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { LEVELS } from '@/lib/spill/levels'
import { levelHash } from '@/lib/spill/level/hash'
import { ordered } from '@/lib/spill/client/catalog'
import { M } from '@/lib/spill/sim/materials'
import { SOON_MAX, WORLD_SIZE, galleryWorlds, primaryAction } from './galleryModel'
import { THUMB_H, THUMB_W, thumbPixels } from './thumbPixels'
import { LEVEL_READ_ONLY_NOTE, LevelAside } from './LevelAside'
import { LEVEL_NOTES, levelNoteFor } from '@/content/level-notes'
import { PlayWorlds } from './PlayWorlds'
import type { LevelAsideProps, PlayGalleryLevel } from '../shell/playTypes'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const levels: PlayGalleryLevel[] = ordered(LEVELS).map((l) => ({ id: l.id, world: l.world, name: l.name, line: 'x', guide: true }))
const starsMap = (m: Record<string, number>) => (id: string) => m[id] ?? 0
const all = (n: number) => Object.fromEntries(levels.map((l) => [l.id, n]))

describe('전시실 모델', () => {
  it('월드별 칸 = 실제 레벨 수, 마지막 월드만 곧 공개 칸(상한 SOON_MAX, 가짜 레벨 없음)', () => {
    const ws = galleryWorlds(levels, starsMap({}))
    expect(ws.map((w) => w.cells.length)).toEqual(ws.map((w) => levels.filter((l) => l.world === w.world).length))
    const last = ws[ws.length - 1]
    expect(last.soon).toBe(Math.min(SOON_MAX, WORLD_SIZE - last.cells.length))
    expect(ws[0].soon).toBe(0)
    expect(ws.flatMap((w) => w.cells.map((c) => c.id))).toEqual(levels.map((l) => l.id))
  })
  it('잠금은 prod 규칙 그대로: 월드 첫 칸은 늘 열림, 나머지는 앞 월드 레벨당 2별', () => {
    // W2 둘째 칸(2-2 Fuse, 11-26 출시)이 실제로 있으니 가짜 레벨 없이 실제 목록으로 본다
    const extra: PlayGalleryLevel[] = levels
    expect(extra.filter((l) => l.world === 2).length).toBeGreaterThanOrEqual(2)
    const locked = galleryWorlds(extra, starsMap({}))
    const w2 = locked.find((w) => w.world === 2)!
    expect(w2.cells.map((c) => c.open)).toEqual(w2.cells.map((_, i) => i === 0))
    expect(w2.lock).toBe(`Earn ${levels.filter((l) => l.world === 1).length * 2} stars in World 1 to open this room.`)
    const opened = galleryWorlds(extra, starsMap(all(2)))
    expect(opened.find((w) => w.world === 2)!.cells.every((c) => c.open)).toBe(true)
  })
  it('별 합계·범위 고정(0~3)', () => {
    const ws = galleryWorlds(levels, starsMap({ '1-1': 3, '1-2': 9, '1-3': -1 }))
    expect(ws[0].got).toBe(6)
    expect(ws[0].total).toBe(ws[0].cells.length * 3)
  })
  it('주 행동: 기록 없음 -> 첫 레벨, 진행 중 -> 3별 아닌 첫 열린 칸, 전부 3별 -> 데일리', () => {
    expect(primaryAction(galleryWorlds(levels, starsMap({})))).toEqual({ href: '/play/1-1', label: 'Start with 1-1 First Drop' })
    expect(primaryAction(galleryWorlds(levels, starsMap({ '1-1': 3, '1-2': 1 }))).href).toBe('/play/1-2')
    expect(primaryAction(galleryWorlds(levels, starsMap(all(3)))).href).toBe('/daily')
  })
})

describe('레벨 썸네일(정적 PNG)', () => {
  const manifest = JSON.parse(readFileSync(`${root}public/ui-next/levels/levels.json`, 'utf8')) as Record<string, { lh: string; bytes: number }>
  it.each(LEVELS.map((l) => [l.id, l] as const))('%s: 파일 있음·15KB 이하·레벨 해시 일치(바뀌면 gen-level-thumbs 재실행)', (id, l) => {
    const f = `${root}public/ui-next/levels/${id}.png`
    expect(existsSync(f)).toBe(true)
    expect(statSync(f).size).toBeLessThanOrEqual(15 * 1024)
    expect(manifest[id]?.lh).toBe(levelHash(l))
  })
  it('픽셀 = 시작 보드: 160x240, 벽 테두리는 벽 색, 정답(dev) 경로를 그리지 않는다', () => {
    const l = LEVELS[0]
    const px = thumbPixels(l)
    expect(px.length).toBe(THUMB_W * THUMB_H * 3)
    // (0,0)은 프레임 벽 — 회청색(빨강 < 파랑)
    expect(px[2]).toBeGreaterThan(px[0])
    // dev 해의 첫 칸(파낸 자리)은 여전히 흙/벽 색 — 빈칸(엔진 empty #07090D)이 아니다
    const dig = l.dev![0]
    const i = ((dig[3] * 4 + 1) * THUMB_W + dig[2] * 4 + 1) * 3
    expect(px[i] + px[i + 1] + px[i + 2]).toBeGreaterThan(7 + 9 + 13)
    expect(M.empty).toBe(0)
  })
})

describe('PlayWorlds 정적 HTML(기록 없음 상태)', () => {
  const html = renderToStaticMarkup(<PlayWorlds levels={levels} />)
  it('열린 레벨마다 링크 하나, 잠긴 레벨은 링크 없이 잠금 버튼 + 썸네일 img(크기 고정·alt 빈 값), 라이브 캔버스 없음', () => {
    const cells = galleryWorlds(levels, () => 0).flatMap((w) => w.cells)
    for (const c of cells.filter((x) => x.open)) expect(html).toContain(`href="/play/${c.id}"`)
    for (const c of cells.filter((x) => !x.open)) {
      expect(html).not.toContain(`href="/play/${c.id}"`)
      expect(html).toContain(`aria-label="${c.id} ${c.name}, locked.`)
    }
    expect(cells.length).toBe(levels.length)
    expect(html.match(/<img /g)?.length).toBe(levels.length)
    expect(html).toContain('width="160"')
    expect(html).not.toContain('<canvas')
  })
  it('곧 공개 칸은 링크·이미지 없이 lock + Soon', () => {
    expect(html).toContain('coming soon')
    expect(html).toContain('sl-pg-msg')
    expect(html.match(/sl-pg-soon"/g)?.length).toBe(galleryWorlds(levels, () => 0).reduce((n, w) => n + w.soon, 0))
  })
  it('이모지·별 기호 없음(아이콘은 스프라이트)', () => {
    expect(html).not.toMatch(/[★☆🔒▶]/u) // lint-ui-allow: 기호가 없는지 검사
  })
})

describe('LevelAside(/play/[id] 새 셸 패널)', () => {
  const props: LevelAsideProps = {
    id: '1-1', name: 'First Drop', world: 1, worldName: 'Flow', summary: 'Sum.', verbs: ['Dig: drag'],
    materials: [{ slug: 'water', page: true }, { slug: 'dirt', page: false }], hint: 'Dig straight down.', guide: true, next: { id: '1-2', name: 'Detour' },
  }
  it('방법이 요약보다 먼저(목표 -> 방법 순서), prod 패널의 링크를 모두 가진다, 인라인 style 없음', () => {
    const html = renderToStaticMarkup(<LevelAside {...props} readOnly={false} />)
    expect(html.indexOf('How to play')).toBeLessThan(html.indexOf('About this level'))
    for (const href of ['/materials/water', '/play', '/play/1-1/guide', '/play/1-2']) expect(html).toContain(`href="${href}"`)
    expect(html).not.toContain('style=')
    expect(html).not.toContain(LEVEL_READ_ONLY_NOTE)
  })
  it('프리뷰 읽기 전용이면 안내 한 줄', () => {
    expect(renderToStaticMarkup(<LevelAside {...props} readOnly />)).toContain('data-sl-read-only')
  })
  it('레벨 노트: 있으면 절·막힘 목록을 그리고, 없으면 절을 숨긴다(#112 2단계)', () => {
    const note = levelNoteFor('1-1')!
    const html = renderToStaticMarkup(<LevelAside {...props} notes={note} />)
    expect(html).toContain('Notes on 1-1 First Drop')
    expect(html).toContain('If you are stuck')
    for (const t of note.stuck) expect(html).toContain(`<li>${t}</li>`)
    expect(renderToStaticMarkup(<LevelAside {...props} notes={null} />)).not.toContain('Notes on')
  })
  it('노트 id는 실제 레벨 id만, 막힘 1~3줄', () => {
    const ids = new Set(LEVELS.map((l) => l.id))
    for (const [id, n] of Object.entries(LEVEL_NOTES)) {
      expect(ids.has(id), id).toBe(true)
      expect(n.stuck.length).toBeGreaterThanOrEqual(1)
      expect(n.stuck.length).toBeLessThanOrEqual(3)
    }
  })
  it('spill.css의 인라인 덮어쓰기(!important) 두 규칙이 지워졌다', () => {
    const css = readFileSync(`${root}src/ui-next/spill/spill.css`, 'utf8')
    expect(css).not.toMatch(/a\[style\]/)
    expect(css).not.toMatch(/p\[style\*=/)
  })
})
