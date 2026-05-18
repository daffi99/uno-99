"use client"

import { useEffect, useState } from "react"
import { Moon, Sparkles, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group relative h-10 overflow-hidden rounded-full border px-3 shadow-sm transition-all duration-500 ease-out",
        "bg-white/85 text-slate-900 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-amber-200/40",
        "dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-50 dark:hover:bg-slate-900 dark:hover:shadow-sky-950/60",
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      disabled={!mounted}
    >
      <span
        className={cn(
          "absolute inset-y-1 left-1 w-8 rounded-full bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300 shadow-sm transition-transform duration-500 ease-out",
          isDark && "translate-x-[calc(100%+0.5rem)] from-sky-400 via-indigo-400 to-violet-500",
        )}
      />
      <span className="relative z-10 flex items-center gap-2">
        <span className="relative grid h-6 w-6 place-items-center">
          <Sun
            className={cn(
              "absolute h-4 w-4 text-amber-900 transition-all duration-500 ease-out",
              isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
            )}
          />
          <Moon
            className={cn(
              "absolute h-4 w-4 text-white transition-all duration-500 ease-out",
              isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0",
            )}
          />
        </span>
        <span className="hidden text-xs font-bold uppercase tracking-[0.18em] sm:inline">
          {isDark ? "Dark" : "Light"}
        </span>
        <Sparkles className="hidden h-3.5 w-3.5 opacity-60 transition-transform duration-500 group-hover:rotate-12 sm:block" />
      </span>
    </Button>
  )
}
