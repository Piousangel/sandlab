/** 구조화 데이터 <script type="application/ld+json">. 콘텐츠 페이지 전용(Article·BreadcrumbList). */
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export const AUTHOR = { '@type': 'Person', name: 'Piousangel', url: 'https://github.com/Piousangel' } as const

export function breadcrumbs(site: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${site}${it.path}` })),
  }
}
