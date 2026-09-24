import type React from "react"
import Link from "next/link"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPKR } from "@/lib/money"

/**
 * Small layout pieces shared by every screen, so pages read as one app rather
 * than a stack of separately styled cards.
 */

export type Tone = "default" | "primary" | "positive" | "negative" | "warning" | "info" | "muted"

const TONE_TEXT: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  positive: "text-positive",
  negative: "text-negative",
  warning: "text-warning",
  info: "text-info",
  muted: "text-muted-foreground",
}

const TONE_SOFT: Record<Tone, string> = {
  default: "bg-muted text-foreground",
  primary: "bg-primary/12 text-primary",
  positive: "bg-positive/12 text-positive",
  negative: "bg-negative/12 text-negative",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/12 text-info",
  muted: "bg-muted text-muted-foreground",
}

const TONE_BAR: Record<Tone, string> = {
  default: "bg-foreground",
  primary: "bg-primary",
  positive: "bg-positive",
  negative: "bg-negative",
  warning: "bg-warning",
  info: "bg-info",
  muted: "bg-muted-foreground",
}

export const toneText = (tone: Tone) => TONE_TEXT[tone]

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <span className="text-base font-bold leading-none">₨</span>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** A money figure: "PKR" set small so the number carries the weight. */
export function Amount({
  value,
  sign,
  className,
}: {
  value: number
  sign?: "+" | "-" | ""
  className?: string
}) {
  return (
    <span className={cn("tabular-nums whitespace-nowrap", className)}>
      {sign}
      <span className="mr-1 text-[0.62em] font-medium tracking-wide opacity-60">PKR</span>
      {formatPKR(value)}
    </span>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  tone?: Tone
  className?: string
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border bg-card p-4 shadow-xs", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex size-7 items-center justify-center rounded-lg", TONE_SOFT[tone])}>
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className={cn("mt-2 text-lg font-semibold tracking-tight sm:text-xl md:text-2xl", TONE_TEXT[tone])}>{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function IconBadge({
  icon: Icon,
  tone = "default",
  className,
}: {
  icon: LucideIcon
  tone?: Tone
  className?: string
}) {
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONE_SOFT[tone], className)}>
      <Icon className="size-[18px]" />
    </span>
  )
}

/** A thin progress bar whose colour carries its state. */
export function Meter({ value, tone = "primary", className }: { value: number; tone?: Tone; className?: string }) {
  const width = Math.min(Math.max(value, 0), 100)
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all", TONE_BAR[tone])} style={{ width: `${width}%` }} />
    </div>
  )
}

/** Green while comfortable, amber near the limit, red once it is blown. */
export function budgetTone(progress: number, over: boolean): Tone {
  if (over) return "negative"
  if (progress >= 80) return "warning"
  return "positive"
}

export function Panel({
  title,
  description,
  href,
  hrefLabel = "See all",
  action,
  children,
  className,
  contentClassName,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  href?: string
  hrefLabel?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <section className={cn("rounded-2xl border bg-card shadow-xs", className)}>
      {(title || action || href) && (
        <div className="flex items-start justify-between gap-3 px-4 pt-4 md:px-5 md:pt-5">
          <div className="min-w-0">
            {title && <h2 className="font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
          {href && !action && (
            <Link
              href={href}
              className="-mr-1 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {hrefLabel}
              <ChevronRight className="size-3.5" />
            </Link>
          )}
        </div>
      )}
      <div className={cn("p-4 md:p-5", title || action || href ? "pt-3 md:pt-4" : "", contentClassName)}>
        {children}
      </div>
    </section>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "py-6" : "py-12")}>
      <span
        className={cn(
          "mb-3 flex items-center justify-center rounded-2xl bg-muted text-muted-foreground",
          compact ? "size-11" : "size-14",
        )}
      >
        <Icon className={compact ? "size-5" : "size-6"} />
      </span>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** A rounded list row surface, used for accounts, loans, bills and the rest. */
export function Row({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent/60", className)}
      {...props}
    />
  )
}

export function Callout({
  tone = "warning",
  children,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "negative" && "border-negative/30 bg-negative/8",
        tone === "warning" && "border-warning/30 bg-warning/8",
        tone === "info" && "border-info/30 bg-info/8",
        className,
      )}
    >
      {children}
    </div>
  )
}
