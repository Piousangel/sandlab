import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'
import { UI_NEXT } from '@/ui-next/flag'

// 정적 export에 필요 — 빌드 때 robots.txt 파일로 굽는다.
export const dynamic = 'force-static'

// 빌드 때 robots.txt로 생성된다. 전체 허용 + sitemap 선언(현재 없어서 크롤러가 sitemap을 못 찾음).
export default function robots(): MetadataRoute.Robots {
  // 프리뷰 Worker(NEXT_PUBLIC_UI=next)는 전부 막는다 — 같은 콘텐츠가 workers.dev에 중복 색인되지 않게.
  if (UI_NEXT) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
