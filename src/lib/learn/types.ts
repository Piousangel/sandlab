/** /learn 기사 데이터 형식. 본문은 src/content/learn/*.ts에 데이터로 두고 페이지 하나가 렌더한다. */
export interface ArticleSection {
  heading: string
  paragraphs: string[]
  /** 저장소 코드 인용(그대로 복사한 것만). 문단 뒤에 렌더된다. */
  code?: string
}

export interface Article {
  slug: string
  title: string
  /** meta description, 155자 이하 */
  description: string
  /** YYYY-MM-DD */
  published: string
  updated: string
  sections: ArticleSection[]
  /** 주장의 근거. 저장소 파일은 url이 빈 문자열일 수 있다(레포 비공개). */
  sources: { label: string; url: string }[]
}
