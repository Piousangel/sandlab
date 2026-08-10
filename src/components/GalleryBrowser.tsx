'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  listScenes,
  getSceneMeta,
  listMine,
  updateMineSeen,
  mineDeltas,
  voteScene,
  hasVoted,
  type SceneMeta,
  type SortMode,
} from '@/lib/sand/gallery'

// 서버 정렬(hot/new) + 로컬 'mine'(내가 올린 것). mine은 서버 정렬이 아니라 localStorage 기반.
type Tab = SortMode | 'mine'

function ThumbIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ verticalAlign: -1, marginRight: 3 }}
      aria-hidden="true"
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  )
}

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
  // 창작자 귀환 델타 — 지난 Yours 방문 이후 늘어난 표·리믹스.
  const [mineDelta, setMineDelta] = useState<{ votes: number; remix: number }>({ votes: 0, remix: 0 })
  const [voted, setVoted] = useState<Record<string, number>>({})
  const [loadingMore, setLoadingMore] = useState(false)

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
        // 델타를 먼저 계산(기준선 갱신 전) → 그 뒤 현재값을 새 기준선으로 저장.
        setMineDelta(mineDeltas(found, listMine()))
        updateMineSeen(found.map((s) => ({ id: s.id, votes: s.votes || 0, remixCount: s.remixCount || 0 })))
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

  // 다음 페이지 append. 서버는 offset을 이미 지원(PAGE_SIZE=24). 씬>24(=발사 성공)일 때
  // 나머지가 도달 불가하던 걸 막는다. mine 탭은 로컬 목록이라 페이지네이션 없음.
  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const r = await listScenes(sort as SortMode, scenes.length)
      setScenes((prev) => {
        const seen = new Set(prev.map((s) => s.id))
        return [...prev, ...r.scenes.filter((s) => !seen.has(s.id))]
      })
      setTotal(r.total)
    } catch {
      /* 실패해도 기존 목록은 유지 — 버튼만 다시 눌러볼 수 있게 */
    } finally {
      setLoadingMore(false)
    }
  }, [sort, scenes.length])

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
              aria-pressed={sort === m}
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
          {(mineDelta.votes > 0 || mineDelta.remix > 0) && (
            <span style={S.mineDeltaBadge}>
              ↑{' '}
              {[
                mineDelta.votes > 0 ? `+${mineDelta.votes} vote${mineDelta.votes === 1 ? '' : 's'}` : null,
                mineDelta.remix > 0 ? `+${mineDelta.remix} remix${mineDelta.remix === 1 ? '' : 'es'}` : null,
              ]
                .filter(Boolean)
                .join(', ')}{' '}
              since your last visit
            </span>
          )}
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
                  width={640}
                  height={320}
                  loading="lazy"
                  className="sl-thumb-img"
                  style={S.thumb}
                  onError={(e) => {
                    // 썸네일 로드 실패(삭제·손상·네트워크) 시 깨진 아이콘 대신 그라디언트 플레이스홀더로.
                    // "썸네일=본체" 장르에서 깨진 카드는 '고장난 사이트' 신호라 반드시 우아하게 떨어져야 한다.
                    const img = e.currentTarget
                    img.removeAttribute('src')
                    img.style.background = 'linear-gradient(135deg, #1a1410, #0c0a08)'
                  }}
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
                    <ThumbIcon /> <strong style={{ fontWeight: 700 }}>{v}</strong>
                  </span>
                ) : (
                  <button
                    onClick={() => vote(s.id)}
                    disabled={did}
                    style={{ ...S.vote, ...(did ? S.voteOn : null) }}
                    title={did ? 'Voted' : 'Give this an upvote'}
                  >
                    <ThumbIcon /> <strong style={{ fontWeight: 700 }}>{v}</strong>
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
      {sort !== 'mine' && scenes.length < total && !loading && (
        <div style={S.moreWrap}>
          <button onClick={loadMore} disabled={loadingMore} style={S.moreBtn}>
            {loadingMore ? 'Loading…' : `Load more · ${total - scenes.length} more`}
          </button>
        </div>
      )}
      <div style={S.support}>
        made by one person ·{' '}
        <a
          href="https://ko-fi.com/piousangel"
          target="_blank"
          rel="noopener noreferrer"
          style={S.supportLink}
        >
          ♥ support
        </a>
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
  voteOn: { background: '#f5a623', borderColor: '#f5a623', color: '#1a1206', cursor: 'default' },
  footer: { display: 'flex', alignItems: 'center', gap: 10 },
  lineage: {
    fontSize: 11,
    opacity: 0.62,
    color: '#f0c98a',
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
  // 귀환 델타 — "네가 없는 사이 자랐다". 앰버로 눈에 띄게(재방문 페이오프).
  mineDeltaBadge: {
    display: 'inline-block',
    marginLeft: 8,
    padding: '1px 8px',
    borderRadius: 6,
    background: 'rgba(245,166,35,0.14)',
    color: '#f5c98a',
    fontWeight: 600,
    fontSize: 12,
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
  // 후원 — 갤러리 하단 한 줄(무해·정적). 코어/캔버스 미학 불변. 모네타이제이션 원칙.
  support: { textAlign: 'center', margin: '24px 0 10px', fontSize: 12, opacity: 0.5, color: '#eef1f6' },
  supportLink: { color: '#f5c98a', textDecoration: 'none', fontWeight: 600 },
  moreWrap: { display: 'flex', justifyContent: 'center', margin: '26px 0 4px' },
  moreBtn: {
    background: 'rgba(255,255,255,0.05)',
    color: '#eef1f6',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 9,
    padding: '10px 20px',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums',
  },
  seeNewest: {
    background: '#f5a623',
    color: '#1a1206',
    border: '1px solid #f5a623',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 3px 16px rgba(245,166,35,0.35)',
  },
}
