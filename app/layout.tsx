import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Uno App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body className={montserrat.className} style={{ transition: "background-color 0.3s ease" }}>
        <div className="relative h-full p-2 pb-2 cursor-move rounded-sm text-secondary bg-secondary"
          style={{
            minHeight: "100vh",
            background: "var(--bg-primary, #f7f6ed)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            transition: "background-color 0.3s ease",
          }}
        >
          <main style={{ width: "100%", maxWidth: 1200, margin: "auto", padding: "32px 24px", borderRadius: 24 }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
