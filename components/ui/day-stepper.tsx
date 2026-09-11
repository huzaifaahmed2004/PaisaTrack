"use client"

import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface DayStepperProps {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  placeholder?: string
  className?: string
}

/**
 * A themed replacement for the browser's number spinner: large -/+ buttons
 * that are easy to hit on a phone, with the value still typeable in between.
 */
export function DayStepper({ id, value, onChange, min = 1, max = 31, placeholder, className }: DayStepperProps) {
  const current = Number.parseInt(value, 10)
  const hasValue = Number.isFinite(current)

  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  const step = (delta: number) => {
    // From empty, + starts at the minimum and - starts at the maximum.
    const base = hasValue ? current : delta > 0 ? min - 1 : max + 1
    onChange(String(clamp(base + delta)))
  }

  const buttonClass =
    "flex w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent/15 hover:text-foreground active:bg-accent/25 disabled:pointer-events-none disabled:opacity-40"

  return (
    <div
      className={cn(
        "flex h-11 w-full items-stretch overflow-hidden rounded-md border border-input shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={hasValue && current <= min}
        aria-label="Decrease"
        className={buttonClass}
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={() => {
          if (hasValue) onChange(String(clamp(current)))
        }}
        placeholder={placeholder}
        className="w-full min-w-0 border-x border-input bg-transparent text-center text-base tabular-nums outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={() => step(1)}
        disabled={hasValue && current >= max}
        aria-label="Increase"
        className={buttonClass}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
