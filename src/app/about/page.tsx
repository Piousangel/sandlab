import Link from 'next/link'
import ContentShell from '@/components/ContentShell'
import { CONTACT_EMAIL } from '@/lib/site'

export const metadata = {
  title: 'About Sandlab',
  description: 'What Sandlab is, how the falling-sand simulation works, and how to get in touch.',
  alternates: { canonical: '/about' },
}

export default function Page() {
  return (
    <ContentShell>
      <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px' }}>About Sandlab</h1>
      <p>
        Sandlab is a falling-sand sandbox that runs in your browser. You paint with materials like sand,
        water, lava and acid, and a physics simulation decides what they do: sand piles into dunes, water
        finds its level, lava sets oil on fire and acid eats through metal. There is nothing to install and
        no account to make. Any scene can be shared as a link, published to the gallery, or recorded as a
        ten-second clip.
      </p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>How the simulation works</h2>
      <p>
        The canvas is a grid of 1200 by 600 cells, about 720,000 in total, and the whole grid is updated
        on your graphics card through WebGPU around sixty times a second. Falling sand is hard to run in
        parallel because two grains can try to move into the same empty cell at the same moment. Sandlab
        avoids that with a Margolus neighbourhood: the grid is split into two-by-two blocks and each block
        is handled by exactly one thread, with the block grid shifting by one cell every tick so material
        can cross block borders. Nothing is ever duplicated or lost.
      </p>
      <p>
        Materials are defined as data rather than code. Each one has a colour, a weight, a way of moving,
        an optional lifetime and a short list of reactions. The{' '}
        <Link href="/materials" style={{ color: '#eef1f6' }}>materials guide</Link> lists every one of them
        and exactly what happens when two touch.
      </p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>The gallery</h2>
      <p>
        The <Link href="/gallery" style={{ color: '#eef1f6' }}>gallery</Link> collects scenes people have
        published. You can vote for the ones you like and remix any scene into your own. There are no
        comments on purpose: the gallery is for showing work, not arguing about it.
      </p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>Requirements</h2>
      <p>
        Sandlab needs a browser with WebGPU: recent Chrome or Edge on desktop and Android, and Safari 26 or
        later on Apple devices. If your browser does not support it, Sandlab shows a gallery of scenes
        instead of the live canvas.
      </p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>Contact</h2>
      <p>
        Questions, bug reports and takedown requests: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#eef1f6' }}>{CONTACT_EMAIL}</a>.
      </p>
    </ContentShell>
  )
}
