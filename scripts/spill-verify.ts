import { cpus } from 'node:os'
import { performance } from 'node:perf_hooks'
import { Worker, isMainThread, parentPort } from 'node:worker_threads'
import type { LevelDef } from '../src/lib/spill/level/define'
import { levelHash } from '../src/lib/spill/level/hash'
import { parseLevel, type ParsedLevel } from '../src/lib/spill/level/parse'
import { LEVELS } from '../src/lib/spill/levels'
import { evaluate, type Outcome } from '../src/lib/spill/verify/evaluate'
import { formatReport, verifyLevel, type BatchRunner, type Job, type VerifyReport } from '../src/lib/spill/verify/verify'

interface Req {
  seq: number
  def: LevelDef
  jobs: Job[]
}

interface Res {
  seq: number
  out: Outcome[]
}

function workerMain(): void {
  const cache = new Map<string, ParsedLevel>()
  parentPort!.on('message', (m: Req) => {
    const key = levelHash(m.def)
    let p = cache.get(key)
    if (!p) { p = parseLevel(m.def); cache.set(key, p) }
    const out = m.jobs.map((j) => evaluate(p!, j.actions, j.salt))
    parentPort!.postMessage({ seq: m.seq, out } satisfies Res)
  })
}

function poolRunner(size: number): { run: BatchRunner; close: () => Promise<void> } {
  const workers = Array.from({ length: size }, () => new Worker(__filename, { execArgv: process.execArgv }))
  const waiting = new Map<number, (out: Outcome[]) => void>()
  let seq = 0
  for (const w of workers) {
    w.on('message', (r: Res) => { waiting.get(r.seq)!(r.out); waiting.delete(r.seq) })
    w.on('error', (e) => { console.error(e); process.exit(2) })
  }
  const run: BatchRunner = async (def, jobs) => {
    if (jobs.length === 0) return []
    const chunk = Math.max(1, Math.ceil(jobs.length / (size * 4)))
    const parts: Promise<Outcome[]>[] = []
    let k = 0
    for (let i = 0; i < jobs.length; i += chunk) {
      const s = seq++
      const w = workers[k++ % size]
      parts.push(new Promise((res) => { waiting.set(s, res) }))
      w.postMessage({ seq: s, def, jobs: jobs.slice(i, i + chunk) } satisfies Req)
    }
    return (await Promise.all(parts)).flat()
  }
  return { run, close: async () => { await Promise.all(workers.map((w) => w.terminate())) } }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const flag = (name: string) => {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : undefined
  }
  const ids = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))
  const limit = Number(flag('--limit') ?? 5000)
  const size = Number(flag('--workers') ?? Math.max(1, Math.min(16, cpus().length - 2)))
  const levels = ids.length ? LEVELS.filter((l) => ids.includes(l.id)) : LEVELS
  if (levels.length === 0) {
    console.error(`no levels matched ${ids.join(', ') || '(LEVELS is empty)'}`)
    process.exit(1)
  }
  const pool = poolRunner(size)
  console.log(`Sandlab Spill verify — ${levels.length} level(s), ${size} workers, solver limit ${limit}\n`)
  const reports: VerifyReport[] = []
  for (const def of levels) {
    const t0 = performance.now()
    const r = await verifyLevel(def, pool.run, { solverLimit: limit })
    reports.push(r)
    console.log(formatReport(r) + `\n  time  ${((performance.now() - t0) / 1000).toFixed(1)}s\n`)
  }
  await pool.close()
  const ok = reports.filter((r) => r.pass).length
  console.log(`${ok}/${reports.length} levels PASS${ok === reports.length ? ' — ALL PASS' : ''}`)
  process.exit(ok === reports.length ? 0 : 1)
}

if (isMainThread) main().catch((e) => { console.error(e); process.exit(2) })
else workerMain()
