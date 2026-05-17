"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme") || "light"
    const isDarkMode = savedTheme === "dark"
    setIsDark(isDarkMode)
    applyTheme(isDarkMode)
  }, [])

  const applyTheme = (dark: boolean) => {
    const html = document.documentElement
    if (dark) {
      html.classList.add("dark")
      html.style.backgroundColor = "#0f0f0f"
      document.body.style.backgroundColor = "#0f0f0f"
      localStorage.setItem("theme", "dark")
    } else {
      html.classList.remove("dark")
      html.style.backgroundColor = "#f7f6ed"
      document.body.style.backgroundColor = "#f7f6ed"
      localStorage.setItem("theme", "light")
    }
  }

  const toggleTheme = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    applyTheme(newDarkMode)
  }

  if (!mounted) return null

  return (
    <Button
      onClick={toggleTheme}
      className="relative w-10 h-10 p-0 rounded-full bg-white hover:bg-gray-100 text-black border border-gray-200 transition-all duration-300 overflow-hidden"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <Sun
          className={`absolute h-5 w-5 transition-all duration-300 transform ${
            isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          }`}
        />
        <Moon
          className={`absolute h-5 w-5 transition-all duration-300 transform ${
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
          }`}
        />
      </div>
    </Button>
  )
}
