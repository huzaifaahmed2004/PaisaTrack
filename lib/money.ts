import type { Transaction } from "@/lib/types"

/**
 * Money helpers.
 *
 * Balances are stored as plain numbers, so repeated add/subtract cycles drift
 * (0.1 + 0.2 === 0.30000000000000004). Every write to a balance goes through
 * round2 so the stored value stays a clean 2-decimal amount.
 */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Coerces anything read from Firestore into a usable amount. */
export function toAmount(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function formatPKR(value: number): string {
  return round2(toAmount(value)).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/**
 * How a transaction moves the balance of its account.
 * Income and money borrowed come in; spending and money lent go out.
 */
export function balanceEffect(type: Transaction["type"], amount: number): number {
  const signed = type === "income" || type === "loan-taken" ? amount : -amount
  return round2(signed)
}

export function transactionSign(type: Transaction["type"]): "+" | "-" {
  return type === "income" || type === "loan-taken" ? "+" : "-"
}

/**
 * `<input type="date">` works in local time, but `new Date("2026-09-09")`
 * parses as UTC midnight - which is the previous day west of Greenwich.
 * These two keep the round trip on the user's own calendar day.
 */
export function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

export function toDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Start of the given local day - used as an inclusive "from" filter bound. */
export function startOfDay(value: string): Date {
  const date = parseDateInput(value)
  date.setHours(0, 0, 0, 0)
  return date
}

/** End of the given local day - so a "to" filter includes that day itself. */
export function endOfDay(value: string): Date {
  const date = parseDateInput(value)
  date.setHours(23, 59, 59, 999)
  return date
}
