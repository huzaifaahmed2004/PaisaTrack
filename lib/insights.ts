import { round2, toAmount } from "@/lib/money"
import type { Transaction } from "@/lib/types"

/**
 * Money that genuinely came in or went out. Transfers only move money between
 * your own accounts, and loan entries (lending, borrowing, settling) are owed
 * back, so neither counts as earning or spending.
 */
export function isCashFlow(transaction: Transaction): boolean {
  return (
    (transaction.type === "income" || transaction.type === "spend") && !transaction.transferId && !transaction.loanId
  )
}

export type Flow = { income: number; spend: number; net: number; count: number }

export function flowBetween(transactions: Transaction[], start: Date, end: Date): Flow {
  let income = 0
  let spend = 0
  let count = 0

  for (const transaction of transactions) {
    if (!isCashFlow(transaction) || transaction.date < start || transaction.date > end) continue
    count++
    if (transaction.type === "income") income += toAmount(transaction.amount)
    else spend += toAmount(transaction.amount)
  }

  return { income: round2(income), spend: round2(spend), net: round2(income - spend), count }
}

export function monthBounds(offset = 0, from: Date = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth() + offset, 1)
  const end = new Date(from.getFullYear(), from.getMonth() + offset + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export type MonthFlow = Flow & { key: string; label: string; current: boolean }

/** The last `months` calendar months, oldest first, ending with this one. */
export function monthlyFlow(transactions: Transaction[], months = 6): MonthFlow[] {
  return Array.from({ length: months }, (_, index) => {
    const offset = index - (months - 1)
    const { start, end } = monthBounds(offset)
    return {
      ...flowBetween(transactions, start, end),
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleDateString(undefined, { month: "short" }),
      current: offset === 0,
    }
  })
}

/** Percentage change, or null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function greeting(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 5) return "Good night"
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

/** "Today", "Yesterday", or a short date - for grouping activity by day. */
export function dayLabel(date: Date): string {
  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((startToday.getTime() - startDay.getTime()) / 86_400_000)

  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  })
}

export function groupByDay(transactions: Transaction[]) {
  const groups: { key: string; label: string; items: Transaction[]; net: number }[] = []

  for (const transaction of transactions) {
    const date = transaction.date
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    let group = groups[groups.length - 1]
    if (!group || group.key !== key) {
      group = { key, label: dayLabel(date), items: [], net: 0 }
      groups.push(group)
    }
    group.items.push(transaction)
    if (isCashFlow(transaction)) {
      group.net = round2(group.net + (transaction.type === "income" ? 1 : -1) * toAmount(transaction.amount))
    }
  }

  return groups
}
