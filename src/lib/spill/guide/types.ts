/**
 * Spill 레벨 공략(/play/<id>/guide) 데이터 형식. 본문은 src/content/guides/*.ts에 데이터로 두고 페이지 하나가 렌더한다.
 * 수치(par·목표·동사)는 레벨 정의에서 렌더 시 유도한다 — 공략 본문에 숫자를 손으로 옮겨 적지 않는다(어긋나면 거짓말).
 */
export interface GuideSection {
  heading: string
  paragraphs: string[]
}

export interface LevelGuide {
  /** 레벨 id. LEVELS에 반드시 존재 */
  id: string
  /** <title>·h1 */
  title: string
  /** meta description, 155자 이하 */
  description: string
  /** YYYY-MM-DD */
  published: string
  updated: string
  /** 이 레벨이 가르치는 것, 한 문장 */
  lesson: string
  sections: GuideSection[]
  /** 2단계 힌트: 약한 것 → 강한 것. 힌트 2는 접근법까지 말해도 되지만(접혀 있고 '거의 정답'이라 안내) 좌표는 말하지 않는다 */
  hints: [string, string]
}
