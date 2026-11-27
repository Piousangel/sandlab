import type { LevelGuide } from '@/lib/spill/guide/types'

// 주장은 시뮬레이터로 확인한 것만 쓴다(2026-11-18, 마개 주변 99칸 전수 스캔·verifyLevel).
// 레벨 맵·par가 바뀌면 이 글도 다시 확인한다. 수치(par·목표량)는 페이지가 레벨 정의에서 직접 그린다.
const D = '2026-11-18'
const D2 = '2026-11-26' // 2-2: 불꽃 276칸 전수·도화선 행별·불꽃 위치별 실측(evaluate)
const D3 = '2026-11-27' // 2-3: 구덩이 수평 판자 293개 전수(행·길이별 시간)·기울기·짧은 판자 실측(evaluate)

export const W2_GUIDES: LevelGuide[] = [
  {
    id: '2-1',
    title: '2-1 Wooden Door guide: where a single spark actually reaches',
    description: 'Sandlab Spill 2-1 Wooden Door explained: why fire only works close to the wood, which spots light the plank plug, and why a spark too low fizzles out.',
    published: D,
    updated: D,
    lesson: 'A spark climbs a few tiles and dies, so fire has to start right under the thing you want to burn.',
    sections: [
      {
        heading: 'A tank with a wooden floor',
        paragraphs: [
          'Wooden Door opens the second world, and it swaps the shovel for a new tool. A wide tank of water sits high in the board. Its floor is solid stone except for one short plug of pale planks in the middle. Far below, a wide pot waits for the water. You cannot dig anything here, and you get a single spark to place on an empty spot.',
          'Planks hold water back just like stone does, but unlike stone they burn. Once the plug is gone the tank drains straight down into the pot. The whole puzzle is getting the plug to catch fire.',
        ],
      },
      {
        heading: 'How far a spark really goes',
        paragraphs: [
          'A spark does not sit where you drop it. It drifts upward and fades after a fraction of a second. We tested every empty spot around the plug, ninety-nine in all. A spark placed right beneath the planks lit them. One placed further down rose a few tiles and faded before it touched anything.',
          'The reach is roughly six tiles straight up, and it narrows to the sides, like a fan opening toward the plug. Beyond seven tiles below the plug, every try failed. Spots to the left or right of the plug’s width failed too, because the flame had nothing to touch.',
          'Spots above the plug are not an option at all. That is water, and you cannot place a spark inside it.',
        ],
      },
      {
        heading: 'Slow burn, and why closer is faster',
        paragraphs: [
          'Planks do not vanish when they ignite. For about two seconds the plug looks barely different, and then the first pieces drop away and water starts to pour. If you are used to the instant results of digging, this pause feels like nothing is happening. It is the fire working.',
          'Distance changes the clock. A spark right under the middle of the plug finished in about four and a half seconds. One at the edge of the fan took a little under six. All the good spots clear the level, but only the closest ones keep the par time.',
        ],
      },
      {
        heading: 'What a failed run looks like',
        paragraphs: [
          'Place the spark too low and the flame rises, shrinks and disappears. After that nothing moves, and the run ends about a second and a half in with the pot still dry. Doing nothing at all ends the same way.',
          'If that happens, retry and move the spark up toward the planks. Aim for the middle of the plug, only a tile or two beneath it, and the wood will take the fire.',
        ],
      },
    ],
    hints: ['Fire climbs, so think about where it starts, not where it should end.', 'Place the spark in the empty space just under the middle of the wooden plug.'],
  },
  {
    id: '2-2',
    title: '2-2 Fuse guide: one spark, two plank doors, and a fuse between them',
    description: 'Sandlab Spill 2-2 Fuse solved: lay one fuse that touches both wooden doors, then light it with your single spark. Why a spark alone never works.',
    published: D2,
    updated: D2,
    lesson: 'A spark only climbs, but a fuse passes flame sideways, so one lit line can open two doors at once.',
    sections: [
      {
        heading: 'The short answer',
        paragraphs: [
          'Draw your fuse straight across the low passage so it runs under both wooden doors, then put the spark just beneath the middle of that fuse. The flame races along the cord in both directions, both plank plugs catch, and each tank empties into its own pot. That is the whole solution, and the rest of this page explains why nothing simpler works.',
          'Fuse is the second level of world two. Two sealed tanks of water sit side by side, split by a thick stone block. Each tank has a pale wooden plug in its floor. Under them is a narrow corridor, three rows tall, and below each plug a shaft drops down to a pot. You hold two tools this time: one spark and one fuse line.',
        ],
      },
      {
        heading: 'Why a lone spark always fails',
        paragraphs: [
          'Wooden Door taught that flame drifts upward and dies quickly. Here that rule works against you. The two plugs are eight tiles apart with solid rock between them, so whatever you light below one door never reaches the other. We dropped the spark on every one of the 276 open spots in this map without a fuse. Not one of those runs cleared.',
          'The closest you can get is lighting a single door. The pot under it fills, the other stays empty, and after roughly ten seconds of nothing changing the attempt is marked as stuck. If you see one full pot and one dry pot, your fire took the wrong road, not the wrong spot.',
        ],
      },
      {
        heading: 'Laying the fuse',
        paragraphs: [
          'The fuse is a dark red cord you drag across empty space, in a straight or diagonal line. It has to pass through open air only, so it lives in the corridor. What matters is that it spans from one plug to the other. In our tests the top row, the middle row and the bottom row of the corridor all worked, with clear times between 4.35 and 4.48 seconds.',
          'A cord that only just reaches the corner of each plug still clears, a little slower at about 4.6 seconds, because the flame touches less wood. Stretching it fully under both doors is the safer choice. A cord that stops at one door is the classic mistake: it burns nicely, and still leaves half the board dry.',
          'Lay the fuse before the spark. The spark occupies a square, and a fuse cannot be drawn through a square that is already taken.',
        ],
      },
      {
        heading: 'Where to put the spark',
        paragraphs: [
          'The spark only needs to touch the cord. Centred under the fuse it gave the best time we found, 4.35 seconds, because the fire splits and reaches both doors together. Placed at one end, under a door, it took about 4.65 seconds, since the far plug waits for the flame to cross. A spark high in a shaft worked too, near 4.8 seconds.',
          'Deep in a shaft is too far. That spark faded before it met the fuse, and the run stopped after a second and a half with both pots empty. Laying the cord without any spark gives the identical result, because the fuse never lights itself.',
        ],
      },
    ],
    hints: ['Fire needs a road between the two doors.', 'Stretch the fuse under both plugs, then put the spark right against the cord.'],
  },
  {
    id: '2-3',
    title: '2-3 Plank Bridge guide: lay one plank across the pit, high and level',
    description: 'Sandlab Spill 2-3 Plank Bridge solved: span the whole pit with one level plank just under the ledge. Why slopes, short planks and deep bridges fail.',
    published: D3,
    updated: D3,
    lesson: 'Planks are solid ground before they are fuel: a level plank that spans a gap carries water like stone would.',
    sections: [
      {
        heading: 'Quick solution',
        paragraphs: [
          'Drag your single plank flat across the full width of the pit, one row below the top of the left ledge, touching stone on both sides. Water rolls off the ledge, runs over your bridge, drops onto the lower right shelf and pours into the pot. Our fastest run finished in 3.8 seconds this way. Nothing burns in this level; there is no spark at all.',
          'Plank Bridge is the third stage of world two. A wide pool rests on a ledge at the upper left. Where the ledge stops, a pit eight tiles wide falls away into the dark. On the far side, a little lower than the ledge, a stone shelf holds a deep pot. Without help the pool simply empties down the hole and the run is called stuck after about twelve seconds.',
        ],
      },
      {
        heading: 'Wall to wall, or it leaks',
        paragraphs: [
          'The plank must close the gap completely. We tried every flat plank inside the pit, 293 placements of different lengths and heights, and only 18 of them cleared. Every winner began at the lip of the ledge and ended against the far side. Begin one column too far right and a thin stream slips through the crack beside the stone, the bridge stays dry, and so does the pot.',
          'Slopes are a trap too. A plank drawn at forty five degrees, either rising or falling, is built from stepped squares, and water finds the corners between them. Both slanted bridges we measured lost everything into the pit.',
        ],
      },
      {
        heading: 'Height decides the clock',
        paragraphs: [
          'Any level, full width plank from the ledge row down to roughly nine rows below it will clear, but the time changes a lot. Lower bridges turn the pit into a basin that has to fill before water can spill over the far lip. One row under the ledge took about four seconds. Five rows deeper took near seven, and the deepest working row needed over nine.',
          'Go one row further and the pool runs out before the basin is full. The water just sits on your plank and the run stalls.',
          'Placed exactly level with the ledge top, the bridge works but is slower than one row lower, close to six seconds, because water piles at the joint before it moves on.',
        ],
      },
      {
        heading: 'Chasing the par time',
        paragraphs: [
          'Par for this stage is one move. For the full score you also need to beat the par time, and only the top two working rows do it. Stretching the plank one or two squares past the pit onto the far shelf shaves a little more, since water lands further along and slides straight down. If your bridge clears but feels sluggish, raise it a row and run it again.',
        ],
      },
    ],
    hints: ['Water needs a floor where the ledge ends.', 'Lay the plank flat from wall to wall, just below the height of the ledge.'],
  },
]
