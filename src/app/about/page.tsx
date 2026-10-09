import Link from 'next/link'
import ContentShell from '@/components/ContentShell'
import { CONTACT_EMAIL } from '@/lib/site'

export const metadata = {
  title: 'About Sandlab',
  description: 'Who makes Sandlab, how the falling-sand simulation works, how the articles are written, and how to get in touch.',
  alternates: { canonical: '/about' },
}

const h2 = { fontSize: 20, marginTop: 28 } as const
const a = { color: '#eef1f6' } as const

export default function Page() {
  return (
    <ContentShell>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>About Sandlab</h1>
      <p>
        Sandlab is a falling-sand sandbox that runs in your browser. You paint with materials like sand,
        water, lava and acid, and a physics simulation decides what they do: sand piles into dunes, water
        finds its level, lava sets wood on fire and acid eats through metal. There is nothing to install and
        no account to make. Any scene can be shared as a link, published to the{' '}
        <a href="/gallery" style={a}>gallery</a>, or recorded as a ten-second clip.
      </p>

      <h2 style={h2}>Who makes it</h2>
      <p>
        Sandlab is built and maintained by one developer who goes by Piousangel. That covers everything on
        the site: the WebGPU simulation, the gallery backend on Cloudflare, the design and the writing. It
        launched in July 2026 and is still changing, so if something looks broken it probably is, and an
        email helps. You can find Piousangel on{' '}
        <a href="https://github.com/Piousangel" style={a} rel="noopener">GitHub</a> and support the project on{' '}
        <a href="https://ko-fi.com/piousangel" style={a} rel="noopener">Ko-fi</a>.
      </p>

      <h2 style={h2}>How the simulation works</h2>
      <p>
        The canvas is a grid of 1,200 by 600 cells, 720,000 in total, and the whole grid is updated on your
        graphics card through WebGPU once per screen refresh. Falling sand is hard to run in parallel because
        two grains can try to move into the same empty cell at the same moment. Sandlab avoids that with a
        Margolus neighbourhood: the grid is split into two-by-two blocks, each block is handled by exactly one
        thread, and the block grid shifts by one cell every tick so material can cross block borders. Because
        every move is a swap inside one block, moving material never duplicates or loses a grain; only
        reactions, such as water boiling into steam, change how much of something there is. The full
        explanation, with the tests that check it, is in{' '}
        <Link href="/learn/margolus-falling-sand" style={a}>How Sandlab moves 720,000 grains without losing one</Link>.
      </p>
      <p>
        Materials are defined as data rather than code. Each one has a colour, a weight, a way of moving, an
        optional lifetime and a short list of reactions. The <Link href="/materials" style={a}>materials guide</Link>{' '}
        lists every one of them and what happens when two touch, and{' '}
        <Link href="/learn/materials-as-data" style={a}>Materials as data</Link> explains how that table drives
        the simulation.
      </p>

      <h2 style={h2}>How the articles are written</h2>
      <p>
        The articles under <Link href="/learn" style={a}>Learn</Link> and the materials guide are drafted with
        AI assistance and then checked line by line against Sandlab&apos;s source code and the cited sources.
        Numbers about the simulation, such as weights, reaction odds and test results, come from the code
        itself, and each article lists what it relied on. When the code changes, the pages that describe it
        are updated; the reaction tables in the guide are generated from the same data the simulation uses,
        so they cannot drift from what you see on the canvas.
      </p>

      <h2 style={h2}>The gallery</h2>
      <p>
        The gallery collects scenes people have published. You can vote for the ones you like and remix any
        scene into your own. The Hot tab only considers the last seven days, so new work is not buried under
        old favourites. There are no comments on purpose: the gallery is for showing work, not arguing about
        it.
      </p>

      <h2 style={h2}>Requirements</h2>
      <p>
        Sandlab needs a browser with WebGPU, such as a recent version of Chrome or Edge. If your browser does
        not support it, Sandlab shows a gallery of scenes instead of the live canvas, and every article and
        guide page works without WebGPU.
      </p>

      <h2 style={h2} id="contact">Contact</h2>
      <p>
        Questions, bug reports and takedown requests: <a href={`mailto:${CONTACT_EMAIL}`} style={a}>{CONTACT_EMAIL}</a>.
      </p>
    </ContentShell>
  )
}
