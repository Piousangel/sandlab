/**
 * 홈 소개 절(#112) — 캔버스 아래 크롤 가능한 본문. 정적 HTML에 들어가는 서버 컴포넌트(상호작용·훅 없음).
 * 심사자·검색 크롤러가 홈에서 '무엇인지·어떻게 하는지·어디로 가는지'를 글로 읽게 한다. 광고 로더는 두지 않는다(캔버스 화면).
 */
import Link from 'next/link'

export function HomeAbout() {
  return (
    <section className="sl-home-sec sl-home-about" aria-labelledby="sl-about-h">
      <h2 className="sl-home-label" id="sl-about-h">
        About Sandlab
      </h2>
      <p>
        Sandlab is a falling-sand simulator that runs in your browser from a link. Every grain of sand, drop of water
        and spark of fire is a cell on a 1200 by 600 grid, and the whole grid is updated on your graphics card with
        WebGPU. There is nothing to install and no account to make: pour something, watch it fall, and share the
        scene as a link.
      </p>
      <h3>How to play</h3>
      <p>
        Pick a material from the rack, then press and drag on the glass to pour it. The brush size and the eraser sit
        on the thumb dock under the canvas. Materials do not just stack: water puts out fire and turns to steam,
        lava melts ice, acid eats stone, and seeds grow into plants when they get wet. Try pouring one material
        on top of another and see what happens. Once you have made something you like, press Share to get a link.
        Anyone who opens it sees your exact scene and can remix it.
      </p>
      <h3>Daily puzzle and levels</h3>
      <p>
        Spill is the puzzle side of Sandlab. Each level gives you a glass, a stream of falling material and a goal,
        and you reach it with a few moves, such as digging a channel or tapping a gate at the right moment. Every level is checked by a solver
        before it ships, so it can always be solved. A new <Link href="/daily">daily puzzle</Link> appears at
        midnight UTC and everyone gets the same one, which makes it easy to compare notes. The{' '}
        <Link href="/play">level list</Link> keeps the whole set open, and each level has a short walkthrough if
        you get stuck. Spill runs on a normal 2D canvas, so it also works on phones and on browsers without WebGPU.
      </p>
      <h3>Learn how it works</h3>
      <p>
        The <Link href="/learn">Learn</Link> section explains the ideas behind the simulator: how a Margolus
        neighborhood lets a GPU move sand without two cells claiming the same spot, how materials are stored as plain
        data, and where falling-sand games came from. The <Link href="/materials">materials guide</Link> describes
        every material, its density and what it reacts with. To see what other people made, browse the{' '}
        <Link href="/gallery">gallery</Link>.
      </p>
      <h3>Good to know</h3>
      <p>
        Sandlab needs a recent browser with WebGPU for the sandbox. If yours does not have it, the daily puzzle still
        works. Scenes are stored as links, nothing you pour is uploaded unless you publish it to the gallery, and
        there are no comments. Read more on the <Link href="/about">about page</Link>.
      </p>
    </section>
  )
}
