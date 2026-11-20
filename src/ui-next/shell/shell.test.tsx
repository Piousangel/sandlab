import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import sitemap from '@/app/sitemap'
import { SITE } from '@/lib/site'
import { findViolations } from '../../../scripts/lint-ui-rules.mjs'
import { AdPlate } from '../ads/AdPlate'
import { ADS_ENABLED, AD_SLOTS } from '../ads/config'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ARTICLES } from '@/lib/learn/articles'
import { LearnArticle } from '../content/Articles'
import { SHELL_AREAS } from '../../../next.config'
import { DAILY_HREF, FOOTER_LINKS, MENU_LINKS, NAV, isActive } from './nav'
import { SSR_PILL, msUntilUtcMidnight, pillText } from './dailyPill'
import { ShellFooter } from './ShellFooter'
import { ShellHeader } from './ShellHeader'
import { ReadOnlyNote, previewReadOnly } from './ReadOnlyNote'

const paths = new Set(sitemap().map((e) => e.url.replace(SITE, '') || '/'))
const hrefs = (html: string) => [...html.matchAll(/href="([^"#]+)"/g)].map((m) => m[1])

describe('셸 링크 표(S10)', () => {
  it('내비는 Pour·Solve·Browse·Learn 4개, 모두 sitemap에 있는 실제 라우트', () => {
    expect(NAV.map((l) => l.label)).toEqual(['Pour', 'Solve', 'Browse', 'Learn'])
    for (const l of [...NAV, ...MENU_LINKS, ...FOOTER_LINKS, { href: DAILY_HREF }]) expect(paths, l.href).toContain(l.href)
  })

  it('푸터에 Terms·Contact, 지금 ContentShell 헤더·푸터 링크를 하나도 잃지 않는다', () => {
    expect(FOOTER_LINKS.map((l) => l.label)).toEqual(['Learn', 'Materials', 'About', 'Privacy', 'Terms', 'Contact'])
    const classic = ['/', '/play', '/learn', '/materials', '/gallery', '/about', '/privacy', '/terms', '/contact']
    const html = renderToStaticMarkup(<ShellHeader />) + renderToStaticMarkup(<ShellFooter />)
    for (const h of classic) expect(hrefs(html), h).toContain(h)
  })

  it('isActive: 홈은 정확히 /, 나머지는 하위 경로 포함, 끝 슬래시 무시', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('/play', '/')).toBe(false)
    expect(isActive('/play/1-2/guide/', '/play')).toBe(true)
    expect(isActive('/players', '/play')).toBe(false)
    expect(isActive(null, '/learn')).toBe(false)
  })
})

describe('데일리 pill(UTC 자정 기준)', () => {
  const at = (iso: string) => Date.parse(iso)
  it('남은 시간 hh:mm(분 올림), 번호는 dayNumber와 같다', () => {
    expect(pillText(at('2026-11-20T17:47:30Z'))).toEqual({ no: 'Daily', left: '06:13', label: 'Daily · 06:13, puzzle No.43, 6 hours 13 minutes left' })
    expect(pillText(at('2026-11-20T23:59:30Z')).left).toBe('00:01')
    expect(pillText(at('2026-11-20T22:59:00Z')).label).toBe('Daily · 01:01, puzzle No.43, 1 hour 1 minute left')
  })
  it('접근 이름이 보이는 글자로 시작한다(WCAG 2.5.3 label-in-name)', () => {
    const t = pillText(at('2026-11-20T03:04:00Z'))
    // 보이는 글자 = ShellHeader가 그리는 `${no} · ${left}`("Daily · 03:04") — P9: 보이는 글자에 'Daily'가 있어야 한다(3초 테스트)
    expect(t.no).toBe('Daily')
    expect(t.label.startsWith(`${t.no} · ${t.left}`)).toBe(true)
    expect(SSR_PILL.label.startsWith(SSR_PILL.no)).toBe(true)
  })
  it('자정 경계: 정각은 다음 날 번호 + 24:00', () => {
    expect(msUntilUtcMidnight(at('2026-11-21T00:00:00Z'))).toBe(86_400_000)
    expect(pillText(at('2026-11-21T00:00:00Z'))).toMatchObject({ left: '24:00' })
    expect(pillText(at('2026-11-21T00:00:00Z')).label).toContain('puzzle No.44,')
    expect(pillText(at('2026-11-20T23:59:59.999Z')).label).toContain('puzzle No.43,')
  })
  it('SSR 문구는 시간이 없다(정적 HTML에 빌드 시각이 굽히지 않게)', () => {
    expect(SSR_PILL.left).toBe('')
    const html = renderToStaticMarkup(<ShellHeader />)
    expect(html).toContain(`aria-label="${SSR_PILL.label}"`)
    expect(html).not.toMatch(/\d\d:\d\d/)
  })
})

