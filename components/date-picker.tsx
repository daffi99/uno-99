"use client"

import { useState, useRef, useEffect } from "react"
import { CalendarIcon, ChevronUp, ChevronDown } from "lucide-react"

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const dayNames = ["S", "M", "T", "W", "T", "F", "S"]

export function DatePicker({ value, onChange, placeholder = "Pick a date" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const containerRef = useRef<HTMLDivElement>(null)

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

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 flex items-center gap-2 border border-border bg-background rounded-lg text-sm hover:border-border/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <CalendarIcon className="h-4 w-4 text-foreground/60" />
        <span className="text-foreground">{displayDate}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-background border border-border rounded-lg shadow-lg p-4 w-80 z-50">
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
