import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'
import { materialStaticParams } from '@/lib/guide/reactions'
import { ARTICLES } from '@/lib/learn/articles'
import { LEVELS } from '@/lib/challenge/levels'

// 정적 export에 필요 — 빌드 때 sitemap.xml 파일로 굽는다.
export const dynamic = 'force-static'

// 정적 export 시 빌드 때 sitemap.xml로 생성된다. 씬 페이지(/s/:id)는 무한·동적이라 넣지 않는다
// (색인할 UGC가 쌓이면 그때 동적 사이트맵을 연다 — references/discovery 참조).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/gallery`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/play`, changeFrequency: 'weekly', priority: 0.9 },
    ...LEVELS.map((l) => ({ url: `${SITE}/play/${l.id}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${SITE}/learn`, changeFrequency: 'weekly', priority: 0.8 },
    ...ARTICLES.map((a) => ({
      url: `${SITE}/learn/${a.slug}`,
      lastModified: a.updated,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: `${SITE}/materials`, changeFrequency: 'monthly', priority: 0.7 },
    ...materialStaticParams().map(({ slug }) => ({
      url: `${SITE}/materials/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${SITE}/about`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
