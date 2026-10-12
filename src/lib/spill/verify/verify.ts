import type { LevelDef } from '../level/define'
import { parseLevel, type ParsedLevel } from '../level/parse'
import { devActions, type PlayAction } from '../play/attempt'
import { parSecsFromBest, parTicks } from '../play/score'
import { allCandidates, shiftAction, type Candidate } from './candidates'
import { evaluate, type Outcome } from './evaluate'
import { comboCount, combos, sampleCombos } from './space'

export const CHECK_IDS = [
  'dev-clears', 'dev-12s', 'par', 'idle-fails', 'salts-16', 'trigger-jitter', 'neighbor-60', 'timing-window', 'solver', 'par1-slow', 'gem-bypass',
] as const
export type CheckId = (typeof CHECK_IDS)[number]

export const DEV_MAX_TICKS = 720
export const SALT_COUNT = 16
export const JITTER_TICKS = 10
export const NEIGHBOR_MIN = 0.6
export const WINDOW_MIN_TICKS = 42
export const SOLVER_LIMIT = 5000

export interface CheckResult {
  id: CheckId
  pass: boolean
  detail: string
}

export interface Job {
  actions: PlayAction[]
  salt?: number
}

export type BatchRunner = (level: LevelDef, jobs: Job[]) => Promise<Outcome[]>

export interface VerifyOptions {
  solverLimit?: number
  triggerStep?: number
  triggerMax?: number
  windowRange?: number
  seed?: number
}

export interface VerifyReport {
  id: string
  name: string
  pass: boolean
  checks: CheckResult[]
  warnings: string[]
  devTicks: number | null
  bestTicks: number | null
  suggestedParSecs: number | null
  sims: number
}

export function saltsFor(salt: number): number[] {
  const out: number[] = []
  let k = 1
  while (out.length < SALT_COUNT) {
    const s = (salt + Math.imul(k, 0x9e37)) & 0xffff
    if (s !== salt && !out.includes(s)) out.push(s)
    k++
  }
  return out
}

export interface LocalRunnerOptions {
  onProgress?: (done: number, total: number) => void
  yieldEvery?: number
}

export function localRunner(opts: LocalRunnerOptions = {}): BatchRunner {
  const cache = new WeakMap<LevelDef, ParsedLevel>()
  let done = 0
  let total = 0
  return async (def, jobs) => {
    let p = cache.get(def)
    if (!p) { p = parseLevel(def); cache.set(def, p) }
    total += jobs.length
    const out: Outcome[] = []
    for (const j of jobs) {
      out.push(evaluate(p, j.actions, j.salt))
      done++
      if (opts.yieldEvery && done % opts.yieldEvery === 0) {
        opts.onProgress?.(done, total)
        await new Promise((r) => setTimeout(r, 0))
      }
    }
    opts.onProgress?.(done, total)
    return out
  }
}

const secs = (t: number) => `${(t / 60).toFixed(2)}s`
const fmtAction = (a: PlayAction) => (a.verb === 'trigger' ? `trigger ${a.arg}@${a.tick}` : `${a.verb} ${a.tx},${a.ty}→${a.tx2},${a.ty2}`)
const fmtActions = (as: readonly PlayAction[]) => as.map(fmtAction).join(' + ')
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

interface Known {
  actions: PlayAction[]
  o: Outcome
}

