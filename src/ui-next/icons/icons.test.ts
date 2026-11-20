import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { GRAIN_EXCEPTIONS, GRAIN_R, ICONS, ICON_NAMES, spriteSvg, type IconName } from './icons'
import { Icon, IconSprite } from './Icon'

type El = { tag: string; attrs: Record<string, string> }

/** 아이콘 마크업은 자기 닫는 요소의 나열뿐이다. 남는 글자가 있으면 파싱 실패. */
function parse(markup: string): El[] {
  const re = /<([a-z]+)((?:\s+[a-z-]+="[^"<>]*")*)\s*\/>/gy
  const out: El[] = []
  let m: RegExpExecArray | null
  let end = 0
  while ((m = re.exec(markup))) {
    const attrs: Record<string, string> = {}
    for (const a of m[2].matchAll(/([a-z-]+)="([^"]*)"/g)) {
      if (a[1] in attrs) throw new Error(`duplicate attr ${a[1]}`)
      attrs[a[1]] = a[2]
    }
    out.push({ tag: m[1], attrs })
    end = re.lastIndex
  }
  if (end !== markup.length) throw new Error(`unparsed at ${end}: ${markup.slice(end, end + 30)}`)
  return out
}

/** path d의 모든 끝점·제어점(절대 좌표). 호(A)는 끝점만. */
function pathPoints(d: string): [number, number][] {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  const pts: [number, number][] = []
  const arity: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }
  let i = 0
  let cmd = ''
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  const num = () => {
    const t = toks[i++]
    const n = Number(t)
    if (t === undefined || Number.isNaN(n)) throw new Error(`bad number in ${d}`)
    return n
  }
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++]
    const lc = cmd.toLowerCase()
    if (!(lc in arity)) throw new Error(`unknown command ${cmd}`)
    const rel = cmd !== cmd.toUpperCase()
    if (lc === 'z') {
      x = sx
      y = sy
      continue
    }
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    if (lc === 'h') {
      x = num() + ox
    } else if (lc === 'v') {
      y = num() + oy
    } else if (lc === 'a') {
      num(), num(), num(), num(), num()
      x = num() + ox
      y = num() + oy
    } else {
      const n = arity[lc] / 2
      for (let k = 0; k < n; k++) {
        const px = num() + ox
        const py = num() + oy
        pts.push([px, py])
        if (k === n - 1) {
          x = px
          y = py
        }
      }
    }
    pts.push([x, y])
    if (lc === 'm') {
      sx = x
      sy = y
      cmd = rel ? 'l' : 'L' // 이어지는 좌표쌍은 lineto
    }
  }
  return pts
}

const isGrain = (e: El) =>
  e.tag === 'circle' && Number(e.attrs.r) === GRAIN_R && e.attrs.fill === 'currentColor' && !e.attrs.stroke

describe('ICONS registry', () => {
  it('has the 25 set-v1 names (+ remix, frame)', () => {
    const v1 = [
      'pour', 'dig', 'undo', 'retry', 'speed', 'pause', 'sound-on', 'sound-off', 'share', 'link',
      'record', 'erase', 'brush-size', 'gallery', 'daily', 'strata', 'star-empty', 'star-full', 'gem',
      'lock', 'next', 'back', 'menu', 'info', 'settings',
    ]
    for (const n of v1) expect(ICON_NAMES).toContain(n)
    expect(ICON_NAMES).toHaveLength(31) // v1 27 + P6 홈 close·hand·external·copy
  })

  it('exceptions only name real icons and give a reason', () => {
    for (const [n, why] of Object.entries(GRAIN_EXCEPTIONS)) {
      expect(ICONS).toHaveProperty(n)
      expect(why!.length).toBeGreaterThan(5)
    }
  })

  describe.each(ICON_NAMES)('%s', (name: IconName) => {
    const markup = ICONS[name]
    const els = parse(markup)

    it('parses into known elements', () => {
      expect(els.length).toBeGreaterThan(0)
      for (const e of els) expect(['path', 'circle', 'rect', 'line']).toContain(e.tag)
    })

    it('is ASCII only (no emoji / unicode symbols)', () => {
      expect(/^[\x20-\x7e]*$/.test(markup)).toBe(true)
    })

    it('uses only currentColor / none for paint, stroke-width 2 when stroked', () => {
      expect(markup).not.toMatch(/#[0-9a-f]{3,8}|rgb|hsl|style=|class=|transform=/i)
      for (const e of els) {
        for (const k of ['fill', 'stroke']) {
          if (k in e.attrs) expect(['currentColor', 'none']).toContain(e.attrs[k])
        }
        const stroked = e.attrs.stroke === 'currentColor'
        if (stroked) {
          expect(e.attrs['stroke-width']).toBe('2')
          expect(e.attrs['stroke-linecap']).toBe('round')
          expect(e.attrs['stroke-linejoin']).toBe('round')
          expect(e.attrs.fill).toBe('none')
        } else {
          expect(e.attrs.fill).toBe('currentColor')
        }
      }
    })

    it('keeps all coordinates within 0..20', () => {
      const inBox = ([x, y]: [number, number]) => x >= 0 && x <= 20 && y >= 0 && y <= 20
      for (const e of els) {
        if (e.tag === 'path') {
          for (const pt of pathPoints(e.attrs.d)) expect(inBox(pt), `${name} ${pt}`).toBe(true)
        } else if (e.tag === 'circle') {
          const [cx, cy, r] = ['cx', 'cy', 'r'].map((k) => Number(e.attrs[k]))
          const pad = r + (e.attrs.stroke ? 1 : 0)
          expect(cx - pad >= 0 && cx + pad <= 20 && cy - pad >= 0 && cy + pad <= 20).toBe(true)
        }
      }
    })

    it(name in GRAIN_EXCEPTIONS ? 'has no grain dot (documented exception)' : 'has exactly one grain dot', () => {
      const dots = els.filter(isGrain).length
      expect(dots).toBe(name in GRAIN_EXCEPTIONS ? 0 : 1)
    })
  })
})

describe('sprite', () => {
  const sprite = spriteSvg()

  it('contains every icon exactly once', () => {
    for (const n of ICON_NAMES) {
      expect(sprite.split(`<symbol id="i-${n}" viewBox="0 0 20 20">`).length - 1).toBe(1)
    }
    expect(sprite.match(/<symbol /g)).toHaveLength(ICON_NAMES.length)
    expect(/^[\x20-\x7e]*$/.test(sprite)).toBe(true)
  })

  it('public/ui-next/icons.svg is up to date (npx tsx scripts/gen-icons.mts)', () => {
    const file = fileURLToPath(new URL('../../../public/ui-next/icons.svg', import.meta.url))
    expect(readFileSync(file, 'utf8')).toBe(sprite + '\n')
  })
})

describe('<Icon>', () => {
  it('is decorative without a label', () => {
    const html = renderToStaticMarkup(createElement(Icon, { name: 'pour' }))
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('role=')
    expect(html).toContain('width="20"')
    expect(html).toContain('<use href="#i-pour"></use>')
  })

  it('is an image with a label', () => {
    const html = renderToStaticMarkup(createElement(Icon, { name: 'share', size: 24, label: 'Share' }))
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Share"')
    expect(html).not.toContain('aria-hidden')
    expect(html).toContain('width="24"')
  })

  it('IconSprite renders all symbols', () => {
    const html = renderToStaticMarkup(createElement(IconSprite))
    expect(html.match(/<symbol /g)).toHaveLength(ICON_NAMES.length)
  })
})
