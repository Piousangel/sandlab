import ContentShell from '@/components/ContentShell'
import { CONTACT_EMAIL } from '@/lib/site'

export const metadata = {
  title: 'Contact — Sandlab',
  description: 'How to reach the person who makes Sandlab: bug reports, questions, and requests to remove a published scene.',
  alternates: { canonical: '/contact' },
}

const h2 = { fontSize: 20, marginTop: 28 } as const
const a = { color: '#eef1f6' } as const

// 정책 페이지 — 광고 없음(/privacy와 같은 이유: 정책 페이지에 광고 = 인벤토리 부풀리기, 2026-10-09 감사).
export default function Page() {
  return (
    <ContentShell ads={false}>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Contact</h1>
      <p>
        Sandlab is made by one developer, Piousangel. The quickest way to reach them is email:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} style={a}>{CONTACT_EMAIL}</a>.
      </p>
      <h2 style={h2}>Bug reports</h2>
      <p>
        If something looks broken, say which page you were on, what you did, and which browser and device
        you used. The sandbox needs WebGPU, so the browser version matters; the Spill challenges and every
        article work in any modern browser.
      </p>
      <h2 style={h2}>Removing a published scene</h2>
      <p>
        Scenes in the <a href="/gallery" style={a}>gallery</a> are public. To have one removed, whether you
        made it or think it breaks the <a href="/terms" style={a}>terms</a>, email the scene&apos;s link and
        a short reason.
      </p>
      <h2 style={h2}>Elsewhere</h2>
      <p>
        Source code activity and other projects are on{' '}
        <a href="https://github.com/Piousangel" style={a} rel="noopener">GitHub</a>. You can support the project
        on <a href="https://ko-fi.com/piousangel" style={a} rel="noopener">Ko-fi</a>. For what the site stores
        about you, see the <a href="/privacy" style={a}>privacy page</a>.
      </p>
    </ContentShell>
  )
}
