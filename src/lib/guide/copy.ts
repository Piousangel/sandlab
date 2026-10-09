/**
 * 재료별 손글씨 설명문(영어). 반응 수치는 reactions.ts가 표로 따로 붙인다.
 * 템플릿 치환 금지 — 재료마다 실제로 시뮬에서 벌어지는 일을 쓴다. copy.test.ts가
 * 누락·분량·문단 중복을 막는다.
 */
export interface MaterialCopy {
  summary: string
  body: string[]
  tip: string
}

export const COPY: Record<string, MaterialCopy> = {
  wall: {
    summary: 'Wall is the indestructible frame of every scene: nothing moves it, burns it, or eats through it.',
    body: [
      'Wall is the heaviest material in Sandlab and it never moves. No reaction in the table targets it, so acid, lava and fire all slide off it. That makes it the only truly permanent material you can paint.',
      'Use it for anything that has to survive the whole scene: the sides of a container, a funnel that guides sand, or a floor that should still be there after the lava has finished its work. If you want a barrier that eventually fails, pick stone or metal instead.',
    ],
    tip: 'Build containers out of wall first, then fill them. A one-cell gap is enough for water to leak through, so draw walls with a thicker brush than you think you need.',
  },
  stone: {
    summary: 'Stone is solid rock that stays put until acid slowly dissolves it.',
    body: [
      'Stone is static and heavy, so powders pile on top of it and liquids pool against it. Unlike wall, it is not permanent: acid eats a touching stone cell at a modest rate, so an acid pool will carve a channel through a stone floor given time.',
      'Stone is also what you get when water meets lava. That reaction is how you build bridges in the challenges: pour water onto a lava river and the surface hardens into a stone crust you can stack sand on.',
    ],
    tip: 'If a stone wall is leaking, look for acid. If you need stone where there is none, pour water onto lava and let the crust form.',
  },
  metal: {
    summary: 'Metal is a heavy static block that only acid can harm.',
    body: [
      'Metal behaves like stone for movement, but acid eats it faster than stone. Fire and lava have no effect on it, which makes metal a good choice for a heat-proof shelf that you still want to be able to cut later.',
      'Because acid removes metal one cell at a time and keeps going, a thin metal plate is a natural timer: put acid on top and the plate gives way after a few seconds, dropping whatever was resting on it.',
    ],
    tip: 'Use a thin metal floor with acid above it as a delayed trapdoor. Thicker plates take longer to cut, so the plate thickness sets the delay.',
  },
  wood: {
    summary: 'Wood is static fuel: it stands still until fire or lava sets it burning.',
    body: [
      'Wood does not fall, so you can build shelves and houses out of it. Its weakness is heat. Fire spreads into touching wood steadily, and lava ignites it even faster, so a single spark can take down a whole wooden structure one cell at a time.',
      'Acid also eats wood, quickly. That gives you two ways to remove a wooden obstacle: burn it, which spreads unpredictably and makes smoke, or dissolve it, which is precise but costs acid.',
    ],
    tip: 'To protect wood from a fire, cut a gap: fire only spreads to cells it touches. Water poured on the flames turns them to steam before they reach the next plank.',
  },
  plant: {
    summary: 'Plant is living, static growth that spreads along water and burns very easily.',
    body: [
      'Plant cells do not move, but when water touches them, the water slowly turns into more plant. A small patch of plant next to a pool will creep across it over time. Seeds that land in water sprout into the same material.',
      'The trade-off is fire. Plant catches fire faster than wood, and lava ignites it faster still, so an overgrown scene is also a very flammable one.',
    ],
    tip: 'To grow plant upward, keep feeding it water from above. To stop it spreading, take away the water rather than trying to cut the plant.',
  },
  ice: {
    summary: 'Ice is a static, slightly glowing solid that freezes water and melts in heat.',
    body: [
      'Ice slowly turns touching water into more ice, so a block of ice in a pool will grow. Heat reverses that: fire melts ice into water and turns the flame into steam, and lava melts it almost instantly, leaving water behind and cooling the lava into stone.',
      'That last reaction makes ice a lava stopper. Drop ice into a lava flow and you get a plug of stone with a puddle of water on top.',
    ],
    tip: 'Ice is the cleanest way to stop lava. Water also works but boils off as steam, while ice leaves solid stone exactly where it touched.',
  },
  sand: {
    summary: 'Sand is the classic falling powder: it piles into dunes and sinks through lighter liquids.',
    body: [
      'Sand falls and slides off slopes, forming cones and dunes. It is heavier than water and oil, so it sinks to the bottom of a pool and pushes the liquid up. It has no reactions at all, which makes it the most predictable material for building.',
      'Because sand displaces liquid, you can use it to raise a water level: pour sand into a cup of water and the water rises over the rim.',
    ],
    tip: 'Sand is the best cheap filler. When a challenge asks you to block or raise something without side effects, try sand first.',
  },
  salt: {
    summary: 'Salt is a white powder that dissolves when it touches water.',
    body: [
      'Salt falls like sand, but water eats it: a salt cell touching water disappears at a slow, steady rate, and the water stays water. A heap of salt in a pool shrinks from the bottom up.',
      'That makes salt a temporary material. A salt dam holds back water for a while and then fails on its own, which is useful when something needs to happen later rather than now.',
    ],
    tip: 'Use salt as a timed barrier: the more salt touches the water, the faster it goes. A tall, thin dam lasts longer than a short, wide one.',
  },
  ash: {
    summary: 'Ash is a light grey powder that falls and settles but does nothing else.',
    body: [
      'Ash is lighter than sand and has no reactions, so it behaves like a soft, inert dust. It sinks through gases and comes to rest on top of anything denser.',
      'Ash is good for decoration and for filling space without changing what happens in the scene. Nothing ignites it, dissolves it, or turns it into anything else.',
    ],
    tip: 'When you need a powder that will not react with a nearby fire or acid, use ash instead of gunpowder, seed or salt.',
  },
  gunpowder: {
    summary: 'Gunpowder is a dark powder that turns into fire almost instantly when heat touches it.',
    body: [
      'Gunpowder falls like sand, but any fire or lava touching it converts both cells to fire almost immediately. The new fire touches the next grains, so a trail of gunpowder burns along its whole length in a fraction of a second.',
      'That speed is the point. A gunpowder fuse carries fire across a scene far faster than wood or oil, and a pile of it flashes into a burst of flame that can reach targets nothing else can.',
    ],
    tip: 'Lay gunpowder as a thin fuse from a fire source to whatever you want to light. Keep water away from the path, or the fire becomes steam before it arrives.',
  },
  seed: {
    summary: 'Seed is a light powder that sprouts into plant when it lands in water.',
    body: [
      'Seed falls like a light sand. When a seed touches water, it slowly becomes a plant cell and uses up the water it touched. The plant then keeps growing along any remaining water.',
      'Sprinkle seed over a pond and the surface turns green. Drop seed on dry ground and nothing happens until water arrives, so seed lets you plant growth now and trigger it later.',
    ],
    tip: 'To grow plant where you want it, put seed there first and send water to it afterwards. The plant follows the water from that point on.',
  },
  water: {
    summary: 'Water is the everyday liquid: it flows, finds its level, and puts out fire.',
    body: [
      'Water spreads sideways until it is flat, fills containers, and sinks below oil. Touching fire turns both the water and the flame into steam almost instantly, which is why water is the fastest way to stop a fire.',
      'Water and lava react too: the water boils into steam while the lava cools into stone. Water also feeds plants, sprouts seeds, freezes against ice and dissolves salt, so it is involved in more reactions than any other material.',
    ],
    tip: 'Water is consumed when it fights fire or lava, so pour more than you think you need, and pour it where the fire is going rather than where it has been.',
  },
  oil: {
    summary: 'Oil is a light, dark liquid that floats on water and burns readily.',
    body: [
      'Oil is lighter than water, so it always ends up on top of it. Fire spreads into oil fast, and lava ignites it almost instantly, so a film of oil on a pond becomes a sheet of flame.',
      'Because it floats, oil lets fire travel across water, which is normally a fire break. That makes it the material to use when you need a fire to reach the far side of a pool.',
    ],
    tip: 'Pour oil on water to make a burning bridge. Oil fires are stubborn: water quenches the flames it touches but sinks beneath the oil, leaving the fuel on top to catch again.',
  },
  acid: {
    summary: 'Acid is a glowing green liquid that eats metal, stone and wood.',
    body: [
      'Acid flows like water and dissolves the static materials it touches: wood fastest, then metal, then stone. The acid itself survives each bite, so one pool keeps cutting until it runs out of things to eat.',
      'Water neutralises it. When acid meets water both turn into steam, so a water moat is the one barrier acid cannot dissolve its way through.',
    ],
    tip: 'Acid cannot touch wall, so contain it with wall. To stop an acid leak in a hurry, pour water on it.',
  },
  lava: {
    summary: 'Lava is a heavy, glowing liquid that ignites fuel and hardens into stone when cooled.',
    body: [
      'Lava is a liquid heavier than water and oil, so it sinks beneath both. It sets wood and plant on fire on contact without being used up, so one lava flow can light a whole row of trees. Oil and gunpowder are different: they consume the lava cell they touch as they catch.',
      'Cooling turns it to rock. Water poured on lava boils into steam and leaves stone behind, and ice does the same even faster. That is how you build a crossing over a lava river.',
    ],
    tip: 'To cross lava, harden its surface with water or ice, then build on the stone crust. To burn something far away, lead lava to it in a channel.',
  },
  fire: {
    summary: 'Fire is a short-lived glowing gas that spreads into fuel and then burns out.',
    body: [
      'A fire cell rises and fades after a short lifetime. It survives by spreading: it turns touching wood, plant and oil into more fire. Without fuel it dies out on its own in about a second.',
      'Water and ice are its enemies. Water turns flame into steam almost instantly, and ice melts while putting the fire out. Gunpowder, on the other hand, turns into fire immediately and carries it far.',
    ],
    tip: 'Fire goes where the fuel is. To save something, remove the fuel between it and the flames; to burn something, give the fire a path of oil or gunpowder.',
  },
  steam: {
    summary: 'Steam is the hot white gas left behind when water meets fire or lava.',
    body: [
      'Steam rises and drifts for a few seconds before it disappears. It does not react with anything, so it is purely a by-product: a sign that water just fought fire, lava or acid somewhere below.',
      'Because steam takes the place of the water that made it, the water is gone. A lot of steam means a lot of water was spent.',
    ],
    tip: 'Watch the steam to see where your water is being used up. If a challenge is running short on water, the steam shows you where it went.',
  },
  smoke: {
    summary: 'Smoke is a dark, inert gas that rises and fades.',
    body: [
      'Smoke floats upward and vanishes after a couple of seconds. Nothing reacts with it, so it never spreads fire or puts it out; it only drifts. Burning wood, plant and oil do not produce it automatically, so any smoke in a scene is smoke someone painted.',
      'In Sandlab, smoke is a painting material more than a physical one. Use it for chimneys, fog and atmosphere that should clear on its own.',
    ],
    tip: 'Paint smoke at the top of a fire scene for a more convincing plume. It disappears by itself, so it never clutters the final picture.',
  },
}
