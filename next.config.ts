import type { NextConfig } from 'next'
import { realpathSync } from 'node:fs'
import { relative } from 'node:path'

// 리디자인 셸 전환(S6, src/ui-next/flag.ts): `@ui-shell`(tsconfig paths → shell/classic.ts)을
// NEXT_PUBLIC_UI=next 빌드에서만 새 셸 모듈로 갈아 끼운다. 모듈 자체를 바꾸므로 prod 빌드 그래프에는
// 새 셸의 폰트·CSS가 아예 들어오지 않는다(prod out/ 전 파일이 base와 같음 — PR P1 본문의 비교 참고).
// 주의: webpack 전용이다. `next build --turbopack`으로 바꾸면 이 치환이 조용히 빠져 프리뷰가 classic으로 뜬다
// (그때는 turbopack.resolveAlias로 같은 치환을 추가). 프리뷰 빌드 확인: out/index.html의 <html>에 class가 있어야 한다.
const UI_NEXT = process.env.NEXT_PUBLIC_UI === 'next'

// #108(P12 72시간 판정 '유지'): 옛 화면(classic)의 홈·갤러리·결과 카드 컴포넌트를 지웠다. `SANDLAB_UI=classic`으로 빌드하면
// 홈·/gallery가 빈 화면인 prod가 나가므로 빌드를 멈춘다(deploy가 실패해 라이브는 그대로). 되돌리기 = revert PR(DECISIONS 'P12 컷오버').
if (process.env.NEXT_PUBLIC_UI === 'classic') {
  throw new Error('NEXT_PUBLIC_UI=classic(SANDLAB_UI=classic) 빌드는 #108에서 없어졌다 — 저장소 변수 SANDLAB_UI를 지우고(gh variable delete SANDLAB_UI), 되돌리기는 revert PR로(DECISIONS \'P12 컷오버\')')
}

/**
 * P11(LCP): 새 셸을 한 파일(next.ts)로 치환하면 그 파일이 import하는 모든 화면(홈 엔진·갤러리·HUD…)과 CSS 9개가
 * **모든 페이지**에 실렸다(글 페이지에 엔진 청크·CSS 56KB). 그래서 `@ui-shell`을 import하는 파일(issuer)마다
 * 그 페이지에 필요한 영역 모듈(src/ui-next/shell/area-*.ts)로 치환한다. 루트 layout = 토큰·셸 크롬 CSS·서체만.
 * 새 사용처가 생기면 여기 한 줄을 더한다 — 표에 없는 사용처는 빌드를 멈춘다(조용히 무거워지지 않게).
 * src/ui-next/shell/shell.test.tsx가 `from '@ui-shell'` 사용처 전부가 표에 있는지, 영역이 그 사용처가 쓰는 이름을 내보내는지 본다.
 */
export const SHELL_AREAS: Record<string, string> = {
  'src/app/layout.tsx': 'root',
  'src/app/page.tsx': 'home',
  'src/app/gallery/page.tsx': 'gallery',
  'src/app/play/page.tsx': 'play',
  'src/app/play/[id]/page.tsx': 'play',
  'src/components/spill/SpillPlayer.tsx': 'spill',
  'src/components/spill/DailySpill.tsx': 'daily',
  'src/components/ContentShell.tsx': 'content',
  'src/app/learn/[slug]/page.tsx': 'content',
  'src/app/materials/page.tsx': 'content',
  'src/app/materials/[slug]/page.tsx': 'content',
  'src/app/play/[id]/guide/page.tsx': 'content',
}

/**
 * P12(LCP): prod 파일이 import하는 prod 모듈 중 **프리뷰 화면에서는 첫 그림에 필요 없는 것**을 프리뷰 빌드에서만 바꿔 끼운다.
 * prod 파일(page.tsx·DailySpill.tsx)을 고치면 prod 청크·HTML이 바뀌므로, 사용처(issuer) + import 문자열(request)이 둘 다 맞을 때만
 * resolve 전에 request를 바꾼다(prod 빌드는 이 플러그인 자체가 없다). `to`는 사용처 폴더 기준으로 풀리므로 `@/` 경로로 쓴다.
 * - (지움, #108) 홈의 옛 SandCanvas 줄 — 옛 홈 파일 자체를 지워 바꿔 끼울 import가 없다.
 * - 데일리: 플레이 화면(SpillPlayer·결과 카드 24KB gzip)은 "Solve today"를 누른 뒤에만 쓴다 → 지연 로드 래퍼(시작 화면이 load 뒤 미리 받는다).
 * src/ui-next/shell/shell.test.tsx가 표의 사용처에 그 import 문자열이 있는지, 바꿀 모듈이 있는지 본다(낡은 줄이 조용히 무효가 되지 않게).
 */
