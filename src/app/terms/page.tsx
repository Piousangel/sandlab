import ContentShell from '@/components/ContentShell'
import { CONTACT_EMAIL } from '@/lib/site'

export const metadata = {
  title: 'Terms of use — Sandlab',
  description: 'The rules for using Sandlab and publishing scenes to its gallery.',
  alternates: { canonical: '/terms' },
}

const h2 = { fontSize: 20, marginTop: 28 } as const
const a = { color: '#eef1f6' } as const

// 정책 페이지 — 광고 없음(/privacy와 같은 이유).
export default function Page() {
  return (
    <ContentShell ads={false}>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Terms of use</h1>
      <p style={{ opacity: 0.7, fontSize: 14 }}>Last updated: 16 November 2026</p>
      <p>
        Sandlab is a free falling-sand sandbox, a set of puzzle challenges and a collection of articles,
        run by one developer, Piousangel. By using the site you agree to the points below. They are short on
        purpose.
      </p>
      <h2 style={h2}>Using the site</h2>
      <p>
        There are no accounts and nothing to buy. You may play, share links to scenes and levels, and record
        clips of what you make. Please do not try to break the site, flood the gallery or votes, or get around
        the rate limits.
      </p>
      <h2 style={h2}>Scenes you publish</h2>
      <p>
        When you publish a scene to the <a href="/gallery" style={a}>gallery</a>, it becomes public and other
        people can view it, vote for it and remix it into their own scenes. You keep whatever rights you have
        in your scene and let Sandlab store and show it, and let others remix it on Sandlab. Do not publish
        titles or drawings that are illegal, hateful, sexual, harassing, or that use someone else&apos;s work
        without permission. Scenes that break these rules are removed, and anyone can ask for removal by
        emailing <a href={`mailto:${CONTACT_EMAIL}`} style={a}>{CONTACT_EMAIL}</a> with the scene&apos;s link.
        There are no comments on the site.
      </p>
      <h2 style={h2}>Articles and guides</h2>
      <p>
        The articles, materials guide and level guides are written for Sandlab. You are welcome to link to
        them and quote short passages with a link back.
      </p>
      <h2 style={h2}>Advertising</h2>
      <p>
        Some text pages show ads from Google AdSense. Puzzles, the sandbox canvas and the gallery never show
        ads. How advertising cookies work is explained on the <a href="/privacy" style={a}>privacy page</a>.
      </p>
      <h2 style={h2}>No warranty</h2>
      <p>
        Sandlab is provided as it is, without guarantees. Features can change or be removed, and published
        scenes may be lost if something goes wrong. Questions about these terms go to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} style={a}>{CONTACT_EMAIL}</a>; see also the{' '}
        <a href="/contact" style={a}>contact page</a>.
      </p>
    </ContentShell>
  )
}
