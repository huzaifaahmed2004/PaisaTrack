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
