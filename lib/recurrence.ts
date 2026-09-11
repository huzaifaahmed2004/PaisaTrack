import { round2, toAmount } from "@/lib/money"

/**
 * Monthly recurrence helpers.
 *
 * A subscription is pinned to a day of the month. Months are not all the same
 * length, so a bill due on the 31st falls on the 28th in February and returns
 * to the 31st the month after - the chosen day is never lost.
 */

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** The given day of that month, pulled back to the last day when it overflows. */
export function dueDateIn(year: number, monthIndex: number, dayOfMonth: number): Date {
  const day = Math.min(Math.max(Math.round(dayOfMonth), 1), daysInMonth(year, monthIndex))
  return new Date(year, monthIndex, day)
}

/** The same billing day, `months` months along. */
export function addMonths(date: Date, dayOfMonth: number, months = 1): Date {
  return dueDateIn(date.getFullYear(), date.getMonth() + months, dayOfMonth)
}

export function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** The next time this bill falls due, counting today as still due. */
export function firstDueOnOrAfter(dayOfMonth: number, from: Date = startOfToday()): Date {
  const anchor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const thisMonth = dueDateIn(anchor.getFullYear(), anchor.getMonth(), dayOfMonth)
  return thisMonth < anchor ? addMonths(thisMonth, dayOfMonth, 1) : thisMonth
}

/** Whole days from today to the due date: negative once it is overdue. */
export function daysUntilDue(dueDate: Date): number {
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  return Math.round((due.getTime() - startOfToday().getTime()) / 86_400_000)
}

export type DueStatus = "overdue" | "due-today" | "due-soon" | "upcoming"

export function dueStatus(dueDate: Date): DueStatus {
  const days = daysUntilDue(dueDate)
  if (days < 0) return "overdue"
  if (days === 0) return "due-today"
  if (days <= 7) return "due-soon"
  return "upcoming"
}

export function dueStatusLabel(dueDate: Date): string {
  const days = daysUntilDue(dueDate)
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`
  if (days === 0) return "Due today"
  if (days === 1) return "Due tomorrow"
  return `Due in ${days} days`
}

/** "2026-09" - identifies which month's charge a payment covers. */
export function billingPeriod(dueDate: Date): string {
  return `${dueDate.getFullYear()}-${`${dueDate.getMonth() + 1}`.padStart(2, "0")}`
}

export function billingPeriodLabel(dueDate: Date): string {
  return dueDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

export function ordinalDay(day: number): string {
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][day % 10] ?? "th"
  return `${day}${suffix}`
}

/** The days of the month a salary usually lands on, e.g. 7 to 13. */
export type PayWindow = { earliestDay: number; latestDay: number }

/**
 * Bills are held until the money that will pay them arrives.
 *
 * With no salary window, that is the end of the calendar month. With one, it is
 * the latest day the next salary could land. Before the window opens this
 * month, the money in hand must last until the latest payday of this month.
 * Once it opens the salary may already be in, so bills up to the latest payday
 * of next month are held from it. Holding a few days early is deliberate:
 * overstating free money is the costlier mistake.
 */
export function holdHorizon(window: PayWindow | null, today: Date = startOfToday()): Date {
  if (!window) {
    return new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  const monthOffset = today.getDate() < window.earliestDay ? 0 : 1
  const horizon = dueDateIn(today.getFullYear(), today.getMonth() + monthOffset, window.latestDay)
  horizon.setHours(23, 59, 59, 999)
  return horizon
}

/**
 * Money spoken for by bills before the horizon. Every charge in the window
 * counts - an overdue bill and the charge after it are both covered - so paying
 * one always lowers the hold by exactly what left the account.
 */
export function billsHeld<T extends { amount: number; dayOfMonth: number; nextDueDate: Date; active: boolean }>(
  subscriptions: T[],
  window: PayWindow | null,
  today: Date = startOfToday(),
): { horizon: Date; held: { subscription: T; charges: number }[]; total: number } {
  const horizon = holdHorizon(window, today)
  const held: { subscription: T; charges: number }[] = []
  let total = 0

  for (const subscription of subscriptions) {
    if (!subscription.active) continue

    let charges = 0
    let due = subscription.nextDueDate
    // The cap only guards against a record left unpaid for years.
    while (due <= horizon && charges < 24) {
      charges++
      due = addMonths(due, subscription.dayOfMonth, 1)
    }

    if (charges > 0) {
      held.push({ subscription, charges })
      total += toAmount(subscription.amount) * charges
    }
  }

  return { horizon, held, total: round2(total) }
}

/**
 * The period budgets reset on. With a salary window it runs from the earliest
 * payday to the day before the next one, so each salary funds one period.
 * Without one it is the calendar month.
 */
export function budgetPeriod(window: PayWindow | null, today: Date = startOfToday()): { start: Date; end: Date } {
  if (!window) {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999),
    }
  }

  const monthOffset = today.getDate() >= window.earliestDay ? 0 : -1
  const start = dueDateIn(today.getFullYear(), today.getMonth() + monthOffset, window.earliestDay)
  const nextStart = dueDateIn(start.getFullYear(), start.getMonth() + 1, window.earliestDay)
  return { start, end: new Date(nextStart.getTime() - 1) }
}
