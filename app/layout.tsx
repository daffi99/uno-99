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
    <html lang="en" style={{ backgroundColor: "#f7f6ed", transition: "background-color 0.3s ease" }}>
      <head>
        <link rel="icon" href="/favicon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem("theme") || "light";
                if (theme === "dark") {
                  document.documentElement.classList.add("dark");
                  document.documentElement.style.backgroundColor = "#0f0f0f";
                  document.body.style.backgroundColor = "#0f0f0f";
                } else {
                  document.documentElement.classList.remove("dark");
                  document.documentElement.style.backgroundColor = "#f7f6ed";
                  document.body.style.backgroundColor = "#f7f6ed";
                }
              })();
            `,
          }}
        />
      </head>
      <body className={montserrat.className} style={{ transition: "background-color 0.3s ease" }}>
        <div
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
