import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sandlab — GPU falling-sand playground',
  description:
    'A million-cell falling-sand simulation running on your GPU, in the browser. No install. Share any scene as a link.',
  openGraph: {
    title: 'Sandlab — GPU falling-sand playground',
    description: 'WebGPU falling sand. No install. Share any scene as a link.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#07090D',
          color: '#eef1f6',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
          overscrollBehavior: 'none',
        }}
      >
        {children}
      </body>
    </html>
  )
}
