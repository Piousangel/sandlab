/**
 * 프리뷰 빌드(S6) 후처리 — out/_headers에 noindex를 쓴다(Workers Static Assets의 _headers 규칙).
 *
 * 왜 빌드 때가 아니라 여기서: public/_headers로 두면 prod 빌드에도 실린다. 프리뷰 빌드에서만 만든다.
 * 안전장치: NEXT_PUBLIC_UI=next가 아니면 쓰지 않고 실패한다(prod out/에 실수로 쓰는 일 방지).
 * 역으로 prod 배포(`pnpm run deploy`)는 next build가 out/을 새로 만들기 때문에 이전 프리뷰의 _headers가 남지 않는다
 * (scripts/verify-ads.mjs가 out/_headers가 있으면 prod 배포를 막는다).
 *
 * 실행: pnpm run build:preview (= NEXT_PUBLIC_UI=next NEXT_PUBLIC_READ_ONLY=1 next build && node scripts/preview-headers.mjs)
 */
import { readFileSync, writeFileSync } from 'node:fs'

if (process.env.NEXT_PUBLIC_UI !== 'next') {
  console.error('preview-headers: NEXT_PUBLIC_UI=next 빌드에서만 실행한다(prod out/에 noindex를 쓰지 않기 위해).')
  process.exit(1)
}

const robots = readFileSync('out/robots.txt', 'utf8')
if (!/Disallow:\s*\/\s*$/m.test(robots)) {
  console.error('preview-headers: out/robots.txt가 전체 차단이 아니다 — 프리뷰 빌드가 맞는지 확인.\n' + robots)
  process.exit(1)
}

// 새 셸이 실제로 들어갔는지(next.config.ts의 모듈 치환이 빠지면 프리뷰가 조용히 classic으로 뜬다)
if (!/<html[^>]*\sclass="[^"]+"/.test(readFileSync('out/index.html', 'utf8'))) {
  console.error('preview-headers: out/index.html의 <html>에 셸 class가 없다 — @ui-shell 치환이 빠졌다(next.config.ts).')
  process.exit(1)
}

writeFileSync('out/_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n')
console.log('preview-headers: out/_headers 작성(noindex), robots.txt 전체 차단 확인')
