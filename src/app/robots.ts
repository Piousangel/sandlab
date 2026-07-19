import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

// 정적 export에 필요 — 빌드 때 robots.txt 파일로 굽는다.
export const dynamic = 'force-static'

// 빌드 때 robots.txt로 생성된다. 전체 허용 + sitemap 선언(현재 없어서 크롤러가 sitemap을 못 찾음).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
