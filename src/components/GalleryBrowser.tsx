'use client'

import { useCallback, useEffect, useState } from 'react'
import { listScenes, voteScene, hasVoted, type SceneMeta, type SortMode } from '@/lib/sand/gallery'

/**
 * 갤러리 — 관객 층.
 *
 * 댓글이 없는 건 누락이 아니라 결정이다. Sandspiel 제작자가 의도적으로 뺐다(독성 차단).
 * 관객은 필요하고 싸움은 필요 없다. 투표만으로 충분히 관객이 된다.
 *
 * Hot = 최근 1주일 이내 + 표 순 (Powder Toy Front Page 복제).
 * 이 창이 없으면 오래된 히트작이 상단을 영원히 점거해 신규 업로드가 절대 안 보이고,
 * 그럼 아무도 두 번 올리지 않는다.
 */
export default function GalleryBrowser() {
  const [sort, setSort] = useState<SortMode>('hot')
  const [scenes, setScenes] = useState<SceneMeta[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [voted, setVoted] = useState<Record<string, number>>({})

  const load = useCallback(async (mode: SortMode) => {
    setLoading(true)
    setErr(null)
    try {
      const r = await listScenes(mode)
      setScenes(r.scenes)
      setTotal(r.total)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(sort)
  }, [sort, load])

  const vote = async (id: string) => {
    if (hasVoted(id)) return
    try {
      const v = await voteScene(id)
      setVoted((p) => ({ ...p, [id]: v }))
    } catch {
      /* 이미 투표했거나 네트워크 — 조용히 무시. 실패를 떠들 만한 동작이 아니다. */
    }
  }

  return (
    <main style={S.main}>
      <header style={S.head}>
        <a href="/" style={S.back}>
          ← Sandlab
        </a>
        <div style={S.tabs}>
          {(['hot', 'new'] as SortMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setSort(m)}
              style={{ ...S.tab, ...(sort === m ? S.tabOn : null) }}
            >
              {m === 'hot' ? 'Hot this week' : 'Newest'}
            </button>
          ))}
        </div>
        <span style={S.count}>{total > 0 ? `${total} scenes` : ''}</span>
      </header>

      {loading && <p style={S.msg}>Loading…</p>}
      {err && <p style={{ ...S.msg, color: '#ff8080' }}>{err}</p>}

      {!loading && !err && scenes.length === 0 && (
        <div style={S.empty}>
          {sort === 'hot' ? (
            // hot은 최근 7일만 본다. 이 창이 비었다고 갤러리가 죽은 게 아니다 —
            // 옛 씬은 Newest에 있으므로 그쪽 탈출구를 준다.
            <>
              <p style={{ margin: '0 0 6px', fontSize: 16 }}>A quiet week.</p>
              <p style={{ margin: '0 0 14px', opacity: 0.55, fontSize: 13.5 }}>
                Nothing published in the last 7 days — but older scenes are still here.
              </p>
              <button onClick={() => setSort('new')} style={S.seeNewest}>
                See all newest →
              </button>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 6px', fontSize: 16 }}>Nothing here yet.</p>
              <p style={{ margin: 0, opacity: 0.55, fontSize: 13.5 }}>
                Make something and hit <strong>Publish</strong>. Yours will be the first.
              </p>
            </>
          )}
        </div>
      )}

      <div style={S.grid}>
        {scenes.map((s) => {
          const v = voted[s.id] ?? s.votes
          const did = hasVoted(s.id)
          return (
            <div key={s.id} style={S.card}>
              <a href={`/#s=${s.id}`} style={S.thumbLink} title="Open in Sandlab">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/scenes/${s.id}/thumb`}
                  alt={s.title}
                  width={420}
                  height={210}
                  loading="lazy"
                  style={S.thumb}
                />
              </a>
              <div style={S.meta}>
                <span style={S.title} title={s.title}>
                  {s.title}
                </span>
                <button
                  onClick={() => vote(s.id)}
                  disabled={did}
                  style={{ ...S.vote, ...(did ? S.voteOn : null) }}
                  title={did ? 'Voted' : 'Vote'}
                >
                  ▲ {v}
                </button>
              </div>
              <span style={S.age}>{ago(s.createdAt)}</span>
            </div>
          )
        })}
      </div>
    </main>
  )
}

function ago(t: number): string {
  const s = (Date.now() - t) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const S: Record<string, React.CSSProperties> = {
  main: { maxWidth: 1240, margin: '0 auto', padding: '20px 18px 60px' },
  head: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, flexWrap: 'wrap' },
  back: { color: '#eef1f6', textDecoration: 'none', fontSize: 14, fontWeight: 600, opacity: 0.85 },
  tabs: { display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', padding: 3, borderRadius: 9 },
  tab: {
    background: 'transparent',
    border: 'none',
    color: '#eef1f6',
    opacity: 0.5,
    fontSize: 12.5,
    padding: '5px 11px',
    borderRadius: 7,
    cursor: 'pointer',
  },
  tabOn: { background: 'rgba(255,255,255,0.11)', opacity: 1, fontWeight: 600 },
  count: { marginLeft: 'auto', fontSize: 12, opacity: 0.35, fontVariantNumeric: 'tabular-nums' },
  msg: { opacity: 0.5, fontSize: 14 },
  empty: {
    border: '1px dashed rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: '54px 20px',
    textAlign: 'center',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))', gap: 16 },
  card: { display: 'flex', flexDirection: 'column', gap: 6 },
  thumbLink: { display: 'block', lineHeight: 0 },
  thumb: {
    width: '100%',
    height: 'auto',
    aspectRatio: '2 / 1',
    borderRadius: 9,
    background: '#0d1017',
    border: '1px solid rgba(255,255,255,0.07)',
    objectFit: 'cover',
  },
  meta: { display: 'flex', alignItems: 'center', gap: 8 },
  title: {
    fontSize: 13,
    fontWeight: 550,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  vote: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.14)',
    color: '#eef1f6',
    borderRadius: 7,
    padding: '3px 8px',
    fontSize: 11.5,
    cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
  voteOn: { background: '#3b6dff', borderColor: '#3b6dff', cursor: 'default' },
  age: { fontSize: 11, opacity: 0.3 },
  seeNewest: {
    background: '#3b6dff',
    color: '#fff',
    border: '1px solid #3b6dff',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 3px 16px rgba(59,109,255,0.35)',
  },
}
