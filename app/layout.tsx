import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Uno App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body>
        <div style={{ minHeight: '100vh', background: '#f7f6ed', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: 'Montserrat, sans-serif' }}>
          <main style={{ width: '100%', maxWidth: 1200, margin: 'auto', padding: '32px 24px', borderRadius: 24 }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
