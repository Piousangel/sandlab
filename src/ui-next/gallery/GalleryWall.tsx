'use client'

/**
 * 갤러리 「The Wall」(리디자인 P9, 프리뷰 셸 전용 — classic은 null → /gallery는 GalleryBrowser 그대로).
 *
 * - 액자 문법: 못 하나 + 1px 걸이줄 + kiln 액자 + 어두운 유리(결과 화면 P5와 같은 말). 썸네일은 기존 장면 썸네일(/api/scenes/:id/thumb),
 *   큐레이션은 로컬 실엔진 캡처(picks.ts). 라이브 재생은 마우스를 올려 두거나(0.3초) Play를 눌렀을 때 한 점만(LiveCanvas).
 *   라이브 키는 구역+id(큐레이션 장면이 아래 목록에도 같은 id로 나와도 한 액자만), 1200×600이 아닌 옛 장면은 Play 없음.
 * - 정렬 Hot·New·Top = 기존 API(hot/new 목록, Top = /api/creators/top 작성자 순위 → 누르면 그 사람 작품). 작품 순위 API는 만들지 않았다.
 * - 작품을 누르면 홈 진입(`/#s=<id>`, P6) — 홈이 제목·작성자(단건 API creatorName, P9)·리믹스 수를 보여 준다.
 * - 투표: 기존 voteScene(브라우저당 1회). 프리뷰는 읽기 전용이라 버튼을 끄고 이유 한 줄.
 * - 무한 스크롤 대신 "More"(누른 뒤에만 아래가 늘어남 → CLS 0). 불러오는 동안 같은 높이의 빈 액자 6개로 자리를 잡는다.
 * - 광고 안내판: /gallery는 광고 허용 페이지가 아니다(scripts/verify-ads.mjs ALLOW 밖, 라이브 캔버스 화면) → 그리지 않는다.
 * - Yours(P9b): 옛 GalleryBrowser의 'mine' 탭을 그대로 옮겼다 — 출처 localStorage `sandlab.mine`(listMine) → 단건 meta 조회(getSceneMeta),
 *   델타는 기준선 갱신 전에 계산(mineDeltas) → 그 뒤 현재값을 새 기준선으로(updateMineSeen). 자기 작품엔 투표 버튼 없이 표 수만.
 * - 옛 카드의 작성자 링크(by 이름 → 그 사람 작품 + 서버 집계), 리믹스 원본 링크, 올린 시각, 하단 후원(Ko-fi) 글줄도 같이 옮겼다(P9b — 빠진 기능 0).
 * - 댓글 없음(CLAUDE.md 절대 규칙).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PAGE_SIZE,
  getCreatorProfile,
  getCreatorTop,
  getSceneMeta,
  hasVoted,
  listMine,
  listScenes,
  mineDeltas,
  trackEvent,
  updateMineSeen,
  voteScene,
  type CreatorProfile,
  type CreatorTop,
  type SceneMeta,
} from '@/lib/sand/gallery'
import { Icon } from '../icons/Icon'
import { ShellHeader } from '../shell/ShellHeader'
import { ShellFooter } from '../shell/ShellFooter'
import { PREVIEW_READ_ONLY } from '../shell/ReadOnlyNote'
import { LiveCanvas } from './LiveCanvas'
import { PICKS, SANDLAB_CREATOR, isSandlabPick, pickThumb } from './picks'
import {
  SORTS,
  ago,
  appendPage,
  canPlay,
  creditLine,
  deltaLine,
  emptyState,
  endLive,
  hasMore,
  liveKey,
  makerStats,
  mineTotals,
  nextLive,
  openHref,
  remixLabel,
  sceneLabel,
  voteLabel,
  type Live,
  type WallSort,
} from './model'

const HOVER_DWELL_MS = 300
const SKELETONS = 6
const RO_ID = 'sl-gw-ro'

type Maker = { id: string; name: string }

type LiveCtl = {
  live: Live | null
  liveOff: boolean
  request: (key: string, via: 'button' | 'hover') => void
  end: (key: string, reason: 'leave' | 'end') => void
  fail: () => void
}

/** 첫 화면에 보이는 큐레이션 수(390 2열 × 2줄, 1440 4열 × 1줄) — 이것만 eager, 나머지는 lazy(LCP, 리뷰 7). */
const EAGER_PICKS = 4

