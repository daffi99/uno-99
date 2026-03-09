"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatDateDisplay(dateString: string): string {
  try {
    const [year, month, day] = dateString.split("-").map(Number)
    if (year && month && day) {
      return `${monthNames[month - 1]} ${day}, ${year}`
    }
  } catch {
    return ""
  }
  return ""
}

export function DatePicker({ value, onChange, placeholder = "Pick a date" }: DatePickerProps) {
  const [error, setError] = useState(false)

  try {
    const getDate = (): Date | undefined => {
      if (!value) return undefined
      try {
        const [year, month, day] = value.split("-").map(Number)
        if (year && month && day) {
          return new Date(year, month - 1, day)
        }
      } catch {
        return undefined
      }
      return undefined
    }

    const selectedDate = getDate()

    const handleDateSelect = (date: Date | undefined) => {
      try {
        if (date && onChange) {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const day = String(date.getDate()).padStart(2, "0")
          onChange(`${year}-${month}-${day}`)
        }
      } catch (e) {
        console.log("[v0] Date selection error:", e)
        setError(true)
      }
    }

    const displayDate = value ? formatDateDisplay(value) : placeholder

    if (error) {
      return (
        <Input
          type="date"
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-10"
        />
      )
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayDate}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} initialFocus />
        </PopoverContent>
      </Popover>
    )
  } catch (e) {
    console.log("[v0] DatePicker error:", e)
    setError(true)
    return (
      <Input
        type="date"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10"
      />
    )
  }
}
