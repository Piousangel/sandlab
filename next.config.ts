import type { NextConfig } from 'next'

// 리디자인 셸 전환(S6, src/ui-next/flag.ts): `@ui-shell`(tsconfig paths → shell/classic.ts)을
// NEXT_PUBLIC_UI=next 빌드에서만 shell/next.ts로 갈아 끼운다. 모듈 자체를 바꾸므로 prod 빌드 그래프에는
// 새 셸의 폰트·CSS가 아예 들어오지 않는다(prod out/ 전 파일이 base와 같음 — PR P1 본문의 비교 참고).
// 주의: webpack 전용이다. `next build --turbopack`으로 바꾸면 이 치환이 조용히 빠져 프리뷰가 classic으로 뜬다
// (그때는 turbopack.resolveAlias로 같은 치환을 추가). 프리뷰 빌드 확인: out/index.html의 <html>에 class가 있어야 한다.
const UI_NEXT = process.env.NEXT_PUBLIC_UI === 'next'

const nextConfig: NextConfig = {
  output: 'export',
  webpack(config, { webpack }) {
    if (UI_NEXT) {
      // 프리뷰는 webpack 영속 캐시(.next/cache)를 읽지도 쓰지도 않는다. 같이 쓰면 캐시 키에 이 치환이 안 잡혀서
      // 프리뷰의 치환 결과가 다음 prod 빌드에 재사용돼 새 셸이 prod에 섞인다(P1에서 실제로 재현됨). 대가: 프리뷰 빌드가 느림.
      config.cache = false
      config.plugins.push(
        // 상대 경로는 classic.ts의 폴더 기준으로 풀린다(cwd·__dirname과 무관 — next.config는 컴파일돼 __dirname이 다르다)
        new webpack.NormalModuleReplacementPlugin(/[\\/]src[\\/]ui-next[\\/]shell[\\/]classic\.ts$/, './next.ts'),
      )
    }
    return config
  },
}

export default nextConfig
