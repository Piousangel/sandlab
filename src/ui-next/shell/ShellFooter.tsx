/**
 * 새 셸 푸터(P3, S10) — bone-2 면 하나, 링크 6개(Terms·Contact 포함), 저작권 줄.
 * 서버 컴포넌트(상호작용 없음). 면은 이 하나뿐 — 안에 또 회색 면을 쌓지 않는다(R3, pnpm lint:ui가 검사).
 */
import Link from 'next/link'
import { FOOTER_LINKS } from './nav'

const YEAR = 2026 // 정적 export라 빌드 시각이 아니라 고정값(빌드마다 HTML이 달라지지 않게). 해가 바뀌면 고친다.

export function ShellFooter() {
  return (
    <footer className="sl-shell sl-foot" data-sl-shell="footer">
      <div className="sl-foot-in">
        <nav aria-label="Site">
          <ul className="sl-foot-links">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="sl-foot-link">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="sl-foot-copy">
          &copy; {YEAR} Sandlab. Made by Piousangel. No install, no sign-up.
        </p>
      </div>
    </footer>
  )
}
