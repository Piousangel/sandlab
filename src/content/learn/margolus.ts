import type { Article } from '@/lib/learn/types'

// 수치는 scripts/verify-margolus.mjs 실행 결과(2026-10-09, 9/9)와 일치해야 한다. 바뀌면 같이 고친다.
export const margolus: Article = {
  slug: 'margolus-falling-sand',
  title: 'How Sandlab moves 720,000 grains without losing one',
  description:
    'Why falling sand is hard to run on a GPU, how the Margolus 2×2 block rule avoids races, and the tests that check no grain is ever created or lost.',
  published: '2026-10-09',
  updated: '2026-10-09',
  sections: [
    {
      heading: 'The one job',
      paragraphs: [
        'A falling-sand game has one job before anything else: when you pour sand, the same amount should land at the bottom. That sounds trivial. On a graphics card it is not, and how Sandlab gets it right explains most of how the simulation works.',
        'Sandlab’s canvas is a grid of 1,200 × 600 cells, 720,000 in all. Each cell is a single 32-bit number. The low 16 bits say which material is there: sand, water, lava, empty and so on. The high 16 bits count down the remaining life of short-lived materials such as fire, steam and smoke. Everything you see on screen is drawn from that one array.',
      ],
    },
    {
      heading: 'Why the obvious approach breaks on a GPU',
      paragraphs: [
        'The textbook way to write falling sand is a loop over cells: if the cell below is empty, move down. On a CPU you visit cells one at a time, so there is always a defined order. Sandspiel, one of the best-known browser sandboxes, runs its particle simulation this way, in Rust compiled to WebAssembly, and its author describes a per-cell clock used to stop a particle being updated twice in one tick.',
        'A GPU has no such order. Thousands of threads run at once. Give each thread one cell, and two grains sitting above the same hole can both decide to fall into it in the same instant. Either both writes land, and you have created sand from nothing, or one overwrites the other, and a grain disappears. Locks or atomic operations can prevent that, but they make threads wait on their neighbours, which throws away the reason for using the GPU.',
      ],
    },
    {
      heading: 'Two-by-two blocks',
      paragraphs: [
        'Sandlab sidesteps the problem with a Margolus neighbourhood, a technique from cellular-automaton research described by Toffoli and Margolus. The grid is cut into blocks of 2 × 2 cells, and each GPU thread owns exactly one block. A thread reads its four cells, decides what happens among those four, and writes the same four cells back. No two threads ever touch the same cell in the same step, so there is nothing to race over. The shader uses no locks and no atomics.',
        'One problem remains. If the blocks never moved, a grain could never leave its block. So every tick the block grid shifts: on even ticks blocks start at (0, 0), on odd ticks at (1, 1). A grain that sits on a block’s bottom edge one tick is in the middle of a block the next, and it can keep falling.',
        'That shift has a practical side effect. When the origin moves to (1, 1), the first block starts at −1, half outside the grid, so the engine launches one extra column and row of blocks to reach the last cells. Without them the right and bottom edges would keep data from two frames earlier. Anything a block reads from outside the grid comes back as a wall, so the border behaves like a solid frame. The simulation also reads from one copy of the grid and writes into a second, then swaps them each tick, so nothing in a step can see a half-updated result.',
      ],
    },
    {
      heading: 'What happens inside one block',
      paragraphs: [
        'Each block runs the same short sequence every tick. First, ageing: cells with a lifetime lose one tick, and when it runs out the cell becomes empty. This is how fire burns out. Second, reactions: each pair of cells that touch vertically or horizontally inside the block is checked against the material table. Every material lists up to four reactions, each with an odds-per-check. Water touching lava, for example, turns into steam while the lava becomes stone.',
        'Third, falling. A cell swaps with the one below it if it can move, the one below is not fixed in place, and it is heavier. Weights come from each material’s density, 0 to 9: oil 2, water 3, sand 5, stone 8. Fourth, sliding: a grain that cannot fall straight down may slide to the lower diagonal cell, and when both top cells could slide, a per-block coin flip decides which goes first so piles do not favour one side. Fifth, spreading: a liquid that cannot sink may swap with a lighter, non-fixed neighbour beside it with a 50% chance each tick. That is what lets water find its level instead of standing in columns.',
        'Every move in those last three steps is a swap of two cells already in the block. Nothing is copied and nothing is deleted. That is the whole argument for conservation: if each step only swaps cells, the count of every material cannot change. Only the first two steps, ageing and reactions, change amounts, and they do it on purpose.',
      ],
    },
    {
      heading: 'A bug this article found',
      paragraphs: [
        'While checking the falling rule for this article, we found that gases were falling. The rule compared densities directly, and empty space has density 0 while fire, steam and smoke have density 1. So a puff of steam was “heavier” than the air around it and sank, slowly, toward the floor. The comment above the rule said gases would float because they are light; the code did the opposite. We confirmed it in a real browser by painting a band of steam and watching it drift down.',
        'The fix gives the falling rule its own weight scale. Empty space now counts as lighter than every liquid but heavier than every gas, so gases swap places with the empty cells above them and rise, while oil, the lightest liquid, still falls through empty space. Because it is still a swap, conservation is untouched. Here is the rule as it now ships:',
      ],
      code: `fn weightOf(mat : u32) -> u32 {
  if (mat == EMPTY) { return 3u; }
  return densityOf(mat) * 2u;
}

fn shouldSink(top : u32, bottom : u32) -> bool {
  if (top == WALL_SENTINEL || bottom == WALL_SENTINEL) { return false; }
  let tm = matOf(top);
  let bm = matOf(bottom);
  if (!isMobile(tm)) { return false; }
  if (isStatic(bm))  { return false; }
  return weightOf(tm) > weightOf(bm);
}`,
    },
    {
      heading: 'Same input, same result',
      paragraphs: [
        'The coin flips come from a hash of the block’s position and the tick number, not from a random-number generator whose state drifts over time. The same starting grid with the same brush strokes at the same ticks gives exactly the same result. That property makes a run reproducible: replaying the same strokes on the same tick numbers recreates a scene exactly, which is useful for checking a reported bug against the same starting point.',
      ],
    },
    {
      heading: 'Checking it, not just claiming it',
      paragraphs: [
        'A headless browser cannot run WebGPU, so the shader cannot be tested in an automated run. The property being claimed, though, comes from the rules, not the hardware. Sandlab keeps a line-for-line JavaScript copy of the movement rules (scripts/verify-margolus.mjs) and runs it on a 64 × 48 grid. On 9 October 2026 it reported nine checks, all passing.',
        'Mass conservation: a random mix of sand, water, oil, smoke and stone runs for 400 ticks, and every material count at the end matches the start exactly. Fixed materials stay fixed: 40 scattered stone cells are all in place after 200 ticks. Layering by weight: the grid starts upside down, sand on top, water in the middle, oil at the bottom, and after 3,000 ticks the average row (higher means lower on screen) is oil 9.0, water 25.5, sand 40.0. Spreading: a column of sand dropped in the centre settles into 96 cells left of centre and 83 right, a 7.3% difference, under the test’s 15% limit. Sand reaches the floor: one row of 64 grains ends as 64 grains filling all 64 bottom cells. And the two checks added with the gas fix: a block of smoke rises from an average row of 22.5 to 2.3 in 100 ticks, and a row of oil still reaches the floor.',
      ],
    },
    {
      heading: 'What this does not prove',
      paragraphs: [
        'The checks cover the JavaScript copy, not the GPU code itself. The copy has to be kept in sync by hand, which is exactly how the gas bug could sit unnoticed: the copy faithfully reproduced it. How the result looks in a real browser still has to be checked by eye. The copy also leaves out reactions and lifetimes, which change material counts on purpose; fire burning out or salt dissolving in water is not a leak.',
        'And the block grid alternates between only two positions. Some GPU sand projects use a four-step offset pattern instead of two positions to remove any slight drift in one direction. Sandlab’s spread test shows a small left–right difference, not none. Finally, Sandlab advances one tick per screen refresh, so the sand moves at the pace of your display rather than at a fixed number of ticks per second.',
      ],
    },
  ],
  sources: [
    { label: 'src/lib/sand/shader.ts — cell layout, block rule, weightOf/shouldSink, reactions', url: '' },
    { label: 'src/lib/sand/engine.ts — dispatch size, double buffer, one tick per frame', url: '' },
    { label: 'src/lib/sand/materials.ts — densities and reaction table', url: '' },
    { label: 'scripts/verify-margolus.mjs — CPU reference port, run 2026-10-09: 9/9', url: '' },
    { label: 'Max Bittker, “Making Sandspiel” (2019)', url: 'https://maxbittker.com/making-sandspiel' },
    { label: 'T. Toffoli and N. Margolus, Cellular Automata Machines (MIT Press, 1987)', url: 'https://mitpress.mit.edu/9780262526319/cellular-automata-machines/' },
    { label: 'GPU-Falling-Sand-CA (four-step Margolus offset)', url: 'https://github.com/GelamiSalami/GPU-Falling-Sand-CA' },
  ],
}
