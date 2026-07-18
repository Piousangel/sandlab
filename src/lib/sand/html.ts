/**
 * HTML 이스케이프 — 보안 경계.
 *
 * worker가 /s/:id OG 셸에 사용자 입력(씬 제목)을 HTML 속성·텍스트로 심는다.
 * 이스케이프가 없으면 제목에 `"><script>...`를 넣어 OG 페이지에 스크립트를 주입할 수 있다.
 * 이 함수가 그 유일한 방어선이라 worker 밖으로 꺼내 테스트로 못 박는다.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