export function GalleryWall() {
  const [sort, setSort] = useState<WallSort>('hot')
  const [maker, setMaker] = useState<Maker | null>(null)
  const [scenes, setScenes] = useState<SceneMeta[] | null>(null) // null = 불러오는 중
  const [total, setTotal] = useState(0)
  const [makers, setMakers] = useState<CreatorTop[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  // More를 누른 순간(입력 직후 0.5초 안) 받을 수만큼 빈 액자를 먼저 붙인다 — 응답이 늦어도 그 뒤 레이아웃 이동이 없다(CLS, 느린 망 실측 0.18 → 반영)
  const [pending, setPending] = useState(0)
  const [retry, setRetry] = useState(0)
  const [live, setLive] = useState<Live | null>(null)
  const [liveOff, setLiveOff] = useState(false)
  const [voted, setVoted] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState('')
  // Yours: 지난 방문 뒤 늘어난 표·리믹스(옛 mineDelta), 불러오는 동안 그릴 빈 액자 수
  const [delta, setDelta] = useState<{ votes: number; remix: number }>({ votes: 0, remix: 0 })
  const [skel, setSkel] = useState(SKELETONS)
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const req = useRef(0)
  const reduced = useRef(false)
  // 실패 뒤 남은 hover 타이머가 엔진을 다시 띄우지 않게(리뷰 4) — setState보다 먼저 보이는 ref
  const offRef = useRef(false)

  useEffect(() => {
    reduced.current = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // WebGPU가 없으면 재생 버튼을 처음부터 그리지 않는다(눌러도 아무 일 없는 버튼 금지)
    if (!('gpu' in navigator)) {
      offRef.current = true
      setLiveOff(true)
    }
  }, [])

  const showsScenes = sort !== 'top' || maker !== null
  const mine = sort === 'mine' && maker === null

  useEffect(() => {
    const my = ++req.current
    setFailed(false)
    setLive(null)
    setStatus('')
    setPending(0)
    ;(async () => {
      try {
        if (!showsScenes) {
          // 이미 받은 순위는 그대로 보여 주고 새로 받아 바꾼다(되돌아올 때 옛 목록 → 빈 칸 → 목록으로 깜빡이지 않게)
          const r = await getCreatorTop()
          if (my === req.current) setMakers(r.creators.filter((c) => c.name))
          return
        }
        if (mine) {
          // 옛 Yours 그대로: 내가 올린 id를 하나씩 단건 meta로 조회, 지워진 장면(404)은 건너뛴다. 개인 목록이라 수가 적다.
          const entries = listMine()
          setDelta({ votes: 0, remix: 0 })
          setSkel(Math.min(SKELETONS, entries.length))
          if (entries.length === 0) {
            setScenes([])
            setTotal(0)
            return
          }
          setScenes(null)
          const settled = await Promise.allSettled(entries.map((e) => getSceneMeta(e.id)))
          if (my !== req.current) return
          const found = settled
            .filter((x): x is PromiseFulfilledResult<SceneMeta> => x.status === 'fulfilled')
            .map((x) => x.value)
          // 델타를 먼저 계산(기준선 갱신 전) → 그 뒤 현재값을 새 기준선으로 저장. 다른 탭으로 넘어간 뒤 늦게 온 응답은 기준선을 건드리지 않는다.
          setDelta(mineDeltas(found, entries))
          updateMineSeen(found.map((x) => ({ id: x.id, votes: x.votes || 0, remixCount: x.remixCount || 0 })))
          setScenes(found)
          setTotal(found.length)
          return
        }
        setSkel(SKELETONS)
        setScenes(null)
        setProfile(null)
        if (maker) getCreatorProfile(maker.id).then((p) => my === req.current && setProfile(p), () => {})
        const r = maker ? await listScenes('new', 0, maker.id) : await listScenes(sort === 'new' ? 'new' : 'hot', 0)
        if (my !== req.current) return
        setScenes(r.scenes)
        setTotal(r.total)
        setVoted(new Set(r.scenes.filter((s) => hasVoted(s.id)).map((s) => s.id)))
      } catch {
        if (my === req.current) setFailed(true)
      }
    })()
  }, [sort, maker, showsScenes, mine, retry])

  const onMore = async () => {
    if (!scenes || loadingMore) return
    const my = req.current
    setLoadingMore(true)
    setPending(Math.min(PAGE_SIZE, Math.max(0, total - scenes.length)))
    setStatus('')
    try {
      const r = maker
        ? await listScenes('new', scenes.length, maker.id)
        : await listScenes(sort === 'new' ? 'new' : 'hot', scenes.length)
      if (my !== req.current) return
      setScenes((prev) => appendPage(prev ?? [], r.scenes))
      setTotal(r.total)
      setVoted((v) => new Set([...v, ...r.scenes.filter((s) => hasVoted(s.id)).map((s) => s.id)]))
    } catch {
      if (my === req.current) setStatus('Could not load more. Try again.')
    } finally {
      setPending(0)
      setLoadingMore(false)
    }
  }

  const onVote = async (s: SceneMeta) => {
    if (PREVIEW_READ_ONLY || voted.has(s.id)) return
    setVoted((v) => new Set(v).add(s.id))
    try {
      const votes = await voteScene(s.id)
      setScenes((prev) => prev?.map((x) => (x.id === s.id ? { ...x, votes } : x)) ?? prev)
      setStatus(`Voted for ${s.title || 'Untitled'}.`)
    } catch {
      setVoted((v) => {
        const n = new Set(v)
        n.delete(s.id)
        return n
      })
      setStatus('Vote did not go through. Try again.')
    }
  }

  const pickSort = (s: WallSort) => {
    setMaker(null)
    setSort(s)
  }

  const request = useCallback(
    (key: string, via: 'button' | 'hover') => {
      if (offRef.current) return
      setLive((cur) => nextLive(cur, key, via, reduced.current))
    },
    [],
  )
  const end = useCallback((key: string, reason: 'leave' | 'end') => setLive((cur) => endLive(cur, key, reason)), [])
  const fail = useCallback(() => {
    offRef.current = true
    setLive(null)
    setLiveOff(true)
  }, [])
  const ctl: LiveCtl = { live, liveOff, request, end, fail }

  const makerName = maker?.name || 'an unsigned maker'
  const hint = maker ? `Every scene by ${makerName}, newest first.` : SORTS.find((x) => x.id === sort)!.hint
  const totals = mine && scenes ? mineTotals(scenes) : null
  const grew = deltaLine(delta)

  return (
    <div className="sl-gw">
      <ShellHeader />
      <main className="sl-gw-main">
        <header className="sl-gw-head">
          <h1 className="sl-gw-h1">The Wall</h1>
          <p className="sl-gw-lede">Scenes poured in Sandlab. Open one to watch it run, then keep pouring.</p>
        </header>

        <section className="sl-gw-sec" aria-labelledby="sl-gw-picks-h">
          <div className="sl-gw-row">
            <h2 className="sl-gw-h2" id="sl-gw-picks-h">
              Sandlab picks
            </h2>
            <span className="sl-gw-label">{PICKS.length} scenes</span>
          </div>
          <p className="sl-gw-sub">Chosen and made by the Sandlab team.</p>
          <ul className="sl-gw-grid">
            {PICKS.map((p, i) => (
              <Frame key={p.id} id={p.id} lkey={liveKey('pick', p.id)} eager={i < EAGER_PICKS} title={p.title} thumb={pickThumb(p.id)} ctl={ctl}>
                <div className="sl-gw-by">
                  <p className="sl-gw-credit">{creditLine(SANDLAB_CREATOR)}</p>
                </div>
                <p className="sl-gw-meta">Sandlab pick</p>
              </Frame>
            ))}
          </ul>
        </section>

        <section className="sl-gw-sec" aria-labelledby="sl-gw-all-h">
          <h2 className="sl-gw-h2" id="sl-gw-all-h">
            {maker ? `Scenes by ${makerName}` : mine ? 'Your scenes' : 'Everyone’s scenes'}
          </h2>
          <div className="sl-gw-sorts" role="group" aria-label="Sort the wall">
            {SORTS.map((s) => (
              <button key={s.id} type="button" className="sl-gw-sort" aria-pressed={!maker && sort === s.id} onClick={() => pickSort(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="sl-gw-subrow">
            <p className="sl-gw-sub">{hint}</p>
            {maker && profile && <span className="sl-gw-label">{makerStats(profile)}</span>}
            {maker && (
              <button type="button" className="sl-gw-textbtn" onClick={() => setMaker(null)}>
                <Icon name="back" size={16} />
                {/* 카드의 작성자 링크로 들어왔으면 그 정렬로 돌아간다(옛 'Back to gallery') */}
                {sort === 'top' ? 'Top makers' : 'All scenes'}
              </button>
            )}
          </div>
          {PREVIEW_READ_ONLY && showsScenes && (
            <p className="sl-gw-ro" id={RO_ID}>
              {mine ? 'Publishing is off in this read-only preview, so nothing new will show up here.' : 'Voting is off in this read-only preview.'}
            </p>
          )}
          {/* 창작자 귀환 줄(옛 mineDigest) — 두 줄 자리를 먼저 잡아 둔다(불러온 뒤 델타가 생겨도 아래가 밀리지 않게, CLS) */}
          {mine && !failed && (scenes === null || scenes.length > 0) && (
            <div className="sl-gw-mine" aria-live="polite">
              {totals && (
                <p className="sl-gw-meta">
                  {sceneLabel(totals.scenes)} · {voteLabel(totals.votes)} · {remixLabel(totals.remix)}
                </p>
              )}
              {totals && grew && (
                <p className="sl-gw-delta">
                  <Icon name="next" size={16} className="sl-gw-up" />
                  {grew}
                </p>
              )}
            </div>
          )}

          {failed ? (
            <div className="sl-gw-empty">
              <p>Couldn’t reach the wall.</p>
              <button type="button" className="sl-gw-btn" onClick={() => setRetry((n) => n + 1)}>
                Try again
              </button>
            </div>
          ) : !showsScenes ? (
            <MakerList makers={makers} onOpen={(m) => setMaker({ id: m.id, name: m.name ?? '' })} />
          ) : scenes === null ? (
            <ul className="sl-gw-grid" aria-hidden="true">
              <Skeletons n={skel} />
            </ul>
          ) : scenes.length === 0 ? (
            <Empty sort={sort} maker={!!maker} onNew={() => pickSort('new')} />
          ) : (
            <ul className="sl-gw-grid">
              {scenes.map((s) => {
                const title = s.title || 'Untitled'
                const done = voted.has(s.id)
                return (
                  <Frame
                    key={s.id}
                    id={s.id}
                    lkey={liveKey('all', s.id)}
                    playable={canPlay(s.w, s.h)}
                    title={title}
                    thumb={`/api/scenes/${s.id}/thumb`}
                    ctl={ctl}
                  >
                    <div className="sl-gw-by">
                      {/* 팀 큐레이션은 이름 없이 올라가 있다 — 위 칸·홈 진입과 같은 표기(리뷰 5) */}
                      {s.creatorId ? (
                        // 옛 카드의 "by 이름" 버튼 그대로 — 그 사람 작품 + 서버 집계(작성자 화면)
                        <button
                          type="button"
                          className="sl-gw-credit sl-gw-credit-btn"
                          title={`See all scenes by ${s.creatorName || 'this maker'}`}
                          onClick={() => setMaker({ id: s.creatorId!, name: s.creatorName ?? '' })}
                        >
                          {creditLine(s.creatorName)}
                        </button>
                      ) : (
                        <p className="sl-gw-credit">{creditLine(s.creatorName ?? (isSandlabPick(s.id) ? SANDLAB_CREATOR : null))}</p>
                      )}
                      {s.parent && (
                        // 리믹스 계보 — 원본 장면 열기(옛 카드의 remix 링크, 홈 리믹스 배너의 'Original'과 같은 말)
                        <a className="sl-gw-from" href={openHref(s.parent)} aria-label={`Original of ${title}`}>
                          Original
                        </a>
                      )}
                    </div>
                    <p className="sl-gw-meta">
                      <Icon name="remix" size={16} />
                      {remixLabel(s.remixCount)} · {ago(s.createdAt)}
                    </p>
                    <div className="sl-gw-votes">
                      <span className="sl-gw-meta">{voteLabel(s.votes)}</span>
                      {/* 자기 작품엔 투표하지 않는다 — 표는 지켜보는 신호(옛 Yours와 같음) */}
                      {!mine && (
                      <button
                        type="button"
                        className="sl-gw-vote"
                        disabled={PREVIEW_READ_ONLY || done}
                        aria-describedby={PREVIEW_READ_ONLY ? RO_ID : undefined}
                        aria-label={`${done ? 'Voted for' : 'Vote for'} ${title}`}
                        onClick={() => onVote(s)}
                      >
                        {done ? 'Voted' : 'Vote'}
                      </button>
                      )}
                    </div>
                  </Frame>
                )
              })}
              <Skeletons n={pending} />
            </ul>
          )}

          {showsScenes && scenes && !failed && hasMore(scenes.length, total) && (
            <div className="sl-gw-more">
              <button type="button" className="sl-gw-btn" onClick={onMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'More'}
              </button>
              <span className="sl-gw-label">
                {scenes.length} of {total}
              </span>
            </div>
          )}
          <p className="sl-gw-status" role="status" aria-live="polite">
            {status}
          </p>
        </section>

        {/* 옛 갤러리 하단 글줄(후원 Ko-fi 포함) — 문구·링크·계측 그대로, 모양만 새 셸 */}
        <p className="sl-gw-support">
          Made by Piousangel ·{' '}
          <a href="/about" className="sl-gw-support-link">About</a> ·{' '}
          <a href="/learn" className="sl-gw-support-link">Learn</a> ·{' '}
          <a href="/privacy" className="sl-gw-support-link">Privacy</a> ·{' '}
          <a href="/terms" className="sl-gw-support-link">Terms</a> ·{' '}
          <a href="/contact" className="sl-gw-support-link">Contact</a> ·{' '}
          <a
            href="https://ko-fi.com/piousangel"
            target="_blank"
            rel="noopener noreferrer"
            className="sl-gw-support-link"
            onClick={() => trackEvent('kofi_click')}
          >
            ♥ support{/* lint-ui-allow: 옛 갤러리 후원 문구 그대로(텍스트 변경 금지, P9b 지시) — 아이콘이 아니라 문구의 일부 */}
          </a>
        </p>
      </main>
      <ShellFooter />
    </div>
  )
}

/** 못·걸이줄·액자 + 캡션. 링크(유리+제목) 하나, 재생 버튼은 제목 줄 오른쪽(링크 밖 형제 — 버튼을 링크 안에 넣지 않고, 그림을 가리지 않는다). */
function Frame({
  id,
  lkey,
  title,
  thumb,
  ctl,
  eager = false,
  playable = true,
  children,
}: {
  id: string
  lkey: string
  title: string
  thumb: string
  ctl: LiveCtl
  eager?: boolean
  playable?: boolean
  children: React.ReactNode
}) {
  const dwell = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canLive = playable && !ctl.liveOff
  const isLive = canLive && ctl.live?.key === lkey
  const clear = () => {
    if (dwell.current) clearTimeout(dwell.current)
    dwell.current = null
  }
  useEffect(() => clear, [])
  return (
    <li
      className="sl-gw-item"
      data-live={isLive || undefined}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse' || !canLive) return
        clear()
        dwell.current = setTimeout(() => ctl.request(lkey, 'hover'), HOVER_DWELL_MS)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return
        clear()
        ctl.end(lkey, 'leave')
      }}
    >
      <span className="sl-gw-hang" aria-hidden="true">
        <svg className="sl-gw-wire" viewBox="0 0 100 18" preserveAspectRatio="none" focusable="false">
          <path d="M16 18 L50 3 L84 18" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="sl-gw-nail" />
      </span>
      <div className="sl-gw-art">
        <a className="sl-gw-open" href={openHref(id)}>
          <span className="sl-gw-frame">
            <span className="sl-gw-glass">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="" width={640} height={320} loading={eager ? 'eager' : 'lazy'} decoding="async" />
              {isLive && <LiveCanvas id={id} onEnd={() => ctl.end(lkey, 'end')} onFail={ctl.fail} />}
            </span>
          </span>
          <span className="sl-gw-title">{title}</span>
        </a>
        {canLive && (
          <button
            type="button"
            className="sl-gw-play"
            aria-pressed={isLive}
            aria-label={`${isLive ? 'Stop' : 'Play'} ${title}`}
            onClick={() => {
              clear()
              ctl.request(lkey, 'button')
            }}
          >
            <span className="sl-gw-play-face">{isLive ? 'Stop' : 'Play'}</span>
          </button>
        )}
      </div>
      {children}
    </li>
  )
}

/** 불러오는 동안의 빈 액자(목록 카드와 같은 높이 — gallery.css .sl-gw-skel). */
function Skeletons({ n }: { n: number }) {
  return Array.from({ length: n }, (_, i) => (
    <li key={`skel-${i}`} className="sl-gw-item sl-gw-skel" aria-hidden="true">
      <span className="sl-gw-hang" />
      <span className="sl-gw-frame">
        <span className="sl-gw-glass" />
      </span>
    </li>
  ))
}

function MakerList({ makers, onOpen }: { makers: CreatorTop[] | null; onOpen: (m: CreatorTop) => void }) {
  if (makers === null)
    return (
      <ol className="sl-gw-makers" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="sl-gw-maker-skel" />
        ))}
      </ol>
    )
  if (makers.length === 0) return <Empty sort="top" maker={false} onNew={() => {}} />
  return (
    <ol className="sl-gw-makers">
      {makers.map((m, i) => (
        <li key={m.id}>
          <button type="button" className="sl-gw-maker" onClick={() => onOpen(m)}>
            <span className="sl-gw-rank">{i + 1}</span>
            <span className="sl-gw-maker-name">{m.name}</span>
            <span className="sl-gw-label">
              {voteLabel(m.votes)} · {m.scenes === 1 ? '1 scene' : `${m.scenes} scenes`}
            </span>
            <Icon name="next" size={16} />
          </button>
        </li>
      ))}
    </ol>
  )
}

function Empty({ sort, maker, onNew }: { sort: WallSort; maker: boolean; onNew: () => void }) {
  const e = emptyState(sort, maker)
  return (
    <div className="sl-gw-empty">
      <p>{e.text}</p>
      {e.action === 'new' ? (
        <button type="button" className="sl-gw-btn" onClick={onNew}>
          See New
        </button>
      ) : (
        <a className="sl-gw-btn" href="/">
          Pour a scene
        </a>
      )}
    </div>
  )
}
