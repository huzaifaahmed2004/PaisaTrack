"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatPKR } from "@/lib/money"
import type { MonthFlow } from "@/lib/insights"

const compact = (value: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)

/**
 * Spending per month. One series, so the title names it and no legend is
 * needed; hovering a bar gives the exact figure plus that month's income.
 */
export function SpendingChart({ data }: { data: MonthFlow[] }) {
  return (
    <div className="h-52 w-full" role="img" aria-label="Spending per month over the last six months">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={compact}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", radius: 6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const month = payload[0].payload as MonthFlow
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
                  <p className="mb-1 font-medium">
                    {month.label}
                    {month.current && <span className="font-normal text-muted-foreground"> · so far</span>}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="size-2 rounded-sm bg-primary" />
                    Spent <span className="ml-auto pl-3 font-semibold tabular-nums">PKR {formatPKR(month.spend)}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-muted-foreground">
                    <span className="size-2" />
                    Earned <span className="ml-auto pl-3 tabular-nums">PKR {formatPKR(month.income)}</span>
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="spend" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