describe('헤더·푸터 정적 렌더', () => {
  const header = renderToStaticMarkup(<ShellHeader />)
  const footer = renderToStaticMarkup(<ShellFooter />)

  it('헤더: wordmark·내비·메뉴 버튼(dialog 연결)·아이콘 스프라이트, 시트 안 소리·About·Privacy·Terms·Contact', () => {
    expect(header).toContain('data-sl-shell="header"')
    expect(header).toContain('aria-label="Sandlab home"')
    expect(header).toContain('aria-haspopup="dialog"')
    expect(header).toMatch(/<div id="sl-menu" hidden=""/) // 닫힌 메뉴 시트(BottomSheet keepMounted) — 링크가 SSR HTML에 남는다
    expect(header).toContain('id="i-menu"') // 스프라이트가 셸 최상단에 한 번
    expect(header).toContain('aria-pressed="true"') // 소리 토글(SSR 기본 켜짐)
    for (const l of ['About', 'Privacy', 'Terms', 'Contact', 'Daily']) expect(header).toContain(`>${l}</a>`)
  })

  it('첫 방문 낙하는 reduced-motion을 먼저 확인하고, 이미 본 사람에게는 표시를 달지 않는다', () => {
    expect(header).toContain('prefers-reduced-motion: reduce')
    expect(header).toContain("localStorage.getItem('sl.wordmark.v1')")
  })

  it('푸터: 면 하나, 저작권 줄', () => {
    expect(footer).toContain('data-sl-shell="footer"')
    expect(footer.match(/class="sl-shell sl-foot"/g)).toHaveLength(1)
    expect(footer).toContain('© 2026 Sandlab')
  })

  it('이모지·기호 아이콘 0, 광고 코드 0', () => {
    for (const html of [header, footer]) {
      expect(findViolations(html, 'x.html')).toEqual([])
      expect(html).not.toContain('adsbygoogle')
    }
  })
})

describe('광고 안내판 AdPlate(S11)', () => {
  it('광고 비활성(로더 없는 페이지)이거나 광고 단위가 없으면 DOM에 아무것도 없다', () => {
    expect(renderToStaticMarkup(<AdPlate ads={false} slot="123" />)).toBe('')
    expect(renderToStaticMarkup(<AdPlate ads slot={undefined} />)).toBe('')
    // P10(11-20): 오너가 3자리 중 2자리 단위를 만들었다 — 글 끝(contentEnd)은 아직 없어 렌더 0
    expect(AD_SLOTS.contentEnd).toBeNull()
  })

  it('활성: Advertisement 라벨, 높이 예약(라벨 포함), 24px 이상 간격, 콘텐츠 카드와 다른 면', () => {
    const html = renderToStaticMarkup(<AdPlate enabled ads slot="123" format="rect" clearance={32} />)
    expect(html).toContain('>Advertisement</span>')
    expect(html).toContain('height:274px') // 250 + 라벨 24
    expect(html).toContain('margin-block:max(var(--sl-s-5), 32px)')
    expect(html).toContain('class="adsbygoogle sl-ad-face"')
    expect(html).toContain('data-ad-slot="123"')
    expect(html).not.toContain('sl-foot') // 콘텐츠 면 클래스를 쓰지 않는다
  })

  it('간격은 24px 아래로 못 내려간다(타입을 우회해도 max()가 바닥)', () => {
    // @ts-expect-error — 24 미만은 타입에서 막힌다
    const html = renderToStaticMarkup(<AdPlate enabled ads slot="1" clearance={8} format="banner" />)
    expect(html).toContain('margin-block:max(var(--sl-s-5), 8px)')
    expect(html).toContain('height:124px')
  })
})

