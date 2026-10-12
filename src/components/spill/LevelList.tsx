'use client'

import { useEffect, useState } from 'react'
import { groupByWorld, lockMessage, worldUnlocked } from '@/lib/spill/client/catalog'
import { loadRecord } from '@/lib/spill/play/progress'
import { starCount } from '@/lib/spill/play/score'
import { C } from './ui'

export interface LevelItem {
  id: string
  world: number
  name: string
}

export default function LevelList({ items }: { items: LevelItem[] }) {
  const [stars, setStars] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const out: Record<string, number> = {}
    for (const l of items) {
      const r = loadRecord(l.id)
      if (r) out[l.id] = starCount(r.stars)
    }
    setStars(out)
  }, [items])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2200)
    return () => clearTimeout(t)
  }, [msg])

  const of = (id: string) => stars[id] ?? 0
  const groups = groupByWorld(items)
  if (groups.length === 0) return <p style={{ opacity: 0.7 }}>The first world is being built. Check back soon.</p>

  return (
    <div style={{ position: 'relative' }}>
      {Object.keys(stars).length === 0 && (
        <a
          href={`/play/${groups[0].levels[0].id}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '8px 0 4px', padding: '16px 18px',
            borderRadius: 16, background: C.accent, color: C.bg, textDecoration: 'none', fontWeight: 800, fontSize: 18, minHeight: 44,
          }}
        >
          <span>Start with {groups[0].levels[0].id} {groups[0].levels[0].name}</span>
          <span aria-hidden>▶</span>
        </a>
      )}
      <div role="status" aria-live="polite" style={{ minHeight: 28, textAlign: 'center', fontSize: 14, color: C.accent }}>{msg}</div>
      {groups.map((g) => {
        const open = worldUnlocked(g.world, items, of)
        const got = g.levels.reduce((n, l) => n + of(l.id), 0)
        return (
          <section key={g.world} style={{ margin: '8px 0 28px' }}>
            <h2 style={{ fontSize: 19, margin: '0 0 14px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span>W{g.world} · {g.name}</span>
              <span style={{ fontSize: 13, opacity: 0.6, fontWeight: 500 }}>{got}/{g.levels.length * 3}★</span>
            </h2>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 14 }}>
              {g.levels.map((l) => {
                const n = of(l.id)
                const node: React.CSSProperties = {
                  width: 60, height: 60, borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                  fontWeight: 800, fontSize: 16, textDecoration: 'none', border: `2px solid ${n > 0 ? C.accent : '#2a3140'}`,
                  background: n === 3 ? 'rgba(245,166,35,0.18)' : '#121823', color: open ? C.text : 'rgba(238,241,246,0.35)', cursor: 'pointer',
                }
                return (
                  <li key={l.id} style={{ textAlign: 'center' }}>
                    {open ? (
                      <a href={`/play/${l.id}`} aria-label={`${l.id} ${l.name}, ${n} of 3 stars`} style={node}>{l.id}</a>
                    ) : (
                      <button type="button" aria-label={`${l.id} ${l.name}, locked`} style={{ ...node, padding: 0 }} onClick={() => setMsg(lockMessage(g.world, items))}>
                        🔒
                      </button>
                    )}
                    <div aria-hidden style={{ fontSize: 13, letterSpacing: 2, color: '#ffd54a', marginTop: 4 }}>
                      {'★'.repeat(n)}
                      <span style={{ opacity: 0.25 }}>{'★'.repeat(3 - n)}</span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, lineHeight: 1.3 }}>{l.name}</div>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
