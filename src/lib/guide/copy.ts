/**
 * 재료별 손글씨 설명문(영어). 반응 수치 표는 reactions.ts가 따로 붙인다.
 * 템플릿 치환 금지 — 재료마다 시뮬에서 실제로 벌어지는 일을 쓴다.
 * page: true인 14개만 /materials/[slug] 개별 페이지를 가진다. wall·ash·steam·smoke는 허브에만 나온다.
 * 모든 수치는 materials.ts(SSOT)와 shader.ts의 이동 규칙에서 온다. 초 단위 시간은 쓰지 않는다
 * (틱 = 화면 갱신 1회라 기기마다 다르다).
 */
export interface MaterialCopy {
  summary: string
  body: string[]
  tip: string
  experiments?: { title: string; steps: string }[]
  page: boolean
}

export const COPY: Record<string, MaterialCopy> = {
  wall: {
    page: false,
    summary: 'Wall is the permanent frame of a scene: nothing in the simulation moves it, burns it or dissolves it.',
    body: [
      'Wall is static and appears in no reaction table, acid included, so flames, lava and acid all leave it exactly as painted. Its listed weight of 9 ties with metal for the top of the scale, but static cells never take part in sinking, so that number has no visible effect. The edges of the canvas behave like an invisible strip of wall as well.',
    ],
    tip: 'Draw containers from wall when they have to outlast everything else in the scene, and switch to stone or metal only when you want acid to be able to open them later.',
  },
  ash: {
    page: false,
    summary: 'Ash is a grey, inert powder for texture: no reaction creates it and none consumes it.',
    body: [
      'Ash falls and heaps like sand but is lighter, at weight 4, so sand, salt and gunpowder poured onto it push down through the layer and leave the ash on top. It is still heavier than water and oil and settles beneath them. Burning does not leave ash behind in Sandlab, so every grey grain in a scene was put there by hand.',
    ],
    tip: 'A thin dusting of ash over a burned-out area suggests what a real fire would leave behind, and it will never reignite or react with whatever you paint next to it.',
  },
  steam: {
    page: false,
    summary: 'Steam is a pale, faintly glowing gas released when water meets fire or lava, when acid meets water, or when fire melts ice.',
    body: [
      'Steam has weight 1. It rises through empty space, anything heavier passes down through it, and it reacts with nothing. Each cell expires on its own after a couple of seconds and leaves empty space.',
      'Unlike real vapour, it never condenses back into droplets. Water that has turned into steam is gone from the scene for good, so a large cloud is a record of how much liquid a fight with fire or lava has cost.',
    ],
    tip: 'Watch where steam is rising to find out where your water is being spent.',
  },
  smoke: {
    page: false,
    summary: 'Smoke is a dark, inert gas that rises and clears by itself, and it exists only where you paint it.',
    body: [
      'Smoke shares steam’s weight of 1: it drifts upward through open space and heavier materials fall through it. No reaction produces it, burning included, and nothing reacts with it, so it can neither spread nor smother a flame. Each cell lasts a couple of seconds before vanishing, so a painted plume thins out from its oldest parts first rather than drifting forever.',
    ],
    tip: 'Brush a little smoke above a chimney or a burning building for atmosphere; it clears itself and leaves no clutter in the finished picture.',
  },

  stone: {
    page: true,
    summary: 'Stone is a fixed block of grey rock that ignores heat entirely and gives way only to acid.',
    body: [
      'Stone never moves once painted. It is static, so it does not fall even with nothing underneath it, and no powder or liquid can push it aside. Its listed weight of 8 is mostly bookkeeping for that reason: the simulation compares weights only between cells that are able to move, and stone never is. A slab painted in mid-air hangs there for the whole session and holds up whatever lands on it.',
      'Heat leaves it alone. Neither fire nor lava has an entry for stone, so a lava channel lined with it or a fireplace built from it will still be standing afterwards. The single material that removes stone is acid, which deletes a touching stone cell 15 percent of the time it checks that contact. That is the slowest of acid’s three bites; wood and metal both go faster.',
      'Stone is also something the sandbox produces by itself. When water touches lava, the lava cell becomes stone and the water becomes steam; when ice touches lava, the lava again turns into stone and the ice melts into water. Because the new stone is static, it sets exactly where the molten cell was, so a cooled flow keeps its outline as a rocky crust instead of slumping into a heap.',
      'Real basalt forms the same way in broad strokes: molten rock loses heat to water or air and solidifies. Sandlab skips everything gradual about it. There is no temperature, no glowing half-cooled skin and no cracking; a lava cell is either fully molten or, after one successful contact roll, fully stone.',
    ],
    tip: 'For a floor that must survive fire and lava but might need an opening later, pick stone over wall. A small pocket of acid can cut stone, while wall can only be removed by hand.',
    experiments: [
      {
        title: 'Freeze a lava river in place',
        steps: 'Paint a long strip of lava on a stone floor, then drag a thin line of water across its surface. Wherever the two meet, steam lifts off and grey rock appears. Keep sweeping and the river turns into a ridged stone bar that still traces the shape of the flow.',
      },
      {
        title: 'Acid against a stone dam',
        steps: 'Build a stone dam two or three cells thick with a pool of acid on one side and open space on the other. The acid chews into the dam a cell at a time; once it breaks through, the remaining acid drains out of the hole. Double the thickness and the breach takes noticeably longer.',
      },
      {
        title: 'A shelf with nothing under it',
        steps: 'Paint a horizontal bar of stone high above the floor and pour sand onto its middle. A cone builds on the bar and grains spill off both ends, yet the bar itself never drops, because static materials ignore gravity here.',
      },
    ],
  },

  metal: {
    page: true,
    summary: 'Metal is a pale, heat-proof block that acid cuts through faster than it cuts stone.',
    body: [
      'On the grid, metal and stone share almost every property. Both are static, both shrug off fire and lava, and neither can be shoved by sand or water. Metal carries a weight of 9, tied with wall for the heaviest figure in the table, but like every static material it never joins in sinking, so the value changes nothing you can see.',
      'The difference appears only when acid arrives. Acid deletes a touching metal cell on 25 percent of contact checks, compared with 15 percent for stone, so one pool tunnels through a metal plate faster than through a stone plate of equal thickness. The acid is not spent by the bite. A single blob can keep eating downward until it runs out of metal or reaches something it has no entry for.',
      'That makes metal a dependable delay. Thickness is the dial: each extra row of plate is another layer the acid has to chew through. Because every check is a random roll, two identical plates will not fail on the same frame, but on average a thicker plate holds out longer.',
      'Real metals are far less uniform. Iron rusts, aluminium resists acid until its oxide film is gone, and hot metal conducts heat and eventually melts. Sandlab treats metal as one generic, unmeltable solid that responds to acid and nothing else. It conducts nothing either; the simulation has no electricity and no heat transfer.',
    ],
    tip: 'Metal and stone survive lava equally well. Choose metal when you intend to open a hole with acid later and want that cut to finish sooner.',
    experiments: [
      {
        title: 'Acid trapdoor',
        steps: 'Build a box from wall, lay a one-cell metal floor across its middle and pour acid onto that floor. Put some wood in the lower chamber. After a short wait the acid eats a gap in the plate, drains through and starts dissolving the wood below.',
      },
      {
        title: 'Metal versus stone race',
        steps: 'Paint a metal bar and a stone bar of the same thickness next to each other, then lay an equal stripe of acid along the top of both. The metal side usually gives way first, which is the 25 versus 15 percent gap made visible.',
      },
      {
        title: 'A tray of lava',
        steps: 'Shape a shallow metal tray and fill it with lava. The lava glows and sloshes but the tray never softens. Touch a wooden peg to the lava at the rim and the peg catches fire while the metal right next to it stays intact.',
      },
    ],
  },

  wood: {
    page: true,
    summary: 'Wood is a solid, flammable building block: fire and lava turn it into flame, and acid eats it quickly.',
    body: [
      'Wood is static, so it keeps whatever shape you give it: beams, platforms, the frame of a hut. Powders rest on top and liquids pool against its sides. Its weight of 7 has no bearing on movement, since static cells are never displaced.',
      'Fire is what undoes it, and both sides of the contact can start the burn. Wood’s own table gives a 12 percent chance of catching when a flame is next to it, and a further 15 percent comes from the flame’s side. When either roll succeeds the wood cell becomes fire and the original flame keeps burning. That new flame is touching the next plank, so burning moves through timber as a front, one ring of cells after another, rather than all at once.',
      'Lava is a harsher igniter, setting wood alight on 40 percent of checks, and the lava is not used up in the process. A lava pool resting against a wooden wall keeps lighting it for as long as any wood remains in contact.',
      'Acid is the third threat, and wood is its favourite target at 30 percent. Dissolving leaves an empty hole and nothing else, and unlike a burn it does not travel by itself; it only goes where the acid flows.',
      'Real wood leaves charcoal, ash and smoke when it burns. In Sandlab a plank simply becomes fire, and fire eventually becomes empty space, so a burned structure disappears without a trace. Paint ash and smoke yourself if you want a sooty aftermath.',
    ],
    tip: 'Ignition needs direct contact, so a gap of empty cells works as a firebreak. Flames climb as they burn, which means wood stored beside a fire is much safer than wood stored above it.',
    experiments: [
      {
        title: 'Watch a burn front',
        steps: 'Paint a solid rectangle of wood and touch one corner with a small dab of fire. The edge of the burn advances unevenly, with a ragged orange border and short-lived flames lifting off the top, until nothing of the rectangle is left.',
      },
      {
        title: 'Two huts, one moat',
        steps: 'Build two identical wooden huts. Pour lava straight against the first; for the second, lay a line of water between the hut and the lava first. The first hut catches almost immediately, while at the second the advancing lava turns to stone against that water and the wood is spared.',
      },
      {
        title: 'Carve without flames',
        steps: 'Draw a thick wooden beam and drip acid onto its centre. A clean notch opens downward with no fire and no spreading, and the acid drops out of the bottom once it has cut all the way.',
      },
    ],
  },

  plant: {
    page: true,
    summary: 'Plant is static green growth that slowly turns touching water into more plant and burns faster than wood.',
    body: [
      'Plant does not fall or flow. What sets it apart from wood is that it expands: whenever water touches a plant cell, the water cell becomes plant on 2 percent of checks. The rate is low, so growth shows up as a gradual creep rather than a burst, and it stops the moment no water is left in contact.',
      'Growth follows water, not light or soil. A green patch at the edge of a pool spreads into the pool, while a patch on dry sand stays exactly as painted. Each converted cell is itself static, so once the surrounding water drains away the plant can be left hanging in mid-air, a green sponge shaped like the water that fed it.',
      'Plant is also the most flammable solid. Its own table catches fire at 35 percent per check and the fire’s table adds 30 percent, two to three times the figures for wood. Lava lights it at 60 percent. A burning thicket empties far sooner than a wooden block of the same size.',
      'Acid has no entry for plant at all. That is a simplification, since real acids damage leaves and stems readily, but in the sandbox a green lining is one of the few non-wall surfaces an acid pool will sit against without eating.',
      'Real plants do not literally turn water into leaves; they draw up water and carbon dioxide over days. Sandlab compresses that into a one-step swap so that growth is visible within a single session.',
    ],
    tip: 'Keeping a hedge wet helps it survive a fire: a flame that touches water usually turns into steam before it can reach the green behind it.',
    experiments: [
      {
        title: 'Overgrow a pond',
        steps: 'Paint a wall bowl, fill it with water, and set a short line of plant along one side of the surface. The green advances into the pool bit by bit; leave it running and most of the water ends up as plant.',
      },
      {
        title: 'Thicket against timber',
        steps: 'Paint equal blocks of plant and wood with a wide gap between them and put a dab of fire on each. The plant block is consumed while the wooden one is still smouldering through its middle.',
      },
      {
        title: 'Green cup, sour contents',
        steps: 'Shape a small cup out of plant and fill it with acid. The acid sits in the cup without harming it. Replace one side of the cup with wood and the acid tunnels out through that side alone.',
      },
    ],
  },

  ice: {
    page: true,
    summary: 'Ice is a faintly glowing static solid that freezes neighbouring water and melts on contact with fire or lava.',
    body: [
      'Ice is static, so a block painted in mid-air stays put, and its faint glow keeps it visible in dark scenes. It grows by freezing: each check on water touching ice turns it to ice 4 percent of the time. That is twice plant’s growth rate but still slow, so a block in a pool thickens gradually rather than locking the whole pool at once.',
      'Fire melts it. When ice touches a flame, 60 percent of checks end with the ice becoming water and the flame becomes steam. Lava works faster still, at 90 percent: the ice turns to water and the lava cell turns to stone. Either way the ice is spent, but against lava it leaves a solid plug behind.',
      'This is where the model parts company with reality. Real ice is less dense than liquid water, which is why icebergs float. Sandlab lists ice at weight 4 against water’s 3, but because ice is static that figure never comes into play: it does not float, sink or drift. It sits exactly where you painted it until something melts it.',
      'Acid has no reaction with ice, and nothing besides fire and lava melts it, so a frozen block in a scene without a heat source is effectively permanent.',
    ],
    tip: 'Ice is the most reliable lava stopper in the table. It hardens lava into stone at the highest rate of any material, and unlike water it cannot run off the spot that needs sealing.',
    experiments: [
      {
        title: 'Freeze a pool solid',
        steps: 'Fill a wall basin with water and paint a single column of ice down its middle. The column fattens sideways through the water, and given time the pool becomes one frozen sheet with a few pockets of liquid trapped inside.',
      },
      {
        title: 'Melting from below',
        steps: 'Paint a shelf of ice and place fire under it. Flames rise against the underside; each successful contact leaves a drop of water and a puff of steam, and the water then falls back onto the flames below and smothers some of them.',
      },
      {
        title: 'Ice or water against lava',
        steps: 'Pour one lava stream onto a block of ice and another onto a puddle of water. Both streams are capped with stone, but the ice seals its stream faster and stays where it was put, while the puddle spreads out and loses much of itself as steam.',
      },
    ],
  },

  sand: {
    page: true,
    summary: 'Sand is the reference powder: it falls, piles into cones and settles under every liquid lighter than itself.',
    body: [
      'At each update a grain of sand tries to drop into the cell below; if that is blocked, it tries the two diagonals. It never slides straight sideways. That rule alone produces the familiar cone: a stream poured onto one spot builds a heap with sloping flanks, and grains roll off whichever side is open.',
      'Sand has weight 5. Water, acid and oil are lighter, so a grain dropped into any of them trades places with the liquid beneath and keeps going until it lands on something at least as heavy or on a static surface. Lava is the exception among liquids: at weight 6 it outweighs sand, so grains rest on a lava surface, and lava poured onto a dune works its way down through it.',
      'Salt and gunpowder share sand’s weight, so mixtures of the three never separate; they just pile together. Seed and ash are lighter at 4, which means sand poured onto a bed of seed sinks through it and the seed ends up above.',
      'Sand has no reactions whatsoever. Fire, lava, acid and water all leave it unchanged, so it is the safe choice whenever you want mass without chemistry. Real sand melts into glass at very high temperatures; Sandlab does not model that, so sand sitting on lava stays sand indefinitely.',
    ],
    tip: 'Because it displaces lighter liquids, sand poured into a full container raises the liquid level. That is a way to push water over a rim without ever touching the water.',
    experiments: [
      {
        title: 'Swap two layers',
        steps: 'Inside a narrow wall tube, paint a band of seed and pour sand on top of it. The yellow grains work down through the green ones until the layers have traded places, with seed above and sand below.',
      },
      {
        title: 'Grains on a lava lake',
        steps: 'Fill a wall basin with lava and sprinkle sand over it: the sand sits on the glowing surface instead of sinking. Then drop a blob of lava onto a dry heap of sand and it trickles down through the heap to the floor.',
      },
      {
        title: 'Overflow by displacement',
        steps: 'Fill a cup almost to the brim with water and pour sand into it. The sand collects at the bottom and the waterline climbs; keep pouring and water spills over the edge.',
      },
    ],
  },

  salt: {
    page: true,
    summary: 'Salt is a white powder that behaves like sand until water touches it, and then slowly disappears.',
    body: [
      'Salt moves exactly like sand: weight 5, straight or diagonal falls, cone-shaped heaps. In a dry scene the two are interchangeable apart from colour.',
      'Water is what separates them. When a salt cell touches water, the salt vanishes on 8 percent of checks, leaving an empty cell, while the water cell is unchanged. Since the water is never consumed, one puddle can dissolve an unlimited amount of salt if you give it time.',
      'Weight decides the shape of the erosion. Salt is heavier than water, so a heap dropped into a pool sinks to the floor and the water reaches it from above and from the sides. The mound shrinks from its outer surface inward, and water slumps into each gap as it opens. A dry heap standing next to a pool erodes only along the face where the water can reach it.',
      'Real salt dissolves into brine, which is denser than fresh water and can crystallise again when the water evaporates. Sandlab deletes the salt outright. There is no brine, no saturation limit and no way to recover salt from the water later.',
    ],
    tip: 'Salt makes a barrier with a built-in expiry. Only the wet face erodes, so a thick wall of salt that meets the water on one narrow side lasts much longer than a low mound with water lying over its whole top.',
    experiments: [
      {
        title: 'A dam that gives way',
        steps: 'Flood the left half of a walled box and separate it from the empty right half with a column of salt. The water eats into the column from its side and top until a breach opens, and then it pours into the dry half.',
      },
      {
        title: 'The shrinking mound',
        steps: 'Pour a heap of salt into the middle of a deep pool. It drops to the bottom as a white mound that wears away while you watch. As it goes, the waterline sinks a little, because the salt had been taking up room in the pool.',
      },
      {
        title: 'Salt beside sand',
        steps: 'Lay two identical piles in the same pool, one of salt and one of sand. The sand pile never changes shape; the salt pile dwindles until nothing is left.',
      },
    ],
  },

  gunpowder: {
    page: true,
    summary: 'Gunpowder is a dark powder that flashes into fire at the touch of flame or lava, carrying a burn along any trail it forms.',
    body: [
      'Mechanically, gunpowder is another weight-5 powder: it falls, slips diagonally off slopes and builds cones, and it settles through water, acid and oil. It never ignites on its own, and neither friction nor impact sets it off.',
      'Contact with a flame changes that immediately. Gunpowder’s table gives an 85 percent chance per check of becoming fire when fire touches it, and the flame that lit it keeps burning. The number is high enough that a grain beside a flame almost always catches within its first couple of checks, and the new flame does the same to the grains around it, so a line of powder burns from one end to the other in a quick, visible streak.',
      'Lava ignites it at the same 85 percent rate. Since the powder is lighter than lava, a handful dropped onto a lava pool rests on the surface and lights from the bottom of the pile upward.',
      'Real gunpowder does more than burn: it turns into hot gas almost instantly, and that sudden expansion is what makes the bang and the blast. Sandlab has no pressure or explosive force, so nothing is thrown around. What you see is a very fast chain of fire, not an explosion.',
      'Water is the main defence. Powder lying under water never comes into contact with a flame, and a flame that reaches the water turns into steam first.',
    ],
    tip: 'Lay a fuse on a flat, solid floor. Powder painted on a slope or in mid-air slides as it settles, and the trail breaks into separate heaps that the fire cannot jump between.',
    experiments: [
      {
        title: 'A fuse to a woodpile',
        steps: 'Run a thin line of gunpowder along a wall floor from a small fire to a block of wood. Once the near end lights, the flame races along the powder far faster than it could move through wood, and the block at the far end catches on arrival.',
      },
      {
        title: 'Powder kept wet',
        steps: 'Pour gunpowder into a pool so it settles on the bottom, then paint fire over the water. The flames turn into steam at the surface and the powder underneath never lights.',
      },
      {
        title: 'Sprinkled on lava',
        steps: 'Scatter gunpowder over a lava pool. The grains land on the glowing surface and flash into flame where they touch it, so each little pile burns from its base to its tip.',
      },
    ],
  },

  seed: {
    page: true,
    summary: 'Seed is a light green powder that sprouts into plant wherever water reaches it.',
    body: [
      'Seed falls and heaps like other powders, only lighter: its weight is 4. Sand, salt and gunpowder push down through a layer of seed, so in a mixed pile the seeds work their way upward. Water and oil are lighter still, and seed sinks through both.',
      'Its only reaction is with water. Each time a seed touching water is checked, there is a 6 percent chance that the seed becomes a plant cell and the water cell beside it is removed. Unlike salt, a sprouting seed uses up the water it touched; unlike ice or plant, it does not convert that water into more of itself.',
      'The plant that appears is static. A seed that sprouts partway down while sinking through a pond leaves a plant cell suspended at that depth, and from then on plant’s own rule applies: water touching it gradually turns green. A handful of seed thrown into a lake therefore starts several growth points at different depths, and the lake fills in from all of them.',
      'Dry seed is completely inert. Fire, lava and acid have no entries for it, which is a simplification, since real seeds burn and are damaged by acid. In the sandbox, seed scattered on a hot or acidic floor simply waits until water arrives.',
    ],
    tip: 'Seed separates where growth happens from when it starts: place the seed first, then send water toward it whenever you want the plants to appear.',
    experiments: [
      {
        title: 'Plant a lake',
        steps: 'Flood a broad wall-sided tank and sprinkle seed across the surface. The seeds sink as they go and green specks appear at different depths; leave it running and the specks merge into one continuous mass of plant.',
      },
      {
        title: 'A garden on a timer',
        steps: 'Spread seed along a stone shelf and leave it dry; nothing happens. Later, pour water onto one end of the shelf. Sprouting begins only where the water reaches, so that end turns green first and the dry end waits.',
      },
      {
        title: 'Light grains rise',
        steps: 'Fill a narrow tube with seed and then pour salt on top. The salt settles to the bottom of the tube and the green seed is pushed up above it, the weight-4 versus weight-5 rule in action.',
      },
    ],
  },

  water: {
    page: true,
    summary: 'Water is the central liquid of Sandlab: it levels out, puts out fire, cools lava and feeds most of the slow reactions.',
    body: [
      'Water has weight 3. It drops whenever it can, and when the way down is blocked it also moves sideways into any lighter cell that is not static, which is how a poured column spreads into a flat pool. Oil, at weight 2, floats on it; sand, salt, gunpowder, seed, ash and lava all sink through it. Acid has exactly the same weight, so the two never form layers; they react instead.',
      'Water is the main extinguisher. Its table turns both itself and a touching flame into steam 90 percent of the time a pair is checked, the highest figure for anything that fights fire. Steam is harmless and drifts away, so a splash leaves a small cloud and an empty space where the flame was.',
      'Against lava the result is less tidy. The water becomes steam and the lava becomes stone at 70 percent per check. The stone is static, so the first contacts build a solid skin between the remaining water and the remaining lava, and cooling slows down once the two are no longer touching.',
      'Many materials grow on water or spend it. Plant converts it into plant, ice freezes it into ice, seed sprouts and removes the water it touched, salt dissolves into it without using any of it up, and acid and water annihilate each other into steam.',
      'Real water carries heat, evaporates over time and expands when it freezes. None of that happens here; a water cell stays water indefinitely unless one of those listed contacts changes it.',
    ],
    tip: 'Every fire or lava contact uses up water, so aim a stream at the leading edge of a fire. Water poured onto cells that have already burned out is wasted.',
    experiments: [
      {
        title: 'Two liquids, two layers',
        steps: 'Pour oil and water into the same basin in either order. They settle into two layers, dark oil above blue water, regardless of which one went in first.',
      },
      {
        title: 'Crust on a lava pool',
        steps: 'Trickle water slowly across a lava pool. A grey skin of stone forms along the surface while steam rises away; stop pouring and the lava under that skin stays molten and bright.',
      },
      {
        title: 'Neutralise an acid stream',
        steps: 'Pour a stream of acid into a tank of water. Along the line where they meet, both liquids vanish into steam, and the exchange continues until one side runs out.',
      },
    ],
  },

  oil: {
    page: true,
    summary: 'Oil is the lightest liquid in Sandlab: it floats on water and acid and catches fire readily.',
    body: [
      'Oil has weight 2 against water’s 3, so water or acid beneath it stays beneath, and oil poured into a full tank spreads into a thin film over the top. By the same rule every powder falls through it. Only the gases, at weight 1, are lighter.',
      'Real oil floats for much the same reason: it is less dense than water and does not mix with it. Sandlab captures that with a single weight comparison. It does not model viscosity, though, so oil runs just as freely as water here, whereas a real heavy oil would ooze.',
      'Oil burns at 50 percent per check from both directions: oil’s entry turns it into fire when a flame touches it, and the flame’s entry converts neighbouring oil as well. The original flame survives each ignition. That rate sits between plant and gunpowder, so a slick catches as a fast sweep across its surface rather than a single flash.',
      'Lava lights it at 80 percent from the oil side and 70 percent from the lava side, and the lava stays lava. Being much heavier, lava sinks straight through an oil layer and ignites the oil it passes on the way down.',
      'A burning film on water is stubborn. Water poured onto it is heavier than the oil, so it drops through the fuel, quenching only the flames it happens to hit, and ends up underneath while the oil keeps burning on top.',
    ],
    tip: 'A thin film of oil lets fire cross a pool, which otherwise works as a natural firebreak.',
    experiments: [
      {
        title: 'Burning bridge',
        steps: 'Fill a wide basin with water, pour a thin layer of oil over it and light one end. The flame sweeps across the surface; once the oil is gone the fire stops, with only a little of the water below lost to steam where flames brushed against it.',
      },
      {
        title: 'Three liquids in a tube',
        steps: 'Pour water, then oil, then acid into a narrow wall tube. The oil finishes on top, while the acid passes below it and meets the water; because those two are equal in weight they do not stack, and they turn to steam where they touch.',
      },
      {
        title: 'Lava through a slick',
        steps: 'Pour lava onto a pool of oil. The lava sinks, lighting the oil along its path, and comes to rest on the floor glowing beneath a sheet of flame.',
      },
    ],
  },

  acid: {
    page: true,
    summary: 'Acid is a glowing green liquid that eats wood, metal and stone without being used up, and destroys itself only against water.',
    body: [
      'Acid flows exactly like water and has the same weight, 3. It has a faint glow, which makes leaks easy to spot in a dark scene. Oil floats on it, and every powder sinks through it.',
      'It has four reactions and no others. It removes a touching wood cell 30 percent of the time per check, metal 25 percent and stone 15 percent; in all three cases the acid cell survives, so a single pool keeps eating as long as it has something to eat. The fourth partner is water, and there both cells become steam half the time the pair is checked.',
      'What acid leaves alone matters just as much: wall, sand, salt, ash, seed, gunpowder, ice, plant and oil are all untouched. A wall cup holds acid indefinitely, and a pool resting on a sand floor never sinks into it, because the sand is heavier and is not on the menu.',
      'Real acids are selective too. Most attack metals and carbonate rock while leaving glass alone, and they are diluted by water rather than bursting into vapour. The steam reaction in Sandlab is a stylised stand-in for neutralisation, with no gradual dilution and no heat.',
    ],
    tip: 'To stop a spill, meet it with water rather than a barrier. Each acid cell that reaches the water is gone, while a stone or wooden barrier only buys time.',
    experiments: [
      {
        title: 'Striped block',
        steps: 'Paint a thick block made of horizontal stripes of wood, metal and stone, then place acid on top. It falls through the wood stripe quickly, slows at the metal and slows again at the stone, so the three rates show up as three different speeds.',
      },
      {
        title: 'Sand on the bottom',
        steps: 'Drop a heap of sand into an acid pool. The sand reaches the floor and stays there as a yellow mound, unchanged however long the acid washes over it.',
      },
      {
        title: 'Moat around a hut',
        steps: 'Surround a wooden hut with a ring of water and pour acid toward it. The leading edge of the acid fizzes into steam at the moat; only once the water is used up does the rest reach the wood and start eating it.',
      },
    ],
  },

  lava: {
    page: true,
    summary: 'Lava is a heavy, brightly glowing liquid that ignites fuel without cooling down, and turns to stone when water or ice reaches it.',
    body: [
      'At weight 6, lava is the heaviest liquid. It sinks through water, acid and oil, and it also outweighs the weight-5 powders, so sand, salt and gunpowder float on a lava surface while lava poured over a sand heap seeps down to its base. Like other liquids it spreads sideways into lighter cells and levels into a flat pool. It runs as freely as water here; real lava is vastly more viscous, and Sandlab ignores that.',
      'Its glow is the brightest of any liquid and spills onto surrounding cells, making it the main light source in a dark scene after fire.',
      'Lava is an igniter that is never consumed. Its table sets touching wood alight at 40 percent per check, plant at 60 percent and oil at 70 percent; in each case the neighbour becomes fire and the lava remains lava. Oil also carries its own lava entry at 80 percent, which is why an oil layer catches especially quickly. Gunpowder lights on contact as well.',
      'Cooling is the only thing that ends it. Water touching lava becomes steam while the lava hardens to stone, at 70 percent; ice melts into water while the lava again becomes stone, at 90 percent. Real volcanic islands and pillow basalt form through the same basic process, but the sandbox compresses it into one step with no gradual cooling, no cracking crust and no temperature value at all.',
      'Wall, stone and metal are unaffected by it, and acid has no entry for lava either.',
    ],
    tip: 'When lava threatens something, cool the leading edge with ice or water instead of building walls in its way. A stone skin forms where they meet and seals the flow behind it.',
    experiments: [
      {
        title: 'Build an island',
        steps: 'Fill a basin with water and pour lava in from above at one spot. Each blob hisses into steam where it meets the water and leaves stone behind; keep pouring and a rocky mound builds up out of the pool.',
      },
      {
        title: 'Lighting a row of fuels',
        steps: 'Along a stone shelf, set pockets of wood, plant and oil a few cells apart, then run lava down the shelf. The oil and plant catch almost at once, the wood takes a little longer, and the lava keeps flowing past all of them.',
      },
      {
        title: 'Seal a channel with ice',
        steps: 'Paint a short wall of ice across a lava channel. Lava pressing against it hardens into stone while the ice melts to water, and that water cools still more lava, so the channel ends up closed by a grey plug.',
      },
    ],
  },

  fire: {
    page: true,
    summary: 'Fire is a short-lived, brightly glowing gas that rises, spreads into fuel and then burns out on its own.',
    body: [
      'Fire has weight 1 and moves as a gas: it climbs through empty space, and anything heavier, from sand to water, drops straight through a flame. Each fire cell has a fixed lifetime of 45 ticks, and because the simulation advances once per screen refresh, an isolated flame is gone within about a second.',
      'It survives by spreading. The fire’s table turns touching wood into fire at 15 percent per check, plant at 30 percent and oil at 50 percent, and those fuels have matching entries of their own. Each ignition leaves the original flame burning and adds a new one, so a fire on a large fuel mass looks like a travelling front: freshly lit cells along the edge and empty space behind, where older flames have expired.',
      'Gunpowder is the fastest fuel of all, catching 85 percent of the time it meets a flame, which is why a powder trail burns end to end in a flash.',
      'Several materials put it out. Water turns both itself and the flame into steam at 90 percent. Ice melts on contact at 60 percent, turning the flame into steam and itself into water. Stone, metal, wall, sand, salt and ash have no reaction with fire and simply block it.',
      'Real fire is a chemical reaction that needs oxygen and gives off heat, smoke and ash. Sandlab’s fire behaves more like a contagious glowing particle: it needs no air, transfers no heat beyond its fixed contact rules and leaves nothing behind. Smoke and ash appear only where you paint them.',
    ],
    tip: 'To contain a blaze, take the fuel out of its path or put water in front of it. Flames only move upward on their own, so fuel stored below or beside a fire is in less danger than fuel above it.',
    experiments: [
      {
        title: 'Burnout',
        steps: 'Paint a dab of fire in an empty area. It drifts upward a short distance and fades within about a second, leaving nothing at all.',
      },
      {
        title: 'Fuel ladder',
        steps: 'Build a vertical stack with wood at the bottom, plant above it and a layer of gunpowder resting on the plant, then light the wood. The burn creeps through the wood, speeds up in the plant and tears through the gunpowder.',
      },
      {
        title: 'Water curtain',
        steps: 'Keep a steady stream of water falling between a fire and a wooden wall. Flames that drift into the stream turn into steam, and the wall survives for as long as the stream keeps running.',
      },
    ],
  },
}
