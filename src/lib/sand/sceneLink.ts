/**
 * 홈 공유 링크의 순수 규칙(리디자인 P6 — P2 인계 '착수 조건'). 예전에는 SandCanvas 안에 인라인이었다.
 * 옛 홈(SandCanvas)과 새 홈(ui-next/home)이 같은 함수를 쓴다 — 링크 형식은 11-19 골든셋 그대로(shareLinks.golden.test.ts).
 *
 * - `#s=<id>` = 갤러리 장면. `[#&]s=` 뒤 6~16자(A-Z a-z 0-9 _ -), 끝 앵커 없음(17자 이상이면 앞 16자).
 * - `#g=<blob>` = URL 내장 장면 — 파싱은 urlState.readShareUrl 그대로(여기서 다루지 않는다).
 * - s가 잡히면 g는 보지 않는다(s 우선).
 */
export const SCENE_HASH_RE = /[#&]s=([A-Za-z0-9_-]{6,16})/

/** 해시에서 갤러리 장면 id. 없으면 null. */
export function sceneIdFromHash(hash: string): string | null {
  return hash.match(SCENE_HASH_RE)?.[1] ?? null
}

/** 해시가 URL 내장 장면(#g=)을 가리키는가 — 화면 문구용(실제 복원은 readShareUrl). s가 있으면 false(s 우선). */
export function hasEmbeddedScene(hash: string): boolean {
  return !sceneIdFromHash(hash) && /[#&]g=/.test(hash)
}

/**
 * 리믹스 계보: Publish 때 서버로 보낼 parent = 지금 캔버스의 원본 장면 id(#s=로 열었거나 방금 발행한 내 장면).
 * 없으면 null(원작). 서버가 형식·실재를 다시 검사한다(worker/index.ts).
 */
export function publishParent(loadedSceneId: string | null): string | null {
  return loadedSceneId
}

/**
 * 발행 직후 링크 두 개: 현재 탭은 해시형(`/#s=id` — 리로드해도 이 장면), 공유는 OG가 붙는 경로형(`/s/id`).
 * 다음 발행의 parent는 방금 올린 이 id다(`nextLoadedId`).
 */
export function publishedLinks(origin: string, id: string): { tabUrl: string; shareUrl: string; nextLoadedId: string } {
  return { tabUrl: `${origin}/#s=${id}`, shareUrl: `${origin}/s/${id}`, nextLoadedId: id }
}
