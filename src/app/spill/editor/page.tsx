import dynamic from 'next/dynamic'

export const metadata = { title: 'Spill editor — Sandlab', robots: { index: false, follow: false } }

const ENABLED = process.env.NODE_ENV !== 'production'

const SpillEditor = ENABLED ? dynamic(() => import('@/components/spill/SpillEditor')) : null

export default function Page() {
  if (!SpillEditor) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#eef1f6', background: '#07090D', minHeight: '100dvh' }}>
        <h1 style={{ fontSize: 18 }}>Spill level editor</h1>
        <p>The editor is a development tool. Run <code>pnpm dev</code> and open /spill/editor.</p>
      </main>
    )
  }
  return <SpillEditor />
}
