"use client"
import { format, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", disabled = false }: DatePickerProps) {
  // Parse date safely - handle YYYY-MM-DD format
  const selectedDate = value
    ? (() => {
        try {
          const parts = value.split("-")
          if (parts.length === 3) {
            const year = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10) - 1 // months are 0-indexed
            const day = parseInt(parts[2], 10)
            return new Date(year, month, day)
          }
          return undefined
        } catch {
          return undefined
        }
      })()
    : undefined

  const handleDateSelect = (date: Date | undefined) => {
    if (date && onChange) {
      // Format as YYYY-MM-DD for the input value
      const isoString = format(date, "yyyy-MM-dd")
      onChange(isoString)
    }
  }

  const displayDate = value
    ? (() => {
        try {
          const parts = value.split("-")
          if (parts.length === 3) {
            const year = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10) - 1
            const day = parseInt(parts[2], 10)
            return format(new Date(year, month, day), "MMM dd, yyyy")
          }
          return placeholder
        } catch {
          return placeholder
        }
      })()
    : placeholder

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal h-10 px-3", !value && "text-muted-foreground")}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>{displayDate}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
