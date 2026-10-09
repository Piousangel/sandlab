import type { Article } from '@/lib/learn/types'

export const materialsAsData: Article = {
  slug: 'materials-as-data',
  title: 'Materials as data: how Sandlab defines 18 elements without writing physics code for each',
  description:
    'Sandlab has 18 elements and no per-element physics code. One shader reads one table. Here is how a row becomes behaviour, and how tests keep it honest.',
  published: '2026-10-09',
  updated: '2026-10-09',
  sections: [
    {
      heading: 'One shader, one table',
      paragraphs: [
        'Sandlab has 18 elements you can paint: wall, stone, metal, wood, plant, ice, sand, salt, ash, gunpowder, seed, water, oil, acid, lava, fire, steam and smoke. None has its own physics code; nothing in the simulation says "if this cell is water, do this". There is one WGSL compute shader that treats every cell the same way, and one TypeScript array, PRESETS in src/lib/sand/materials.ts, that says how each material differs.',
        'Each entry has eight fields: slug, name, color, density (0 to 9), movement (static, powder, liquid or gas), lifetime (ticks, or null for permanent), emissive (glow, 0 to 3) and reactions. A nineteenth row, empty, is index 0 and stands for open space. The array order is the material ID: the shader never sees the word "water", only the number 12.',
        'This has four effects. The shader stays small: a new material adds a row, not a branch. Every material takes the same path through the code, made of table lookups. Extending the set is safe, because a row cannot run code. And plain data can be checked by ordinary unit tests without a GPU.',
      ],
    },
    {
      heading: 'Following water from row to pixel',
      paragraphs: [
        'Here is the water row exactly as it appears in the repo:',
      ],
      code: `  {
    slug: 'water', name: 'Water', color: '#2E6FD9', density: 3, movement: 'liquid', lifetime: null, emissive: 0,
    reactions: [
      { with: 'fire', chance: 0.9, become: 'steam', other: 'steam' },
      { with: 'lava', chance: 0.7, become: 'steam', other: 'stone' },
    ],
  },`,
    },
    {
      heading: 'Packing: the row becomes two GPU buffers',
      paragraphs: [
        'packMaterials() flattens the table into two typed arrays that the engine uploads once with device.queue.writeBuffer, as the props and rx storage buffers. The props buffer holds two vec4<f32> per material. The first is (r, g, b, packed); the second is (emissive, 0, 0, 0). The colour comes from the hex string divided by 255. The packed value squeezes three numbers into one float: movement + density * 10 + lifetime * 100, with a null lifetime treated as 0.',
        'For water that is 2 (liquid) + 3 * 10 + 0 = 32. Steam, a gas with density 1 and a lifetime of 160 ticks, packs to 3 + 10 + 16000 = 16013. Stone, static with density 8, is 80. It works because density is one digit and every packed value is an integer a 32-bit float holds exactly.',
        'The shader decodes it with integer arithmetic:',
      ],
      code: `fn packedOf(mat : u32) -> u32 { return u32(props[mat * 2u].w); }
fn movementOf(mat : u32) -> u32 { return packedOf(mat) % 10u; }
fn densityOf(mat : u32)  -> u32 { return (packedOf(mat) / 10u) % 10u; }
fn lifespanOf(mat : u32) -> u32 { return packedOf(mat) / 100u; }`,
    },
    {
      heading: 'How the shader moves water',
      paragraphs: [
        'Each cell on the grid is a single u32: the material ID in the low 16 bits and the remaining lifetime in the high 16 bits, built by mk(mat, life) as mat | life << 16. The simulation runs on a Margolus neighbourhood: the grid is cut into 2×2 blocks, one GPU thread owns each block outright, and the block origin shifts by one cell every tick. No two threads write the same cell, so mass is never duplicated or lost.',
        'Inside a block, movement is decided by shouldSink(top, bottom): a mobile cell swaps with the one beneath it if it is denser and the one beneath is not static. Water at density 3 sinks through oil at 2 but floats on lava at 6. Liquids also get a sideways swap on a coin flip, which is how they spread out and level. Empty space is a special case: it is treated as heavier than any gas but lighter than everything else, so sand falls into it and steam rises out of it. Water flows because its row says liquid and 3, not because any code names it.',
      ],
    },
    {
      heading: 'Water meets lava, inside one 2×2 block',
      paragraphs: [
        'Say water sits directly above lava, and this tick both cells land in the same block, as a (top left) and c (bottom left). The thread ages all four cells, then runs react() on vertical and then horizontal pairs, each in both directions. Diagonals are not checked.',
        'react(a, c) reads water\'s four reaction slots from rx, starting at index 12 * 4. Each slot is a vec4<u32> of (withId, becomeId, otherId, chanceQ). Slot 0 is fire, which does not match lava. Slot 1 is (15, 17, 2, 45875): lava, steam, stone and a chance of 0.7 quantized to 45875 out of 65535. The shader rolls a deterministic hash-based random number for that slot; if it comes in under 0.7, water becomes steam and lava becomes stone, each written back through mk() with its own lifespan. The steam cell starts with 160 ticks of life; stone gets 0, meaning permanent.',
        'If the roll misses, react(c, a) gives lava its turn, but lava has no water entry, so nothing happens. The reaction lives only on water\'s row; because the shader checks both directions, it does not matter which cell is on top.',
        'So chance means the probability per contact check per tick, quantized to 1/65535. Two neighbours are only checked when the shifting block grid puts them in the same 2×2 block, and the simulation advances one tick per screen refresh, so a chance of 0.7 does not mean anything in wall-clock time. It is a relative rate: ice next to lava (0.9) melts almost at once; seed in water (0.06) takes many contacts.',
      ],
    },
    {
      heading: 'The 4-slot reaction table',
      paragraphs: [
        'Every material gets exactly MAX_REACTIONS = 4 slots in rx, whether it uses them or not. GPUs dislike variable-length data: with a fixed stride, the reactions for material m are always at m * 4 through m * 4 + 3, so the lookup is a multiply and a short loop with no indirection. Unused slots are left as zeros, meaning withId 0 and chance 0, and the shader skips any slot whose chance is 0.',
        'Two sentinels let a row describe outcomes relative to itself. \'self\' is packed as 0xffff, and the shader replaces it with the reacting cell\'s own material. \'empty\' is just the ID of empty, 0. Salt touching water becomes empty and leaves the water alone, so it dissolves. Acid touching metal stays acid and turns the metal into empty.',
        'Burning works through these sentinels as well. When wood touches fire, the wood becomes fire and the flame is left unchanged; the same holds for oil, plant and the other things lava and fire set alight. Each new fire cell burns out on its own 45-tick lifetime.',
        'The trade-offs are real. Four is a hard ceiling: acid (metal, stone, wood, water) and lava (wood, plant, oil, ice) already use all four, and packMaterials() does slice(0, MAX_REACTIONS), so a fifth entry would be silently dropped. The first slot that matches and passes its roll wins. Every material pays for four slots even if it reacts with nothing, though 19 rows come to only 76 vec4s.',
      ],
    },
    {
      heading: 'Lifetimes and glow',
      paragraphs: [
        'Lifetime is the one per-cell number that changes. When a cell is created, by the brush or by a reaction, its high 16 bits are set to the material\'s lifespan. At the start of every block update, age() subtracts one; when it reaches 1, the cell becomes empty. Materials with lifespan 0 are skipped. Fire lasts 45 ticks, smoke 120, steam 160.',
        'Emissive, in the second props vec4, drives the bloom passes. A seed pass writes colour * emissive into a light buffer at grid resolution, dimmed by remaining life for materials that have a lifespan, so a dying flame glows less. Two blur passes, horizontal then vertical, spread it, and the render pass adds the result to the cell colours. Lava (2.6) and fire (3.0) light their surroundings; acid (1.1) glows faintly.',
      ],
    },
    {
      heading: 'Docs generated from the same table',
      paragraphs: [
        'The guide at /materials and the 18 pages under /materials/[slug] import PRESETS directly. src/lib/guide/reactions.ts walks every reaction row and writes two sentences: one for the material that owns the row ("Touching Lava: turns into Steam; the Lava turns into Stone.") and one for the partner\'s page, so the lava page lists what water does to it even though lava\'s own row never mentions water. It turns the self and empty sentinels into plain words such as "stays Acid" and "dissolves away". Weight, movement, lifetime and glow come from the same row.',
        'The result is that the numbers and outcomes in the docs cannot drift from behaviour. The descriptive paragraphs on each page are still written by hand in copy.ts, but the facts beside them are never hand-copied.',
      ],
    },
    {
      heading: 'Tests that keep the table honest',
      paragraphs: [
        'materials.test.ts checks that slugs are unique, that empty sits at index 0, that the whole table fits in the one byte per material used by shared links, and that the packed buffers have the right length with every quantized chance inside [0, 65535]. The most useful test is the one below. A typo in a slug would not crash anything: buildIndex() would miss it and packMaterials() would fall back to EMPTY_ID, so the reaction would quietly never happen or would delete cells. The test fails instead.',
      ],
      code: `  it('모든 반응이 실재하는 물질 slug를 참조한다', () => {
    // 오타난 slug는 조용히 EMPTY_ID로 resolve돼 반응이 무성의하게 죽는다 — 여기서 잡는다.
    const slugs = new Set(PRESETS.map((m) => m.slug))
    const special = new Set(['self', 'empty'])
    for (const m of PRESETS) {
      for (const r of m.reactions) {
        expect(slugs.has(r.with), \`\${m.slug}.with=\${r.with}\`).toBe(true)
        expect(slugs.has(r.become) || special.has(r.become), \`\${m.slug}.become=\${r.become}\`).toBe(true)
        expect(slugs.has(r.other) || special.has(r.other), \`\${m.slug}.other=\${r.other}\`).toBe(true)
      }
    }
  })`,
    },
    {
      heading: 'What the approach does not cover',
      paragraphs: [
        'Temperature, pressure and anything involving more than two touching cells are outside the table, and two materials already hit the four-slot ceiling. Within those limits, a new element costs one row and a review: the shader does not change, the guide page appears on its own, and the tests check that the row refers to things that exist.',
      ],
    },
  ],
  sources: [
    { label: 'src/lib/sand/materials.ts — Material, PRESETS, packMaterials, MAX_REACTIONS, SELF_SENTINEL', url: '' },
    { label: 'src/lib/sand/shader.ts — props/rx lookups, react(), age(), shouldSink, cell encoding, bloom passes', url: '' },
    { label: 'src/lib/sand/engine.ts — buffer upload and tick loop', url: '' },
    { label: 'src/lib/sand/materials.test.ts — table integrity tests', url: '' },
    { label: 'src/lib/guide/reactions.ts — guide sentences derived from PRESETS', url: '' },
    { label: 'Toffoli & Margolus, Cellular Automata Machines (MIT Press, 1987)', url: 'https://mitpress.mit.edu/9780262526319/cellular-automata-machines/' },
  ],
}