export const PREVIEW_SWAPS: { issuer: string; request: string; to: string }[] = [
  { issuer: 'src/components/spill/DailySpill.tsx', request: './SpillPlayer', to: '@/ui-next/daily/LazySpillPlayer' },
]

const nextConfig: NextConfig = {
  output: 'export',
  webpack(config, { webpack, dir }) {
    if (UI_NEXT) {
      // 프리뷰는 webpack 영속 캐시(.next/cache)를 읽지도 쓰지도 않는다. 같이 쓰면 캐시 키에 이 치환이 안 잡혀서
      // 프리뷰의 치환 결과가 다음 prod 빌드에 재사용돼 새 셸이 prod에 섞인다(P1에서 실제로 재현됨). 대가: 프리뷰 빌드가 느림.
      config.cache = false
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /[\\/]src[\\/]ui-next[\\/]shell[\\/]classic\.ts$/,
          (data: { contextInfo?: { issuer?: string }; createData: Record<string, unknown> & { resourceResolveData?: { path?: string } } }) => {
            // webpack은 issuer를 실제 경로(realpath)로 준다 — dir이 심볼릭 링크(/tmp → /private/tmp 등)여도 맞게 두 기준 모두 본다
            const raw = data.contextInfo?.issuer ?? ''
            const rel = (base: string) => relative(base, raw).split('\\').join('/')
            const issuer = SHELL_AREAS[rel(dir)] ? rel(dir) : rel(realpathSync(dir))
            const area = SHELL_AREAS[issuer]
            if (!area) throw new Error(`@ui-shell 사용처 '${issuer}'가 next.config.ts SHELL_AREAS에 없다 — 영역(src/ui-next/shell/area-*.ts)을 정해 한 줄 더할 것`)
            // resource만 바꾸면 모듈 식별자(request)가 classic.ts로 남아 영역들이 한 모듈로 합쳐진다 — 식별에 쓰는 필드를 함께 바꾼다
            const swap = (s: string) => s.replace(/([\\/]shell[\\/])classic\.ts/g, `$1area-${area}.ts`)
            const c = data.createData
            for (const k of ['resource', 'request', 'userRequest', 'rawRequest']) if (typeof c[k] === 'string') c[k] = swap(c[k] as string)
            if (c.resourceResolveData?.path) c.resourceResolveData.path = swap(c.resourceResolveData.path)
          },
        ),
      )
      // 사용처가 컴파일됐는데 바꿔 끼우기가 한 번도 안 걸리면(경로·따옴표·import 문자열이 바뀌어 빗나감) 빌드를 멈춘다 —
      // 조용히 원래 모듈이 실려 LCP만 다시 나빠지는 일을 막는다(리뷰 반영, SHELL_AREAS의 '표에 없으면 멈춤'과 같은 정신).
      type Data = { request: string; contextInfo?: { issuer?: string } }
      type Compiler = {
        hooks: {
          normalModuleFactory: { tap(n: string, f: (nmf: { hooks: { beforeResolve: { tap(n: string, f: (d: Data) => void): void } } }) => void): void }
          afterCompile: { tap(n: string, f: (c: { errors: Error[] }) => void): void }
        }
      }
      config.plugins.push({
        apply(compiler: Compiler) {
          const seen = new Set<string>()
          const hits = new Set<string>()
          const relIssuer = (raw: string) => {
            const rel = (base: string) => relative(base, raw).split('\\').join('/')
            return PREVIEW_SWAPS.some((s) => s.issuer === rel(dir)) ? rel(dir) : rel(realpathSync(dir))
          }
          compiler.hooks.normalModuleFactory.tap('PreviewSwaps', (nmf) => {
            nmf.hooks.beforeResolve.tap('PreviewSwaps', (data) => {
              const raw = data.contextInfo?.issuer
              if (!raw) return
              const issuer = relIssuer(raw)
              if (!PREVIEW_SWAPS.some((s) => s.issuer === issuer)) return
              seen.add(issuer)
              const hit = PREVIEW_SWAPS.find((s) => s.issuer === issuer && s.request === data.request)
              if (!hit) return
              hits.add(hit.issuer + ' ' + hit.request)
              data.request = hit.to
            })
          })
          compiler.hooks.afterCompile.tap('PreviewSwaps', (compilation) => {
            for (const s of PREVIEW_SWAPS)
              if (seen.has(s.issuer) && !hits.has(s.issuer + ' ' + s.request))
                compilation.errors.push(new Error(`PREVIEW_SWAPS: '${s.issuer}'가 컴파일됐는데 '${s.request}' import를 못 찾았다 — next.config.ts 표를 고칠 것`))
          })
        },
      })
    }
    return config
  },
}

export default nextConfig
