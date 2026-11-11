/**
 * 데일리 스탠드업용 지표 요약 — 어제(24h)와 지난 7일을 나란히 찍는다.
 *
 * 소스
 *   - D1(원격): wrangler OAuth 로그인만 있으면 된다. 갤러리 업로드·투표, Spill 첫 클리어, 옛 데일리 제출.
 *   - Analytics Engine(선택): CF_ACCOUNT_ID + CF_API_TOKEN(Account Analytics Read) 환경변수가 있으면
 *     이벤트별 카운트와 referrer 상위를 추가로 찍는다. 없으면 건너뛴다.
 *   - 페이지뷰(Web Analytics)는 여기서 못 본다 — 대시보드에서 직접 확인.
 *
 * 다른 프로젝트로 옮길 때는 QUERIES 표만 바꾼다(출력·실행 로직은 공용).
 *
 * 실행: node scripts/daily-metrics.mjs
 */
import { execFileSync } from 'node:child_process'

const DB = 'sandlab-gallery'
const DAY = 86_400_000

// [라벨, (since: epoch ms) => SQL]. 결과는 첫 행의 n 컬럼.
const QUERIES = [
  ['갤러리 업로드', (s) => `SELECT COUNT(*) n FROM scenes WHERE created_at > ${s}`],
  ['갤러리 투표', (s) => `SELECT COUNT(*) n FROM votes WHERE created_at > ${s}`],
  ['Spill 첫 클리어', (s) => `SELECT COUNT(*) n FROM spill_seen WHERE created_at > ${s}`],
  ['Spill 클리어 유저(IP)', (s) => `SELECT COUNT(DISTINCT ip) n FROM spill_seen WHERE created_at > ${s}`],
  ['옛 데일리 제출', (s) => `SELECT COUNT(*) n FROM daily_results WHERE created_at > ${s}`],
]

const BREAKDOWN = {
  label: 'Spill 레벨별 첫 클리어 (7일)',
  sql: (s) =>
    `SELECT level_id k, COUNT(*) n FROM spill_seen WHERE created_at > ${s} GROUP BY level_id ORDER BY level_id`,
}

// 원격 D1 호출은 가끔 네트워크로 실패한다 — 2번까지 재시도.
function d1(sql, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const out = execFileSync(
        'npx',
        ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', sql],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
      return JSON.parse(out)[0].results
    } catch (e) {
      if (i >= tries) throw e
    }
  }
}

async function ae(sql) {
  const { CF_ACCOUNT_ID: id, CF_API_TOKEN: token } = process.env
  if (!id || !token) return null
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${id}/analytics_engine/sql`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: sql,
  })
  if (!res.ok) throw new Error(`AE ${res.status}: ${await res.text()}`)
  return (await res.json()).data
}

const now = Date.now()
const d1Since = now - DAY
const d7Since = now - 7 * DAY

console.log(`# 샌드랩 지표 — ${new Date(now).toISOString().slice(0, 16).replace('T', ' ')} UTC\n`)
console.log('| 지표 | 24h | 7일 |\n|---|---:|---:|')
for (const [label, q] of QUERIES) {
  try {
    console.log(`| ${label} | ${d1(q(d1Since))[0].n} | ${d1(q(d7Since))[0].n} |`)
  } catch (e) {
    console.log(`| ${label} | 실패 | ${String(e.message).split('\n')[0]} |`)
  }
}

try {
  const rows = d1(BREAKDOWN.sql(d7Since))
  console.log(`\n${BREAKDOWN.label}: ${rows.length ? rows.map((r) => `${r.k}=${r.n}`).join(' · ') : '없음'}`)
} catch (e) {
  console.log(`\n${BREAKDOWN.label}: 실패 (${e.message.split('\n')[0]})`)
}

try {
  const events = await ae(
    `SELECT blob1 AS event, SUM(_sample_interval) AS n FROM sandlab_events
     WHERE timestamp > NOW() - INTERVAL '7' DAY GROUP BY event ORDER BY n DESC`,
  )
  if (!events) {
    console.log('\nAE: CF_ACCOUNT_ID·CF_API_TOKEN 없음 — 건너뜀')
  } else {
    console.log(`\nAE 이벤트 (7일): ${events.map((r) => `${r.event}=${r.n}`).join(' · ') || '없음'}`)
    const refs = await ae(
      `SELECT blob2 AS ref, SUM(_sample_interval) AS n FROM sandlab_events
       WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob2 != '' GROUP BY ref ORDER BY n DESC LIMIT 5`,
    )
    console.log(`referrer 상위: ${refs.map((r) => `${r.ref}=${r.n}`).join(' · ') || '없음'}`)
  }
} catch (e) {
  console.log(`\nAE: 실패 (${e.message})`)
}

console.log('\n페이지뷰·방문자: Cloudflare 대시보드 > Web Analytics (스크립트 미지원)')
