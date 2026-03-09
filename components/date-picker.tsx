"use client"

import { CalendarIcon } from "lucide-react"

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
}

export function DatePicker({ value, onChange, placeholder = "Pick a date" }: DatePickerProps) {
  return (
    <div className="relative w-full group">
      <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-10 pointer-events-none">
        <CalendarIcon className="h-4 w-4 text-foreground/60 group-focus-within:text-foreground transition-colors" />
      </div>
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-4 py-2 border border-border bg-background text-foreground rounded-lg text-sm transition-all duration-200 placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-border/80 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted appearance-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-0"
        style={{
          colorScheme: "light",
        }}
      />
    </div>
  )
}