export async function verifyLevel(def: LevelDef, run: BatchRunner, opts: VerifyOptions = {}): Promise<VerifyReport> {
  const limit = opts.solverLimit ?? SOLVER_LIMIT
  const step = opts.triggerStep ?? 6
  const tmax = opts.triggerMax ?? DEV_MAX_TICKS
  const range = opts.windowRange ?? 90
  const seed = opts.seed ?? def.salt
  const level = parseLevel(def)
  const dev = devActions(level)
  const par = def.par
  const parMoves = par?.moves ?? dev.length
  const checks = new Map<CheckId, CheckResult>()
  const warnings: string[] = []
  const known: Known[] = []
  let sims = 0
  const set = (id: CheckId, pass: boolean, detail: string) => checks.set(id, { id, pass, detail })
  const batch = async (jobs: Job[]) => {
    sims += jobs.length
    return jobs.length ? run(def, jobs) : []
  }
  const remember = (actions: PlayAction[], o: Outcome) => { if (o.cleared) known.push({ actions, o }) }

  const [devO, idleO] = await batch([{ actions: dev }, { actions: [] }])
  const devOk = devO.legal && devO.cleared
  if (devOk) remember(dev, devO)
  set('dev-clears', devOk, devOk ? `clears in ${secs(devO.ticks)} with ${plural(devO.moves, 'move')}, gems ${devO.gems}/${devO.gemTotal}` : `dev solution ${devO.legal ? `fails (${devO.reason})` : 'has an illegal action'}`)
  set('dev-12s', devOk && devO.ticks <= DEV_MAX_TICKS, devOk ? `${devO.ticks} ticks (${secs(devO.ticks)}) ≤ ${DEV_MAX_TICKS}` : 'dev solution does not clear')
  set('idle-fails', !idleO.cleared, idleO.cleared ? `doing nothing clears in ${secs(idleO.ticks)}` : `idle fails (${idleO.reason}) at ${secs(idleO.ticks)}`)

  const triggers = dev.map((a, i) => ({ a, i })).filter((x) => x.a.verb === 'trigger')
  const placed = dev.map((a, i) => ({ a, i })).filter((x) => x.a.verb !== 'trigger')

  if (!devOk) {
    for (const id of ['salts-16', 'trigger-jitter', 'neighbor-60', 'timing-window', 'par1-slow', 'gem-bypass', 'par'] as const)
      set(id, false, 'skipped: dev solution does not clear')
  } else {
    const salts = saltsFor(level.def.salt)
    const shifts: { i: number; actions: PlayAction[] }[] = []
    for (const { a, i } of placed)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          shifts.push({ i, actions: dev.map((b, k) => (k === i ? shiftAction(b, dx, dy) : b)) })
        }
    const scans: { i: number; tick: number; actions: PlayAction[] }[] = []
    for (const { a, i } of triggers)
      for (let t = Math.max(0, a.tick - range); t <= a.tick + range; t++)
        if (t !== a.tick) scans.push({ i, tick: t, actions: dev.map((b, k) => (k === i ? { ...b, tick: t } : b)) })
    const res = await batch([
      ...salts.map((s) => ({ actions: dev, salt: s })),
      ...shifts.map((s) => ({ actions: s.actions })),
      ...scans.map((s) => ({ actions: s.actions })),
    ])
    const saltO = res.slice(0, salts.length)
    const shiftO = res.slice(salts.length, salts.length + shifts.length)
    const scanO = res.slice(salts.length + shifts.length)
    shifts.forEach((s, k) => remember(s.actions, shiftO[k]))
    scans.forEach((s, k) => remember(s.actions, scanO[k]))

    const saltFails = salts.filter((_, k) => !saltO[k].cleared)
    const slowest = Math.max(...saltO.map((o) => (o.cleared ? o.ticks : 0)))
    set('salts-16', saltFails.length === 0, saltFails.length === 0 ? `16/16 salts clear (slowest ${secs(slowest)})` : `${16 - saltFails.length}/16 salts clear; fails: ${saltFails.map((s) => '0x' + s.toString(16)).join(', ')}`)

    const legalShifts = shiftO.filter((o) => o.legal)
    const shiftClears = legalShifts.filter((o) => o.cleared).length
    const ratio = legalShifts.length ? shiftClears / legalShifts.length : 1
    set('neighbor-60', ratio >= NEIGHBOR_MIN,
      placed.length === 0 ? 'no placed actions to shift' : `${shiftClears}/${legalShifts.length} legal 1-tile shifts clear (${Math.round(ratio * 100)}%, need ≥${NEIGHBOR_MIN * 100}%); ${shifts.length - legalShifts.length} shifts illegal`)

    if (triggers.length === 0) {
      set('trigger-jitter', true, 'no trigger in the dev solution')
      set('timing-window', true, 'no trigger in the dev solution')
    } else {
      const jit: string[] = []
      const win: string[] = []
      let jitOk = true
      let winOk = true
      for (const { a, i } of triggers) {
        const at = new Map<number, boolean>([[a.tick, true]])
        scans.forEach((s, k) => { if (s.i === i) at.set(s.tick, scanO[k].cleared) })
        let jn = 0
        let jc = 0
        for (let d = -JITTER_TICKS; d <= JITTER_TICKS; d++) {
          const t = a.tick + d
          if (t < 0) continue
          jn++
          if (at.get(t)) jc++
        }
        if (jc < jn) jitOk = false
        jit.push(`${a.arg}@${a.tick} ${jc}/${jn}`)
        let lo = a.tick
        let hi = a.tick
        while (at.get(lo - 1)) lo--
        while (at.get(hi + 1)) hi++
        const width = hi - lo + 1
        const open = hi === a.tick + range ? '≥' : ''
        if (width < WINDOW_MIN_TICKS) winOk = false
        win.push(`${a.arg} ${open}${secs(width)} (ticks ${lo}..${hi}${open ? '+' : ''})`)
      }
      set('trigger-jitter', jitOk, `±${JITTER_TICKS} ticks: ${jit.join(', ')}`)
      set('timing-window', winOk, `need ≥${secs(WINDOW_MIN_TICKS)}: ${win.join(', ')}`)
    }
  }

  const items = allCandidates(level, step, tmax)
  const solverJobs: PlayAction[][] = []
  const seen = new Set<string>()
  const keyOf = (as: readonly PlayAction[]) => as.map(fmtAction).sort().join('|')
  const add = (list: PlayAction[][], as: PlayAction[]) => {
    const k = keyOf(as)
    if (seen.has(k)) return
    seen.add(k)
    list.push(as)
  }
  for (let k = 1; k < parMoves && k < dev.length; k++)
    for (const sub of combos(dev.map((a, i) => ({ key: String(i), group: String(i), a })), k)) add(solverJobs, sub.map((x) => x.a))
  let budget = limit
  let exhaustive = true
  const spaceInfo: string[] = []
  for (let k = 1; k < parMoves; k++) {
    const n = comboCount(items, k)
    const share = Math.floor(budget / (parMoves - k))
    if (n <= share) {
      for (const c of combos(items, k)) add(solverJobs, c.map((x) => x.action))
      budget -= n
      spaceInfo.push(`k=${k}: ${n}`)
    } else {
      exhaustive = false
      for (const c of sampleCombos(items, k, share, seed + k)) add(solverJobs, c.map((x) => x.action))
      spaceInfo.push(`k=${k}: sampled ${share} of ${n}`)
      budget -= share
    }
  }
  const solverO = await batch(solverJobs.map((actions) => ({ actions })))
  const shortcut = solverJobs.findIndex((_, k) => solverO[k].cleared)
  if (!exhaustive) warnings.push(`solver sampled: ${spaceInfo.join(', ')}`)
  if (idleO.cleared) set('solver', false, 'clears in 0 moves')
  else if (shortcut >= 0) set('solver', false, `clears in ${plural(solverO[shortcut].moves, 'move')} < par ${parMoves}: ${fmtActions(solverJobs[shortcut])}`)
  else set('solver', true, parMoves <= 1 ? 'exhaustive — par 1: only the 0-move case (idle) to rule out' : `${exhaustive ? 'exhaustive' : 'sampled (warning)'} — ${solverJobs.length} combos, no clear under ${plural(parMoves, 'move')} (${spaceInfo.join(', ')})`)

  if (devOk && parMoves === 1) {
    const n = comboCount(items, 1)
    const ones = n <= limit ? items : sampleCombos(items, 1, limit, seed).map((c) => c[0])
    if (n > limit) warnings.push(`par1 space sampled ${limit} of ${n}`)
    const o1 = await batch(ones.map((c) => ({ actions: [c.action] })))
    ones.forEach((c, k) => remember([c.action], o1[k]))
    const clears = o1.filter((o) => o.cleared)
    const limitT = par ? parTicks(par.secs) : 0
    const slow = clears.filter((o) => o.ticks > limitT)
    const slowest = clears.reduce((m, o) => Math.max(m, o.ticks), 0)
    set('par1-slow', slow.length > 0, `${clears.length} 1-move clears of ${ones.length} candidates${n > limit ? ' (sampled)' : ''}; ${slow.length} slower than par ${par?.secs ?? '?'}s (slowest ${secs(slowest)})`)
  } else if (devOk) set('par1-slow', true, `par ${parMoves} moves: the rule applies to Par 1 only`)

  if (devOk) {
    const gemTotal = devO.gemTotal
    const misses = (k: Known) => k.o.moves === parMoves && k.o.gems < k.o.gemTotal
    if (gemTotal === 0) set('gem-bypass', true, 'no gems')
    else {
      let hit = known.find(misses)
      let searched = 0
      if (!hit) {
        const jobs: PlayAction[][] = []
        const local = new Set<string>()
        const push = (as: PlayAction[]) => {
          const k = keyOf(as)
          if (local.has(k) || jobs.length >= limit) return
          local.add(k)
          jobs.push(as)
        }
        for (let i = 0; i < dev.length; i++)
          for (const c of items) {
            const others = dev.filter((_, k) => k !== i)
            if (c.action.verb === 'trigger' && others.some((o) => o.verb === 'trigger' && o.arg === c.action.arg)) continue
            push(dev.map((b, k) => (k === i ? c.action : b)))
          }
        if (parMoves <= 3) for (const c of sampleCombos(items, parMoves, Math.max(0, limit - jobs.length), seed + 99)) push(c.map((x) => x.action))
        const o = await batch(jobs.map((actions) => ({ actions })))
        searched = jobs.length
        jobs.forEach((as, k) => remember(as, o[k]))
        hit = known.find(misses)
      }
      set('gem-bypass', !!hit, hit ? `${plural(parMoves, 'move')} clear with gems ${hit.o.gems}/${hit.o.gemTotal}: ${fmtActions(hit.actions)}` : `no ${parMoves}-move clear misses a gem (searched ${searched})`)
    }
  }

  let bestTicks: number | null = null
  let suggested: number | null = null
  if (devOk) {
    const best = known.filter((k) => k.o.moves <= parMoves).reduce((m, k) => Math.min(m, k.o.ticks), devO.ticks)
    bestTicks = best
    suggested = parSecsFromBest(best)
    if (best < devO.ticks) {
      const b = known.find((k) => k.o.ticks === best && k.o.moves <= parMoves)!
      warnings.push(`dev is not the fastest known solution: ${fmtActions(b.actions)} clears in ${best} ticks (dev ${devO.ticks})`)
    }
    if (!par) set('par', false, `level has no par; suggested { moves: ${devO.moves}, secs: ${suggested} }`)
    else {
      const movesOk = devO.moves <= par.moves
      const secsOk = par.secs === suggested
      const inTime = devO.ticks <= parTicks(par.secs)
      set('par', movesOk && secsOk && inTime,
        `par ${par.moves} / ${par.secs}s; dev ${devO.moves} / ${secs(devO.ticks)}; best known ${best} ticks → par.secs ${suggested}${secsOk ? '' : ` (level says ${par.secs})`}${movesOk ? '' : ' — dev uses more moves than par'}`)
    }
  }

  const ordered = CHECK_IDS.map((id) => checks.get(id) ?? { id, pass: false, detail: 'not run' })
  return {
    id: def.id,
    name: def.name,
    pass: ordered.every((c) => c.pass),
    checks: ordered,
    warnings,
    devTicks: devOk ? devO.ticks : null,
    bestTicks,
    suggestedParSecs: suggested,
    sims,
  }
}

export function formatReport(r: VerifyReport): string {
  const lines = [`${r.pass ? 'PASS' : 'FAIL'}  ${r.id} ${r.name}  (${r.sims} sims)`]
  for (const c of r.checks) lines.push(`  ${c.pass ? 'ok  ' : 'FAIL'}  ${c.id.padEnd(15)} ${c.detail}`)
  for (const w of r.warnings) lines.push(`  warn  ${w}`)
  return lines.join('\n')
}

export type { Candidate, Outcome }
