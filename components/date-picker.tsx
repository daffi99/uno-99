"use client"

import { useState, useRef, useEffect } from "react"
import { CalendarIcon, ChevronUp, ChevronDown } from "lucide-react"

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
  position?: "left" | "right" | "bottom" | "bottom-right" | "bottom-left"
  variant?: "input" | "pill"
  className?: string
  showValueInPill?: boolean
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const dayNames = ["S", "M", "T", "W", "T", "F", "S"]

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  position = "left",
  variant = "input",
  className = "",
  showValueInPill = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const d = new Date(value + "T00:00:00")
      if (!isNaN(d.getTime())) return d.getMonth()
    }
    return new Date().getMonth()
  })
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) {
      const d = new Date(value + "T00:00:00")
      if (!isNaN(d.getTime())) return d.getFullYear()
    }
    return new Date().getFullYear()
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00")
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d.getMonth())
        setCurrentYear(d.getFullYear())
      }
    }
  }, [value, isOpen])

  const selectedDate = value ? new Date(value + "T00:00:00") : null
  const displayDate = value ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : placeholder

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay()

  const handleDateSelect = (day: number) => {
    const year = currentYear
    const month = String(currentMonth + 1).padStart(2, "0")
    const dayStr = String(day).padStart(2, "0")
    onChange?.(`${year}-${month}-${dayStr}`)
    setIsOpen(false)
  }

  const handleToday = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    onChange?.(`${year}-${month}-${day}`)
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange?.("")
    setIsOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const days = []
  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const isSelected = (day: number) => {
    return selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear
  }

  const getPositionClasses = () => {
    switch (position) {
      case "right":
        return "top-0 left-full ml-2"
      case "bottom":
      case "bottom-left":
        return "top-full mt-2 left-0"
      case "bottom-right":
        return "top-full mt-2 right-0"
      case "left":
      default:
        return "top-0 right-full mr-2"
    }
  }

  return (
    <div ref={containerRef} className={variant === "pill" ? "relative inline-block" : "relative w-full"}>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer active:scale-95 ${className}`}
          title="Pick a date to jump to that week"
        >
          <span>{showValueInPill && value ? displayDate : placeholder}</span>
          <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-10 px-3 flex items-center gap-2 border border-border bg-background rounded-lg text-sm hover:border-border/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
        >
          <CalendarIcon className="h-4 w-4 text-foreground/60" />
          <span className="text-foreground">{displayDate}</span>
        </button>
      )}

      {isOpen && (
        <div 
          ref={calendarRef}
          className={`absolute bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-xl p-4 w-80 z-50 animate-in fade-in-50 zoom-in-95 duration-100 ${getPositionClasses()}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="px-2 py-1 border border-border rounded bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {monthNames.map((month, idx) => (
                  <option key={idx} value={idx}>{month}</option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="px-2 py-1 border border-border rounded bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setCurrentMonth(currentMonth === 0 ? 11 : currentMonth - 1)
                  if (currentMonth === 0) setCurrentYear(currentYear - 1)
                }}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(currentMonth === 11 ? 0 : currentMonth + 1)
                  if (currentMonth === 11) setCurrentYear(currentYear + 1)
                }}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-foreground/60 py-2">
                {day}
              </div>
            ))}
            {days.map((day, idx) => (
              <button
                key={idx}
                onClick={() => day && handleDateSelect(day)}
                disabled={!day}
                className={`aspect-square flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  !day ? "invisible" : isSelected(day) ? "bg-blue-600 text-white" : "hover:bg-muted text-foreground"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <button
              onClick={handleClear}
              className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleToday}
              className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
