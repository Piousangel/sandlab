import type { LevelGuide } from '@/lib/spill/guide/types'

// 주장은 시뮬레이터로 확인한 것만 쓴다(2026-11-18, 마개 주변 99칸 전수 스캔·verifyLevel).
// 레벨 맵·par가 바뀌면 이 글도 다시 확인한다. 수치(par·목표량)는 페이지가 레벨 정의에서 직접 그린다.
const D = '2026-11-18'

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
]
