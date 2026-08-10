/**
 * 익명 지속 크리에이터 정체성 — 로그인/계정 없음.
 *
 * 이름을 한 번도 안 정한 사용자는 creator_id 자체가 없다(완전 익명 업로드) — 리더보드/프로필
 * 집계는 서버에서 creator_id IS NOT NULL만 보므로, 스킵한 사용자는 애초에 이 시스템에 안 걸린다.
 * "물어봤지만 스킵함"과 "아직 안 물어봄"을 구분해야 매 Publish마다 다시 묻지 않는다 —
 * 그래서 이름 키는 세 상태(없음/빈 문자열/실제 이름)를 갖는다.
 */

const NAME_KEY = 'sandlab.creatorName'
const ID_KEY = 'sandlab.creatorId'

function newCreatorId(): string {
  const b = crypto.getRandomValues(new Uint8Array(8))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** undefined = 한 번도 안 물어봄. '' = 물어봤고 스킵함(다시 안 물어봄). 그 외 = 실제 이름. */
export function getCreatorName(): string | undefined {
  try {
    const v = localStorage.getItem(NAME_KEY)
    return v === null ? undefined : v
  } catch {
    return undefined
  }
}

/** 이름을 저장한다. 처음으로 비어있지 않은 이름을 저장할 때만 id를 새로 만든다. */
export function setCreatorName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name)
    if (name && !localStorage.getItem(ID_KEY)) {
      localStorage.setItem(ID_KEY, newCreatorId())
    }
  } catch {
    /* 프라이빗 모드 등 — 이번 세션엔 이름이 안 남지만 업로드 자체는 계속 진행 */
  }
}

/** 이름을 한 번도 안 지정했으면 undefined(=완전 익명, creator_id를 서버에 보내지 않는다). */
export function getCreatorId(): string | undefined {
  try {
    return localStorage.getItem(ID_KEY) || undefined
  } catch {
    return undefined
  }
}
