import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BottomSheet } from './BottomSheet'

const ROOT = fileURLToPath(new URL('../../..', import.meta.url))

describe('BottomSheet 정적 렌더', () => {
  it('닫힘 기본 = 아무것도 그리지 않는다', () => {
    expect(renderToStaticMarkup(<BottomSheet open={false} onClose={() => {}} label="X">안</BottomSheet>)).toBe('')
  })
  it('keepMounted 닫힘 = 내용을 hidden으로(SSR 링크 유지), 패널 id 그대로, dialog 역할 없음', () => {
    const html = renderToStaticMarkup(
      <BottomSheet open={false} onClose={() => {}} label="Menu" id="m" keepMounted>
        {(api) => <button onClick={() => api.close()}>Close</button>}
      </BottomSheet>,
    )
    expect(html).toBe('<div id="m" hidden="" data-sheet-closed=""><button>Close</button></div>')
  })
  it('SSR(마운트 전)에는 열림이어도 포털을 그리지 않는다 — 하이드레이션 불일치 방지', () => {
    expect(renderToStaticMarkup(<BottomSheet open onClose={() => {}} label="X">안</BottomSheet>)).toBe('')
  })
})

/**
 * UX 체크리스트 2항(docs/team/UX-CHECKLIST.md) 자동 검사: 모달은 공통 BottomSheet 하나로.
 * 손으로 만든 <dialog>·showModal·role="dialog"·aria-modal이 새로 생기면 떨어진다(11-20 전수: 예전 메뉴·공유 시트가 <dialog>였다).
 */
describe('모달은 BottomSheet 하나로', () => {
  const files: string[] = []
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(relative(ROOT, p).split('\\').join('/'))
    }
  }
  walk(join(ROOT, 'src'))
  const MODAL = /<dialog[\s>]|\.showModal\(|role="dialog"|role=\{'dialog'\}|aria-modal/

  it('src 안 모달 표식은 BottomSheet.tsx에만(컷오버 대기 예외 목록은 #108에서 비움)', () => {
    const bad = files
      .filter((r) => r !== 'src/ui-next/sheet/BottomSheet.tsx')
      .filter((r) => MODAL.test(readFileSync(join(ROOT, r), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')))
    expect(bad).toEqual([])
  })
  it('검사 자체가 동작한다(양성 대조: BottomSheet는 걸린다)', () => {
    for (const r of ['src/ui-next/sheet/BottomSheet.tsx']) {
      expect(files, r).toContain(r)
      expect(MODAL.test(readFileSync(join(ROOT, r), 'utf8')), r).toBe(true)
    }
  })
})