describe('광고 꺼짐(P11, 허브와 같은 규칙 — AdSense 승인 전)', () => {
  it('ADS_ENABLED = false면 단위 id가 있어도 안내판 DOM 0(빈 Advertisement 판 없음)', () => {
    expect(ADS_ENABLED).toBe(false)
    expect(AD_SLOTS.play).toBeTruthy()
    expect(renderToStaticMarkup(<AdPlate ads slot={AD_SLOTS.play} format="rect" />)).toBe('')
    expect(renderToStaticMarkup(<AdPlate ads slot={AD_SLOTS.contentMid} format="strip" clearance={32} />)).toBe('')
  })
  it('글 페이지 전체를 그려도 안내판 0, 광고 로더(심사 자격용)는 그대로 실린다', () => {
    const a = ARTICLES[0]
    const html = renderToStaticMarkup(
      <LearnArticle title={a.title} byline="By x" sections={a.sections} sources={a.sources} others={[]} prev={null} next={null}>
        {null}
      </LearnArticle>,
    )
    expect(html).not.toContain('data-sl-ad')
    expect(html).not.toContain('Advertisement')
    expect(html).toContain('adsbygoogle.js')
  })
})

describe('@ui-shell 영역 치환(P11 LCP — next.config.ts SHELL_AREAS)', () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
  const users = walk(join(root, 'src'))
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => ({ file: f.slice(root.length), src: readFileSync(f, 'utf8') }))
    .map((u) => ({ file: u.file, names: [...u.src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'@ui-shell'/g)].flatMap((m) => m[1].split(',').map((x) => x.trim()).filter(Boolean)) }))
    .filter((u) => u.names.length)
  const exportsOf = (area: string) => {
    const src = readFileSync(join(root, `src/ui-next/shell/area-${area}.ts`), 'utf8')
    return new Set([...src.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((x) => x.trim())).concat([...src.matchAll(/export const (\w+)/g)].map((m) => m[1])))
  }
  it('`@ui-shell` 사용처 전부가 표에 있고(없으면 프리뷰 빌드가 멈춘다), 그 영역이 쓰는 이름을 모두 내보낸다', () => {
    expect(users.length).toBeGreaterThanOrEqual(12)
    for (const u of users) {
      const area = SHELL_AREAS[u.file]
      expect(area, u.file).toBeTruthy()
      const ex = exportsOf(area)
      for (const n of u.names) expect(ex.has(n), `${u.file} to area-${area}.ts: ${n}`).toBe(true)
    }
  })
  it('표에 사용처가 아닌 낡은 줄이 없다', () => {
    const files = new Set(users.map((u) => u.file))
    for (const f of Object.keys(SHELL_AREAS)) expect(files.has(f), f).toBe(true)
  })
  it('글 페이지 영역(content)은 엔진·홈·갤러리 화면을 import하지 않는다(글 페이지에 엔진 청크가 실리던 원인)', () => {
    const src = readFileSync(join(root, 'src/ui-next/shell/area-content.ts'), 'utf8')
    expect(src).not.toMatch(/home|gallery|spill|engine/)
  })
})

describe('프리뷰 읽기 전용 안내(오너 11-20)', () => {
  it('NEXT_PUBLIC_READ_ONLY는 정확히 "1"일 때만 켜진다', () => {
    expect(previewReadOnly('1')).toBe(true)
    for (const v of [undefined, '', '0', 'true', 'next']) expect(previewReadOnly(v), String(v)).toBe(false)
  })

  it('on이면 role=note 한 줄, 문구는 기호 없이', () => {
    const html = renderToStaticMarkup(<ReadOnlyNote on />)
    expect(html).toContain('role="note"')
    expect(html).toContain('data-sl-read-only')
    expect(html).toContain('Preview is read-only.')
    expect(findViolations(html, 'x.html')).toEqual([])
  })

  it('NEXT_PUBLIC_READ_ONLY=1 빌드에서는 헤더 아래 + 메뉴 시트 안 두 곳에 안내가 붙는다(연결 확인)', async () => {
    vi.stubEnv('NEXT_PUBLIC_READ_ONLY', '1')
    vi.resetModules()
    try {
      const { ShellHeader: H } = await import('./ShellHeader')
      const html = renderToStaticMarkup(<H />)
      expect(html.match(/data-sl-read-only/g)?.length).toBe(2)
      expect(html).toContain('class="sl-ro"')
      expect(html).toContain('class="sl-ro-sheet"')
    } finally {
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })

  it('변수 없는 빌드(테스트·prod 기본)에서는 헤더·메뉴 시트에 안내가 없다', () => {
    expect(renderToStaticMarkup(<ReadOnlyNote on={false} />)).toBe('')
    expect(renderToStaticMarkup(<ShellHeader />)).not.toContain('data-sl-read-only')
  })
})
