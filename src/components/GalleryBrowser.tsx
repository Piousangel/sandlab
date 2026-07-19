'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  listScenes,
  getSceneMeta,
  listMine,
  voteScene,
  hasVoted,
  type SceneMeta,
  type SortMode,
} from '@/lib/sand/gallery'

// 서버 정렬(hot/new) + 로컬 'mine'(내가 올린 것). mine은 서버 정렬이 아니라 localStorage 기반.
type Tab = SortMode | 'mine'

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
  const [sort, setSort] = useState<Tab>('hot')
  const [scenes, setScenes] = useState<SceneMeta[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [voted, setVoted] = useState<Record<string, number>>({})

  const load = useCallback(async (mode: Tab) => {
    setLoading(true)
    setErr(null)
    try {
      if (mode === 'mine') {
        // 내가 올린 id들을 각각 조회한다. 삭제된 씬은 건너뛴다. 개인 목록이라 수가 적다.
        const mine = listMine()
        const settled = await Promise.allSettled(mine.map((e) => getSceneMeta(e.id)))
        const found = settled
          .filter((s): s is PromiseFulfilledResult<SceneMeta> => s.status === 'fulfilled')
          .map((s) => s.value)
        setScenes(found)
        setTotal(found.length)
      } else {
        const r = await listScenes(mode)
        setScenes(r.scenes)
        setTotal(r.total)
      }
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
          {(['hot', 'new', 'mine'] as Tab[]).map((m) => (
            <button
              key={m}
              onClick={() => setSort(m)}
              style={{ ...S.tab, ...(sort === m ? S.tabOn : null) }}
            >
              {m === 'hot' ? 'Hot this week' : m === 'new' ? 'Newest' : 'Yours'}
            </button>
          ))}
        </div>
        <span style={S.count}>{total > 0 ? `${total} scenes` : ''}</span>
      </header>

      {loading && <p style={S.msg}>Loading…</p>}
      {err && <p style={{ ...S.msg, color: '#ff8080' }}>{err}</p>}

      {!loading && !err && scenes.length === 0 && (
        <div style={S.empty}>
          {sort === 'mine' ? (
            <>
              <p style={{ margin: '0 0 6px', fontSize: 16 }}>Nothing of yours yet.</p>
              <p style={{ margin: '0 0 14px', opacity: 0.55, fontSize: 13.5 }}>
                Publish a scene and it shows up here — come back to see its votes climb.
              </p>
              <a href="/" style={S.seeNewest}>
                Make one →
              </a>
            </>
          ) : sort === 'hot' ? (
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

      {/* 창작자 귀환 훅 — "네 작품에 무슨 일이 있었나"를 한 줄로. 댓글 없는 커뮤니티의 재방문 신호는
          표·리믹스 카운트뿐이므로(Sandspiel), Yours 재방문 시 그 합계를 되돌려준다. */}
      {sort === 'mine' && !loading && scenes.length > 0 && (
        <p style={S.mineDigest}>
          {scenes.length} scene{scenes.length > 1 ? 's' : ''} ·{' '}
          <strong>{scenes.reduce((n, s) => n + (s.votes || 0), 0)}</strong> vote
          {scenes.reduce((n, s) => n + (s.votes || 0), 0) === 1 ? '' : 's'} ·{' '}
          <strong>{scenes.reduce((n, s) => n + (s.remixCount || 0), 0)}</strong> remix
          {scenes.reduce((n, s) => n + (s.remixCount || 0), 0) === 1 ? '' : 'es'}
        </p>
      )}

      {/* 카드 호버 신호 — 인라인 스타일은 :hover를 못 하므로 여기서만 최소 CSS를 주입한다.
          썸네일=본체이고 관람→열기→리믹스→재게시가 이 장르의 생존 루프라, 리믹스 초대를 표면화한다. */}
      <style>{`
        .sl-card { transition: transform 130ms ease; }
        .sl-card:hover { transform: translateY(-3px); }
        .sl-card .sl-thumb-img { transition: border-color 130ms ease, box-shadow 130ms ease; }
        .sl-card:hover .sl-thumb-img { border-color: rgba(255,255,255,0.22); box-shadow: 0 12px 30px rgba(0,0,0,0.55); }
        .sl-remix { opacity: 0; transform: translateY(4px); transition: opacity 130ms ease, transform 130ms ease; }
        .sl-card:hover .sl-remix { opacity: 1; transform: translateY(0); }
        @media (hover: none) { .sl-remix { opacity: 1; transform: none; } }
      `}</style>

      <div style={S.grid}>
        {scenes.map((s) => {
          const v = voted[s.id] ?? s.votes
          const did = hasVoted(s.id)
          return (
            <div key={s.id} className="sl-card" style={S.card}>
              <a href={`/#s=${s.id}`} style={S.thumbLink} title="Open & remix in Sandlab">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/scenes/${s.id}/thumb`}
                  alt={s.title}
                  width={420}
                  height={210}
                  loading="lazy"
                  className="sl-thumb-img"
                  style={S.thumb}
                />
                <span className="sl-remix" style={S.remixBadge}>
                  ↻ Remix
                </span>
              </a>
              <div style={S.meta}>
                <span style={S.title} title={s.title}>
                  {s.title}
                </span>
                {sort === 'mine' ? (
                  // 자기 씬엔 투표하지 않는다 — 표는 지켜보는 신호다("come back to see its votes climb").
                  <span style={S.voteStatic} title="Votes on your scene">
                    ▲ <strong style={{ fontWeight: 700 }}>{v}</strong>
                  </span>
                ) : (
                  <button
                    onClick={() => vote(s.id)}
                    disabled={did}
                    style={{ ...S.vote, ...(did ? S.voteOn : null) }}
                    title={did ? 'Voted' : 'Give this an upvote'}
                  >
                    ▲ <strong style={{ fontWeight: 700 }}>{v}</strong>
                  </button>
                )}
              </div>
              <div style={S.footer}>
                <span style={S.age}>{ago(s.createdAt)}</span>
                {/* 리믹스 계보 — 단건 조회(Yours 탭)에서만 채워진다. "네 작품에 무슨 일이" 귀환 훅. */}
                {s.remixCount != null && s.remixCount > 0 && (
                  <span style={S.lineage} title={`${s.remixCount} remix${s.remixCount > 1 ? 'es' : ''} of this`}>
                    ↻ {s.remixCount}
                  </span>
                )}
                {s.parent && (
                  <a
                    href={`/#s=${s.parent}`}
                    style={S.lineageLink}
                    title="Open the original this was remixed from"
                  >
                    ↦ remix
                  </a>
                )}
              </div>
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
  thumbLink: { display: 'block', lineHeight: 0, position: 'relative' },
  remixBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    background: 'rgba(11,14,19,0.82)',
    color: '#eef1f6',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 7,
    padding: '4px 9px',
    fontSize: 11.5,
    fontWeight: 600,
    lineHeight: 1.2,
    backdropFilter: 'blur(6px)',
    pointerEvents: 'none',
  },
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
  footer: { display: 'flex', alignItems: 'center', gap: 10 },
  lineage: {
    fontSize: 11,
    opacity: 0.6,
    color: '#cfe0ff',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
  },
  lineageLink: { fontSize: 11, opacity: 0.5, color: '#eef1f6', textDecoration: 'none' },
  mineDigest: {
    margin: '0 0 16px',
    fontSize: 13,
    opacity: 0.7,
    color: '#eef1f6',
    fontVariantNumeric: 'tabular-nums',
  },
  voteStatic: {
    border: '1px solid rgba(255,255,255,0.10)',
    color: '#eef1f6',
    opacity: 0.75,
    borderRadius: 7,
    padding: '3px 8px',
    fontSize: 11.5,
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
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
