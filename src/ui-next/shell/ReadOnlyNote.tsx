/**
 * 프리뷰 읽기 전용 안내(오너 11-20: 프리뷰 Worker는 prod와 같은 D1을 쓰되 쓰기를 막는다).
 *
 * - 워커 쪽: wrangler env.preview의 READ_ONLY=1 → `/api/*` GET·HEAD 외 전부 403(worker/preview.ts readOnlyBlock).
 * - 화면 쪽: `NEXT_PUBLIC_READ_ONLY=1`(package.json build:preview만 설정) → 새 셸이 안내를 그린다.
 *   UI 플래그(NEXT_PUBLIC_UI)와 따로 둔다 — 컷오버(P12)에서 prod가 NEXT_PUBLIC_UI=next로 빌드돼도 이 안내는 prod에 안 뜬다.
 * - 새 셸이 업로드·투표·데일리 기록 버튼을 그리게 되면(갤러리·결과 화면 P) `PREVIEW_READ_ONLY`로 disabled + `READ_ONLY_NOTE`를 쓴다.
 *   지금(P1~P4) 새 셸에는 그런 버튼이 없다 — 쓰기 버튼은 아직 classic 컴포넌트에 있고, 그쪽은 prod 화면 변화 0을 위해 건드리지 않는다
 *   (프리뷰에서 누르면 서버가 403으로 막고 기존 오류 처리대로 실패한다).
 */
export const READ_ONLY_NOTE = "Preview is read-only. Uploads, votes and daily records aren't saved."

export function previewReadOnly(value: string | undefined = process.env.NEXT_PUBLIC_READ_ONLY): boolean {
  return value === '1'
}

export const PREVIEW_READ_ONLY: boolean = previewReadOnly()

/** 헤더 바로 아래 한 줄. on이 false면 아무것도 그리지 않는다(prod·로컬 기본). */
export function ReadOnlyNote({ on = PREVIEW_READ_ONLY, className = 'sl-ro' }: { on?: boolean; className?: string }) {
  if (!on) return null
  return (
    <p className={className} role="note" data-sl-read-only="">
      {READ_ONLY_NOTE}
    </p>
  )
}
