/**
 * 목표 문장 한 줄 — 같은 문장이 여러 번이면(항아리 2개) 한 번으로 묶는다. 수치 스포일러(par·별·보석) 없음.
 * 순수 함수라 따로 둔다(P12 LCP): 홈 오늘 카드가 DailyStart.tsx에서 가져오면 시작 화면·HUD·지층 병 모듈이 홈 첫 화면 JS에 딸려 왔다.
 */
export function goalLine(goals: string[]): string {
  const counts = new Map<string, number>()
  for (const g of goals) counts.set(g, (counts.get(g) ?? 0) + 1)
  return [...counts]
    .map(([g, k]) => (k === 1 ? g : g.startsWith('Fill the pot ') ? g.replace('Fill the pot ', `Fill each of the ${k} pots `) : `${g} (${k} times)`))
    .join('. ') + '.'
}
