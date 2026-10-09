/**
 * Google AdSense 로더. 글 콘텐츠가 있는 페이지(ContentShell)에서만 렌더한다.
 *
 * 루트 레이아웃에 두면 캔버스 화면·갤러리 로딩 화면에도 실려 AdSense가 "게시자 콘텐츠가 없는
 * 화면에 광고"로 반려한다(2026-09-21 실제 반려). 허용 페이지 목록은 scripts/verify-ads.mjs가 강제한다.
 * 자동광고는 대시보드에서 꺼둔 상태 — 이 로더는 심사·게재 자격용이다.
 */
export default function AdLoader() {
  return (
    <script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9363381710674627"
      crossOrigin="anonymous"
    />
  )
}
