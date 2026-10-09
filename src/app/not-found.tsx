import ContentShell from '@/components/ContentShell'

export const metadata = { title: 'Page not found — Sandlab', robots: { index: false } }

// 404는 광고 금지(막다른 화면). 대신 갈 곳을 보여 준다.
export default function NotFound() {
  return (
    <ContentShell ads={false}>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>This page does not exist</h1>
      <p>
        The link may be old, or the scene it pointed to was removed. Here is where you can go instead:
      </p>
      <ul style={{ paddingLeft: 20 }}>
        <li><a href="/" style={{ color: '#eef1f6' }}>Open the sandbox</a> and start painting</li>
        <li><a href="/gallery" style={{ color: '#eef1f6' }}>Browse the gallery</a> of published scenes</li>
        <li><a href="/learn" style={{ color: '#eef1f6' }}>Read how Sandlab works</a></li>
        <li><a href="/materials" style={{ color: '#eef1f6' }}>Look up a material</a></li>
      </ul>
    </ContentShell>
  )
}
