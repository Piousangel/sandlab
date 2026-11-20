import type { NextConfig } from 'next'
import { realpathSync } from 'node:fs'
import { relative } from 'node:path'

// 리디자인 셸 전환(S6, src/ui-next/flag.ts): `@ui-shell`(tsconfig paths → shell/classic.ts)을
// NEXT_PUBLIC_UI=next 빌드에서만 새 셸 모듈로 갈아 끼운다. 모듈 자체를 바꾸므로 prod 빌드 그래프에는
// 새 셸의 폰트·CSS가 아예 들어오지 않는다(prod out/ 전 파일이 base와 같음 — PR P1 본문의 비교 참고).
// 주의: webpack 전용이다. `next build --turbopack`으로 바꾸면 이 치환이 조용히 빠져 프리뷰가 classic으로 뜬다
// (그때는 turbopack.resolveAlias로 같은 치환을 추가). 프리뷰 빌드 확인: out/index.html의 <html>에 class가 있어야 한다.
const UI_NEXT = process.env.NEXT_PUBLIC_UI === 'next'

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
    }
    return config
  },
}

export default nextConfig
