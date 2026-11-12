import type { LevelGuide } from '@/lib/spill/guide/types'

// 주장은 시뮬레이터로 확인한 것만 쓴다(2026-11-11, src/lib/spill/verify/evaluate로 레벨별 대안 수순 실행).
// 레벨 맵·par가 바뀌면 이 글도 다시 확인한다. 수치(par·목표량)는 페이지가 레벨 정의에서 직접 그린다.
const D = '2026-11-11'

export const W1_GUIDES: LevelGuide[] = [
  {
    id: '1-1',
    title: '1-1 First Drop guide: where to dig and how the gem gets wet',
    description: 'How the first Sandlab Spill level works: why a single dig is enough, where to cut so the water lands in the pot fast, and how the gem fills.',
    published: D,
    updated: D,
    lesson: 'Water only moves once you give it a way down, and where it lands decides everything after.',
    sections: [
      {
        heading: 'What you are looking at',
        paragraphs: [
          'First Drop is a tank of water resting on a thin floor of brown dirt, high above a long stone shelf. On the right end of that shelf sits the pot, a box with a dashed outline. On the far left end, a small pocket holds the gem. Nothing moves until you change the scene, because water cannot pass through dirt.',
          'You have one tool here, Dig. Drag a straight line through the dirt and those tiles vanish the moment you press Run. That opening is the whole puzzle: everything that happens afterwards is the simulation deciding where the water goes.',
        ],
      },
      {
        heading: 'Why the position of your cut matters',
        paragraphs: [
          'When the water drops through your hole it falls as a column, hits the shelf, and spreads sideways in both directions. Some of it races toward the pot, some of it runs the other way. A cut far to the left still clears the level, but the stream has to travel the full width of the shelf before the pot starts filling, so the clock runs long.',
          'Cut close to the right side of the tank and the falling column lands almost on top of the pot. In our tests this was the quickest finish by a clear margin. Surprisingly, the gem still gets collected, because the splash that spreads left along the shelf reaches the pocket before the level ends.',
          'Cut at the very last column on the right, though, and the water lands so far over that nothing travels back toward the gem. The level clears but the second star stays empty.',
        ],
      },
      {
        heading: 'Getting all three stars',
        paragraphs: [
          'This is the one level in the first world where a single run can earn everything: the clear, the gem and par. Par here asks for one move and a quick finish, so any extra dig costs you that star. Aim for a short vertical cut that sits over the pot but not over its outer wall.',
          'If you miss, press Retry. Your dig stays where you put it, so you can nudge it one tile and run again without redrawing anything.',
        ],
      },
    ],
    hints: ['One short dig is all this level needs.', 'Cut through the dirt above the pot, but stay one step in from the right-hand wall so some water still flows back left.'],
  },
  {
    id: '1-2',
    title: '1-2 Detour guide: letting water walk down the steps',
    description: 'Sandlab Spill 1-2 Detour explained: how water rides a staircase of ledges to a distant pot, and the one-tile choice that decides the gem star.',
    published: D,
    updated: D,
    lesson: 'Water follows the shape of the ground, so a staircase can carry it a long way sideways.',
    sections: [
      {
        heading: 'The layout',
        paragraphs: [
          'Detour puts the water in the top-left corner and the pot at the bottom of a deep shaft on the far right. Between them is a broad block of stone whose top edge drops in a series of steps, each a little lower than the last. Just below the tank, near the left wall, a small notch in the stone holds the gem.',
          'There is no straight path from tank to pot. The water has to land on the steps and travel right on its own, ledge by ledge, before it can fall into the shaft.',
        ],
      },
      {
        heading: 'How the water finds the pot',
        paragraphs: [
          'Liquid in Spill spreads sideways every tick, and on a slope it always prefers to go downhill. The descending ledges act like a gutter: once water reaches the first step it trickles to the next lower one, and the one after, until it pours off the final edge into the shaft. You do not need to build any of that. The staircase is already the route.',
          'What you control is the drop point. Opening the dirt at the eastern end of the basin puts the water directly onto the upper steps, which is the fastest finish we measured. Opening on the left drops it near the notch first, so the gem fills, but the water then has to cross the whole tank width on the steps and the run gets slower.',
        ],
      },
      {
        heading: 'The gem and par in one go',
        paragraphs: [
          'The very rightmost column of dirt is the fastest cut of all, and it is also the only common choice that misses the gem completely. Move the same cut one tile to the left and you lose almost no time, but enough water splashes back along the floor under the tank to reach the notch.',
          'That makes Detour a good place to practise small adjustments. Dig, run, watch where the first drops land, then retry with the cut shifted by a single tile. Your stars stay with you between attempts, so experiments are free.',
        ],
      },
    ],
    hints: ['You never need to dig through stone here. Let the ledges carry the water.', 'Open the dirt near the right end of the tank, then try moving your cut one tile left if the gem stays empty.'],
  },
  {
    id: '1-3',
    title: '1-3 Two Pots guide: splitting one tank into two streams',
    description: 'How to beat Sandlab Spill 1-3 Two Pots: feeding two pots from one tank, why the middle plug is a trap for par, and how to collect the gem.',
    published: D,
    updated: D,
    lesson: 'One opening makes one stream, so two targets need two openings.',
    sections: [
      {
        heading: 'Three plugs, two pots',
        paragraphs: [
          'A wide basin of water sits on a stone floor that has three small dirt plugs in it: one near the left wall, one near the right wall, and one in the middle. Far below, two pots wait in the bottom corners. Under the middle plug there is a short closed cup with the gem in it.',
          'Both pots must reach their fill line, and the level only clears when the second one latches. Filling one perfectly and the other halfway counts for nothing.',
        ],
      },
      {
        heading: 'Why a single hole fails',
        paragraphs: [
          'It is tempting to open just one side and hope the water will find its way to the other pot. It will not. A stream that falls into the left corner spreads across the bottom of that corner and stays there, because a solid stone block separates the two pots. In our runs, a lone left-side cut filled one pot and then stalled with the other completely dry.',
          'The answer is to treat the basin as two taps. Dig through the left plug and the right plug, and each pot gets a stream of its own. Because both streams start at the same moment, both pots fill side by side and latch close together.',
        ],
      },
      {
        heading: 'The middle plug is for the gem',
        paragraphs: [
          'Opening the middle plug drains water into the little cup and lights up the gem. It does not slow the pots noticeably, but it costs a third move, and par for this level allows only two. That means no single run can earn all three stars here.',
          'This is by design. Stars in Spill accumulate across attempts: clear it once with the two outer cuts for par, then retry with all three plugs opened to pick up the gem star. Both results are saved to the level.',
          'Two Pots is also the first level where the solver rejects most random guesses. Out of every pair of cuts we simulated, only a small fraction cleared, almost all of them some version of one plug per wall. If your run stalls with one pot full, look at which corner stayed dry and move a cut toward it.',
        ],
      },
    ],
    hints: ['Each pot needs its own stream of water.', 'Open the plugs nearest each wall for par. Open the centre plug on a separate run if you want the gem.'],
  },
  {
    id: '1-4',
    title: '1-4 Hourglass guide: why sand needs more than one hole',
    description: 'Sandlab Spill 1-4 Hourglass explained: sand piles into cones that block a single hole, so how many openings you need and where to put them.',
    published: D,
    updated: D,
    lesson: 'Sand does not level out like water. It stacks into a cone, and a cone can block its own exit.',
    sections: [
      {
        heading: 'A tray of sand over a long pot',
        paragraphs: [
          'Hourglass replaces water with sand. A wide tray of sand rests on a dirt floor near the top of the scene, and the pot stretches across almost the entire bottom. The gem sits in the lower-left corner of that pot. It looks like the easiest target so far, since the pot is right underneath and there is nothing in the way.',
          'Try one hole in the middle and you will see why it is not. The sand pours out, builds a heap in the pot, and soon the heap grows tall enough that the stream stops before the pot has enough.',
        ],
      },
      {
        heading: 'How falling sand behaves',
        paragraphs: [
          'Grains of sand only ever move down, or diagonally down if the cell straight below is taken. They never slide sideways on a flat surface. So instead of spreading into a layer, the sand builds a cone directly under the hole. In the tray above, the same thing happens in reverse: only the grains close to the opening can reach it, and the rest stay stuck on the dirt.',
          'A single opening therefore drains only a narrow wedge of the tray. That is the whole point of the level. Our simulator tried every single cut and none of them cleared.',
        ],
      },
      {
        heading: 'Placing two openings',
        paragraphs: [
          'Two cuts spaced apart drain two separate wedges and build two cones, which together put enough sand in the pot. Spacing them roughly a third of the way in from each side worked well in testing, and leaving a gap between them matters more than their exact position.',
          'The gem is a different problem. It only fills when sand reaches the far corner of the pot, which means one of your holes must sit near the left wall of the tray. A pair with one hole at the left edge and one well to the right can clear with the gem, but the sand takes longer to collect and misses the par time. Take the gem and par on separate runs.',
        ],
      },
    ],
    hints: ['One hole will never be enough. Watch how the sand piles up under it.', 'Make two cuts with plenty of space between them. For the gem, put one of them right against the left side of the tray.'],
  },
  {
    id: '1-5',
    title: '1-5 Gatekeeper guide: letting sand seal the skull pit first',
    description: 'Beat Sandlab Spill 1-5 Gatekeeper: why the skull pit fails the level, how falling sand plugs it, and when to open the gate.',
    published: D,
    updated: D,
    lesson: 'Some moves are about when, not where. Wait for the scene to make itself safe, then act.',
    sections: [
      {
        heading: 'The first gate and the first danger',
        paragraphs: [
          'Gatekeeper introduces two new things. The water tank has a yellow gate for a floor, marked with a lightning bolt, and you open it with Trigger by tapping it while the scene runs. There is also a skull pit, a small hole outlined in red. If enough water lands in it, the run fails on the spot.',
          'The skull sits directly between the tank and the pot. On its far side a thin column of dirt blocks the way to the pot. Above the skull, a spout drips sand once the scene starts.',
        ],
      },
      {
        heading: 'Why waiting wins',
        paragraphs: [
          'Open the gate immediately and the water rushes across the floor and pours into the skull pit. The fix is already in the level: the sand spout is aimed straight at the pit. Give it a moment and the sand fills the pit to the brim, turning it into flat floor that water can run over.',
          'The gate cannot be opened right away anyway. It stays dim until the sand has had time to do its job, then starts to blink. That blinking period is your window. Any tap inside it worked in our runs, but an early tap reaches the pot sooner, so the par star rewards opening as soon as the gate lights up.',
        ],
      },
      {
        heading: 'Do not forget the dirt',
        paragraphs: [
          'Even with the skull sealed, the water stops at the column of dirt and never reaches the pot. You have to dig through it during setup. The good news is that you do not need to remove the whole column. A one-tile cut at its very base was enough for the water to pass, and it still counts as one move.',
          'So the plan is two moves: a dig before you press Run, and a single well-timed tap on the gate.',
        ],
      },
    ],
    hints: ['The sand spout is there to help you. Let it finish before the water moves.', 'Dig through the bottom of the dirt column, press Run, and tap the gate as soon as it starts blinking.'],
  },
  {
    id: '1-6',
    title: '1-6 Displacement guide: using sand to push water uphill',
    description: 'Sandlab Spill 1-6 Displacement explained: how heavy sand sinks through water and forces it over a wall into the pot, and why a wider cut is faster.',
    published: D,
    updated: D,
    lesson: 'Heavier materials sink through lighter ones, and whatever they replace has to go somewhere.',
    sections: [
      {
        heading: 'Water you cannot reach',
        paragraphs: [
          'Displacement looks unsolvable at first. The water you need sits at the bottom of a sealed stone cup, and the pot is on the other side of that cup’s right wall. Above the cup hangs a container of sand resting on a strip of dirt. You cannot dig stone, and there is no gate.',
          'The trick is the title. You are not going to move the water directly. You are going to drop something heavier on it.',
        ],
      },
      {
        heading: 'Density does the work',
        paragraphs: [
          'Every material in the simulation has a weight. When a heavy grain sits on top of a lighter liquid, the two swap places, so sand sinks through water and the water ends up on top. Pour enough sand into the cup and it settles on the bottom, lifting the water higher and higher until it spills over the lower right-hand wall and drops into the pot.',
          'The cup’s left wall is taller than its right one, which is why the overflow goes the right way. The materials guide on this site covers the same rule in the free-play sandbox, where you can watch sand and water trade places as long as you like.',
        ],
      },
      {
        heading: 'Wide cut, fast finish',
        paragraphs: [
          'Almost any cut through the dirt strip eventually clears this level, so the real question is speed. A narrow one-tile opening lets the sand out as a thin trickle, and the water rises slowly. A cut that spans most of the strip dumps the sand in quickly and gets you under par.',
          'Be careful at the very edges of the strip, though. Cuts that hug the outer walls of the sand container did not drop sand into the cup at all in our tests, and the level stalled. Keep your line over the cup.',
          'It helps to watch one slow run on purpose. Make a single narrow cut, press Run, and follow a few grains as they sink to the floor of the cup while the blue layer climbs above them. Seeing the swap happen in slow motion makes the idea stick, and the same principle returns in later worlds with heavier and lighter materials than these two.',
        ],
      },
    ],
    hints: ['Sand is heavier than water.', 'Dig a wide horizontal line through the dirt strip, directly above the water cup.'],
  },
  {
    id: '1-7',
    title: '1-7 Two Taps guide: getting the order right',
    description: 'How to clear Sandlab Spill 1-7 Two Taps: two gates, a sand spout and a water spout, why the order matters and how long to wait between taps.',
    published: D,
    updated: D,
    lesson: 'When two things race, decide which one should arrive first.',
    sections: [
      {
        heading: 'No digging this time',
        paragraphs: [
          'Two Taps takes Dig away. All you have are two gates, each holding back a spout. On the left, a gate releases a long stream of water that will run along the floor toward the pot on the right. Near the middle, a second gate releases sand that falls straight down onto a skull pit sitting in the water’s path.',
          'Your only decisions are which gate to open first and how long to wait before opening the other.',
        ],
      },
      {
        heading: 'Order of operations',
        paragraphs: [
          'Release the water first and it reaches the skull pit long before any sand arrives, and the run fails almost instantly. That happened in every water-first attempt we tried. Release the sand first and it buries the pit, so when the water comes along it rolls straight over the filled hole and down into the pot.',
          'Once the sand gate is open, the water gate unlocks after a short delay. You do not have to wait long. In testing, opening the water gate shortly after the sand gave the quickest clears, comfortably under par.',
        ],
      },
      {
        heading: 'Do not wait too long either',
        paragraphs: [
          'There is a ceiling on patience. If you leave the water gate closed for a long time after the sand is done, the level decides nothing more is happening and calls it a stall. A gap of a couple of breaths is plenty.',
          'If you find timing under pressure awkward, use the pause button. Trigger still works while the scene is paused, so you can freeze the action, look at how full the pit is, and tap exactly when you are ready.',
        ],
      },
      {
        heading: 'Reading a failed run',
        paragraphs: [
          'Spill tells you why a run ended, and on this level there are only two answers. “It reached the skull pot” means water got into the pit before the sand had filled it, so the sand needs a head start. “Everything settled” means the scene went quiet with the pot still short, usually because the water gate stayed shut too long, so open it sooner. Either way, Retry puts you back at the start with nothing to rebuild, because there was nothing to dig in the first place.',
          'Roughly half of all the timing pairs we simulated cleared, which makes this one of the friendlier levels once the order clicks.',
        ],
      },
    ],
    hints: ['One of the two spouts makes the skull pit safe.', 'Open the sand gate first, then open the water gate as soon as it unlocks.'],
  },
  {
    id: '1-8',
    title: '1-8 Cascade guide: three pots, two gates and a race',
    description: 'Sandlab Spill 1-8 Cascade walkthrough: filling three stepped pots, sealing the skull pit in time, and why the gem star and par star need separate runs.',
    published: D,
    updated: D,
    lesson: 'Everything from the first world at once: open a path, protect a hazard, and win a race.',
    sections: [
      {
        heading: 'A staircase of pots',
        paragraphs: [
          'Cascade is the finale of the first world. A tall water tank stands in the upper left, closed by a gate. Below and to the right, the ground falls away in five broad steps, and three of those steps hold pots that all have to be filled. Partway down, a skull pit waits on one step, with a gated sand spout hanging above it. Three gems sit in small pockets under thin dirt lids.',
          'You have both tools: Dig during setup, and Trigger for the two gates during the run.',
        ],
      },
      {
        heading: 'Opening the route',
        paragraphs: [
          'Two short dirt plugs stand between the tank and the bottom pot. One sits under the wall right next to the tank, and the other blocks a passage further down the steps. Open only one of them and the water fills what it can, then stalls. Both have to go before the cascade can run all the way to the last pot.',
          'The upper pots fill on their own as the water spills over each step, which is where the level gets its name.',
        ],
      },
      {
        heading: 'It is a race, not a strict order',
        paragraphs: [
          'The hint says to plug the pit first, but what really matters is arrival time. The sand has a short drop to the skull while the water has a long way to travel, so sand released at the same moment as the water still gets there first. In our tests, opening both gates together produced the fastest clears of all. Releasing the water and then waiting a long time to free the sand failed every time.',
        ],
      },
      {
        heading: 'Gems versus par',
        paragraphs: [
          'Each gem is buried under its own dirt lid, so collecting all three costs three extra digs on top of the four moves the route needs. That run clears, but well over par. As with the earlier levels, the stars you earn on different attempts add up, so do one tidy run for par and one greedy run that digs out every lid for the gems.',
        ],
      },
    ],
    hints: ['Two dirt plugs block the route, and the sand gate protects the skull.', 'Dig both plugs, then open both gates early. The sand only has to reach the skull before the water does.'],
  },
  {
    id: '1-9',
    title: '1-9 Overflow guide: why the cut belongs over the cup, not the pot',
    description: 'Sandlab Spill 1-9 Overflow explained: the same sand-and-water swap as 1-6, but a wide container and a tempting cut that never clears.',
    published: D,
    updated: D,
    lesson: 'Dropped material lands where it falls, so an opening that looks harmless can fill the very place you need empty.',
    sections: [
      {
        heading: 'The same trick with a bigger trap',
        paragraphs: [
          'Overflow reuses the idea from Displacement. A sealed cup of water sits low in the scene, a wall on its right is shorter than the one on its left, and a tray of sand rests above on a thin dirt strip. Sand sinks, water climbs, and the surplus spills toward the pot. What changed is the tray. It is now wide enough to stretch over the pot as well as over the cup, and that is the whole difficulty.',
          'Nothing tells you which part of the strip to open. Both halves of it look identical, and the dig tool will happily cut either one.',
        ],
      },
      {
        heading: 'What happens when you open the wrong half',
        paragraphs: [
          'We ran a long list of single cuts across the strip. Every cut that started more than a tile or two beyond the dividing wall failed, without exception, and the level simply stalled. The grains fall somewhere other than the cup, so the water never gets pushed up and over the lip, and the pot is left waiting.',
          'Cuts that started above the cup cleared, which tells you the real rule: you are not digging toward the goal, you are digging above the supply. Think about where the grains will land, not where the water should end up.',
        ],
      },
      {
        heading: 'Speed comes from width',
        paragraphs: [
          'Being right about the side only earns the clear. The clock depends on how fast sand enters the cup. A one-tile slit worked, but our slowest slits took more than twenty seconds because only a thin thread of grains fell. A cut that fills most of the cup’s width finished in about six, which is comfortably inside the time for the top star.',
          'Do not stretch a long cut past the dividing wall, either. In our runs a cut that ran across it took about twice as long as one of the same length that stayed over the cup. Keep the whole stroke over the cup and make it as wide as the tool allows.',
          'If you are stuck, run one deliberately narrow cut and watch where the first grains land. Seeing the pile grow in the wrong place teaches more than reading about it.',
        ],
      },
    ],
    hints: ['Look at where the sand will land, not where the water must go.', 'Make the widest cut you can, entirely over the water cup and clear of the pot side.'],
  },
]
