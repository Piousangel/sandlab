// 레벨 해 공간 탐색 — 공략·레벨 디자인 근거용. 1수~par수 조합을 전수(상한 넘으면 샘플)로 돌려
// 클리어율·par 달성·젬 루트·실패 사유 분포를 찍는다. 실행: CAP=400 npx tsx scripts/spill-explore.mts [레벨id]
const R = new URL('../src/lib/spill', import.meta.url).pathname
const { LEVELS } = await import(`${R}/levels/index.ts`)
const { parseLevel } = await import(`${R}/level/parse.ts`)
const { evaluate } = await import(`${R}/verify/evaluate.ts`)
const { allCandidates } = await import(`${R}/verify/candidates.ts`)
const { combos, sampleCombos, comboCount } = await import(`${R}/verify/space.ts`)

const only = process.argv[2]
const fmt = (acts: any[]) => acts.map((a) => (a.verb === 'trigger' ? `trig ${a.arg}@${a.tick}` : `${a.verb} (${a.tx},${a.ty})→(${a.tx2},${a.ty2})`)).join(' + ')

for (const def of LEVELS as any[]) {
  if (only && def.id !== only) continue
  const p = parseLevel(def)
  const cands = allCandidates(p, 10, 400)
  const kmax = def.par.moves; const CAP = Number(process.env.CAP ?? 300)
  const reasons: Record<string, number> = {}
  const wins: { acts: any[]; o: any }[] = []
  let total = 0
  for (let k = 1; k <= kmax; k++) {
    const n = comboCount(cands, k)
    const it = n <= CAP ? combos(cands, k) : sampleCombos(cands, k, CAP, 7)
    for (const c of it) {
      const acts = c.map((x: any) => x.action)
      const o = evaluate(p, acts)
      if (!o.legal) continue
      total++
      if (o.cleared) wins.push({ acts, o })
      else reasons[o.reason ?? 'none'] = (reasons[o.reason ?? 'none'] ?? 0) + 1
    }
  }
  const parT = Math.round(def.par.secs * 60)
  const best = [...wins].sort((a, b) => a.o.moves - b.o.moves || a.o.ticks - b.o.ticks)
  const gemWins = wins.filter((w) => w.o.gemTotal > 0 && w.o.gems === w.o.gemTotal).sort((a, b) => a.o.moves - b.o.moves || a.o.ticks - b.o.ticks)
  const parWins = wins.filter((w) => w.o.moves <= def.par.moves && w.o.ticks <= parT)
  const threeStar = gemWins.filter((w) => w.o.moves <= def.par.moves && w.o.ticks <= parT)
  console.log(`\n## ${def.id} ${def.name}  par ${def.par.moves}수/${def.par.secs}s  후보 ${cands.length}, 평가 ${total}`)
  console.log(`클리어 ${wins.length} (${((wins.length / total) * 100).toFixed(1)}%) · par 달성 ${parWins.length} · 젬 전부 ${gemWins.length} · 3별 ${threeStar.length}`)
  console.log(`실패 사유:`, reasons)
  for (const w of best.slice(0, 4)) console.log(`  최선 ${w.o.moves}수 ${(w.o.ticks / 60).toFixed(1)}s 젬${w.o.gems}/${w.o.gemTotal}: ${fmt(w.acts)}`)
  for (const w of gemWins.slice(0, 3)) console.log(`  젬루트 ${w.o.moves}수 ${(w.o.ticks / 60).toFixed(1)}s: ${fmt(w.acts)}`)
}
