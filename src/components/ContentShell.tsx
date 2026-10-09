import Link from 'next/link'
import AdLoader from './AdLoader'

/**
 * 글 콘텐츠 페이지 공용 셸(가이드·소개·개인정보·레벨 목록).
 * 광고 로더는 여기서만 렌더된다 — 캔버스/갤러리 화면엔 절대 넣지 않는다(scripts/verify-ads.mjs가 강제).
 * 루트 body가 overscroll-behavior:none + 캔버스용이라, 이 셸이 스크롤 가능한 문서 레이아웃을 따로 잡는다.
 */
const link = { color: '#eef1f6', textDecoration: 'none', opacity: 0.75, fontSize: 14 } as const

export default function ContentShell({ children, ads = true }: { children: React.ReactNode; ads?: boolean }) {
  return (
    <div style={{ minHeight: '100vh', overflowY: 'auto' }}>
      {ads && <AdLoader />}
      <header
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '20px 18px 0',
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* 콘텐츠 밖(캔버스·갤러리)으로 나가는 링크는 일반 <a> — next/link 클라이언트 이동이면
            여기서 로드된 광고 로더가 캔버스 화면까지 따라간다(2026-10-09 코드 리뷰). */}
        <a href="/" style={{ ...link, opacity: 1, fontWeight: 700, fontSize: 16 }}>
          Sandlab
        </a>
        <Link href="/learn" style={link}>Learn</Link>
        <Link href="/materials" style={link}>Materials</Link>
        <a href="/gallery" style={link}>Gallery</a>
        <Link href="/about" style={link}>About</Link>
      </header>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 18px 48px', lineHeight: 1.65, fontSize: 16 }}>
        {children}
      </main>
      <footer
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '20px 18px max(32px, env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          fontSize: 13,
        }}
      >
        <a href="/" style={link}>Open the sandbox</a>
        <Link href="/learn" style={link}>Learn</Link>
        <Link href="/materials" style={link}>Materials guide</Link>
        <Link href="/about" style={link}>About</Link>
        <Link href="/privacy" style={link}>Privacy</Link>
        <span style={{ ...link, marginLeft: 'auto', opacity: 0.45 }}>Made by Piousangel</span>
      </footer>
    </div>
  )
}
