import ContentShell from '@/components/ContentShell'
import { CONTACT_EMAIL } from '@/lib/site'

export const metadata = {
  title: 'Privacy — Sandlab',
  description: 'What Sandlab stores, what it does not, and how advertising cookies work on this site.',
  alternates: { canonical: '/privacy' },
}

const h2 = { fontSize: 20, marginTop: 28 } as const

export default function Page() {
  return (
    <ContentShell ads={false}>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>Privacy</h1>
      <p style={{ opacity: 0.7, fontSize: 14 }}>Last updated: 9 October 2026</p>
      <p>
        Sandlab has no accounts and no sign-up. This page lists everything the site stores and why. If
        something here is unclear, email <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#eef1f6' }}>{CONTACT_EMAIL}</a>.
      </p>
      <h2 style={h2}>Scenes you publish</h2>
      <p>
        When you press Publish, the scene data, the title you typed, a thumbnail image, the time you
        published and, for a remix, which scene it was remixed from are stored on our server so the gallery
        can show them. If you chose a display name, the name and a random creator id are stored with the
        scene too. That id is public: it links all scenes published under your name and powers your creator
        profile and the Top Creators list. It is generated in your browser and is not connected to any
        account, email or device identifier. Published scenes are public. To have a scene removed, email us
        with its link.
      </p>
      <h2 style={h2}>Votes and rate limits</h2>
      <p>
        To stop one person from voting many times or flooding the gallery, we store a shortened hash of
        your IP address (the first 12 bytes of a SHA-256 digest) alongside votes and uploads, instead of the
        address itself. It is used only to enforce those limits.
      </p>
      <h2 style={h2}>Usage statistics</h2>
      <p>
        We count a few events, such as a shared link being opened, a scene being published, a vote being
        cast or the support link being clicked. Each count records the event type, the website that linked
        to us, your country as reported by our hosting provider, Cloudflare, and, where relevant, which
        scene it was about. There is no per-person identifier in these counts.
      </p>
      <h2 style={h2}>Stored in your browser</h2>
      <p>
        Your browser keeps a few things locally so the site remembers you without an account: your display
        name and a random creator id if you set a name, the list of scenes you published, and which scenes
        you have voted for. This never leaves your device except when you publish or vote. Clearing your
        browser data removes it.
      </p>
      <h2 style={h2}>Advertising</h2>
      <p>
        Some text pages on this site, such as the articles under Learn and the materials guide, may show
        ads served by Google AdSense.
        Google and its partners use cookies to serve ads based on your visits to this and other websites.
        You can turn off personalised advertising in{' '}
        <a href="https://adssettings.google.com" style={{ color: '#eef1f6' }}>Google Ads Settings</a>, and
        read how Google uses data at{' '}
        <a href="https://policies.google.com/technologies/partner-sites" style={{ color: '#eef1f6' }}>
          policies.google.com/technologies/partner-sites
        </a>
        . The sandbox canvas, the gallery and this page never show ads.
      </p>
      <h2 style={h2}>Hosting</h2>
      <p>
        Sandlab is hosted on Cloudflare. Like any web host, Cloudflare processes your IP address to deliver
        pages and protect the site from abuse, under its own privacy policy.
      </p>
    </ContentShell>
  )
}
