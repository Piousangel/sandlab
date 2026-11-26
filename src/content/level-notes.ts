/**
 * 레벨 화면(/play/<id>) 고유 노트 — 레벨마다 '목표 맥락·핵심 원리·막히는 지점'을 손으로 쓴다(틀 문장 금지, #112 2단계).
 * 주장은 공략(src/content/guides)과 같은 시뮬레이터 실측(2026-11-11)에서 온 것만 쓴다. 레벨 맵·par가 바뀌면 같이 확인한다.
 * 수치(par·목표량)는 적지 않는다 — 화면이 레벨 정의에서 직접 그린다. 새 레벨은 여기에 한 항목을 더한다(levelNoteFor가 없으면 절을 숨긴다).
 */
export interface LevelNote {
  /** 이 레벨에서 무엇을 이루려는지, 플레이어 눈에 보이는 장면으로 */
  setup: string
  /** 핵심 원리 한두 문장 */
  principle: string
  /** 막히는 지점 1~2개: 증상 → 원인 → 고치는 방향 */
  stuck: string[]
}

export const LEVEL_NOTES: Record<string, LevelNote> = {
  '1-1': {
    setup: 'A tank of water sits on a thin dirt floor far above a stone shelf, and the pot waits at the right end of that shelf. The only tool is a short Dig stroke.',
    principle: 'Nothing flows until you open a way down. Where the column lands on the shelf decides how much water runs toward the pot and how much runs away from it.',
    stuck: [
      'The level clears but the gem stays dry: your cut was too far to the right, so nothing flowed back toward the left end. Shift it one tile inward and run again.',
      'Your cut seems to do nothing: the stroke has to pass through the dirt floor itself, not through the water above it. Start it inside the dirt and drag straight down.',
    ],
  },
  '1-2': {
    setup: 'Water starts in the top-left corner. The pot is at the bottom of a deep shaft on the far right, and a staircase of stone ledges lies between them.',
    principle: 'Liquid always prefers to go downhill, so the steps act as a gutter that carries water sideways without any digging through stone.',
    stuck: [
      'You cut the far right column and the gem never fills: that is the fastest cut, and also the one that leaves the notch dry. Move the cut a single tile left.',
      'The run feels slow: water that lands on the left has to cross the whole tank on the steps. Open the dirt nearer the right end.',
    ],
  },
  '1-3': {
    setup: 'A wide basin sits above three dirt plugs, with one pot in each bottom corner and a closed gem cup under the middle plug.',
    principle: 'One opening makes one stream. A stone block keeps the two pots apart, so water that lands in one corner stays in that corner.',
    stuck: [
      'One pot is full and the other is bone dry: you opened only one outer plug. Look at the dry corner and open the plug above it.',
      'You opened all three plugs and the gem star appeared but par did not: the third dig costs a move. Take par and the gem on two separate runs; the stars add up.',
    ],
  },
  '1-4': {
    setup: 'A wide tray of sand rests on a dirt floor near the top, and a long pot spans the bottom of the board. The gem sits in the pot’s lower-left corner.',
    principle: 'Sand never spreads flat. It only moves down or diagonally down, so a pile forms a cone that can choke its own stream.',
    stuck: [
      'The sand stops pouring while the pot is half full: a single hole only drains a narrow wedge of the tray. Add a second cut with a wide gap between the two.',
      'You cleared without the gem: no hole was near the left wall of the tray, so no sand reached the far corner of the pot.',
    ],
  },
  '1-5': {
    setup: 'A tank sits on a yellow gate marked with a bolt. Beyond it a red-outlined skull pit lies in the path, a sand spout hangs over the pit, and a dirt column hides the way to the pot.',
    principle: 'This is the first level about timing. Let the spout turn the pit into flat floor, then release the water.',
    stuck: [
      'The run ends the instant the gate opens: water reached the skull pit before the sand did. Wait until the gate blinks, which means the pit is safe.',
      'The pit is sealed but the pot stays dry: the dirt column still blocks the water. One tile cut at its base is enough.',
    ],
  },
  '1-6': {
    setup: 'The water you need is locked in a sealed stone cup, with the pot past its right wall. A container of sand rests on a dirt strip above the cup.',
    principle: 'Heavy grains sink through water and push it out of their way. Enough sand on the cup floor lifts the water over the lower wall.',
    stuck: [
      'Nothing happens after a cut at the very edge of the strip: those columns never dropped sand into the cup. Keep your whole stroke over the cup.',
      'It clears but slowly: a one-tile slit lets sand out as a trickle. A stroke across most of the strip fills the cup much faster.',
    ],
  },
  '1-7': {
    setup: 'There is no digging here, only two gates: one releases a long stream of water toward the pot, the other drops sand onto a skull pit in the water’s path.',
    principle: 'When two things race, you choose who arrives first. The sand has to bury the pit before the water arrives.',
    stuck: [
      'The run ends immediately after you open the water gate: the water went first. Reset and open the sand gate first.',
      'Everything settles with the pot short: you waited too long after the sand. Open the water gate soon after it unlocks; pausing still lets you tap Trigger.',
    ],
  },
  '1-8': {
    setup: 'A gated tank high on the left feeds a staircase of five steps with three pots, a skull pit on one step with its own sand gate, and three gems under dirt lids.',
    principle: 'The whole first world in one board: open the route, protect the pit, and make the sand arrive first even though both gates open together.',
    stuck: [
      'Only the upper pots fill: one of the two dirt plugs is still closed. Both have to go before the water reaches the last pot.',
      'You dug out every gem and ended well over par: each lid costs a dig. Do one tidy run for par and one greedy run for gems.',
    ],
  },
  '1-9': {
    setup: 'A sealed water cup sits low, with a shorter wall on its right. A tray of sand lies on a dirt strip that stretches over both the cup and the pot.',
    principle: 'Sand lands where it falls. The strip looks the same everywhere, but only the half above the cup pushes the water up and over the lip.',
    stuck: [
      'The scene goes quiet with the pot empty: your cut started over the pot side, so the grains fell in the wrong place. Move the whole stroke over the cup.',
      'It clears, but late: a thin slit only lets a thread of sand through. Make the stroke as wide as the tool allows, and do not run it past the dividing wall.',
    ],
  },
  '1-10': {
    setup: 'One long tray of sand rests above two small sealed cups at opposite ends, each spilling toward its own pot. The middle of the tray sits over a plain wall.',
    principle: 'Each supply of sand can only raise the water under it, so a cup that matters needs a cut above it.',
    stuck: [
      'One pot fills and the level stalls: you cut over just one cup. Retry and put the missing cut over the other.',
      'Nothing fills at all: both strokes landed over the wall in the middle, where no water sits under the sand.',
    ],
  },
  '2-1': {
    setup: 'A wide tank of water rests on a stone floor with one short plug of pale planks in the middle, and a wide pot waits far below. You cannot dig; you get a single spark.',
    principle: 'Fire only reaches a few tiles. It has to start close beneath the planks, because it drifts upward and fades quickly.',
    stuck: [
      'The flame rises and vanishes and the run ends early: the spark started too far below the plug. Place it a tile or two under the middle of the planks.',
      'Nothing seems to happen for a couple of seconds after the spark lands: the planks burn slowly before they give way. That pause is the fire working, not a stall.',
    ],
  },
}

export function levelNoteFor(id: string): LevelNote | null {
  return LEVEL_NOTES[id] ?? null
}
