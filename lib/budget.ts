import { round2, toAmount } from "@/lib/money"
import type { Budget, Transaction } from "@/lib/types"

export type BudgetPeriod = { start: Date; end: Date }

export type BudgetUsage = {
  budget: Budget
  spent: number
  remaining: number
  overBy: number
  /** 0 to 100, capped - use overBy to tell when a budget is blown. */
  progress: number
  entries: number
}

/**
 * Only ordinary expenses count against a budget. Transfers, bill payments, loan
 * settlements and spending saved up for a plan are already accounted for
 * elsewhere, so counting them here would count the same money twice.
 */
export function isBudgetableSpend(transaction: Transaction): boolean {
  return (
    transaction.type === "spend" &&
    !transaction.transferId &&
    !transaction.subscriptionId &&
    !transaction.goalId &&
    !transaction.loanId
  )
}

export function budgetUsage(budgets: Budget[], transactions: Transaction[], period: BudgetPeriod) {
  const inPeriod = transactions.filter(
    (transaction) =>
      isBudgetableSpend(transaction) && transaction.date >= period.start && transaction.date <= period.end,
  )
  const known = new Set(budgets.map((budget) => budget.id))
  const sum = (values: number[]) => round2(values.reduce((total, value) => total + value, 0))

  const usage: BudgetUsage[] = budgets.map((budget) => {
    const entries = inPeriod.filter((transaction) => transaction.budgetId === budget.id)
    const spent = sum(entries.map((transaction) => toAmount(transaction.amount)))
    const limit = round2(toAmount(budget.limit))

    return {
      budget,
      spent,
      remaining: round2(Math.max(limit - spent, 0)),
      overBy: round2(Math.max(spent - limit, 0)),
      progress: limit > 0 ? Math.min((spent / limit) * 100, 100) : 0,
      entries: entries.length,
    }
  })

  return {
    usage,
    totalLimit: sum(budgets.map((budget) => toAmount(budget.limit))),
    totalSpent: sum(usage.map((entry) => entry.spent)),
    totalRemaining: sum(usage.map((entry) => entry.remaining)),
    unbudgetedSpend: sum(
      inPeriod
        .filter((transaction) => !transaction.budgetId || !known.has(transaction.budgetId))
        .map((transaction) => toAmount(transaction.amount)),
    ),
  }
}

/**
 * How much one budget may still have left in it. What remains across all
 * budgets must fit inside free-to-spend money. Spending from a budget lowers
 * both by the same amount, so this only tightens when free money shrinks for
 * some other reason.
 */
export function budgetCapacity(freeToSpend: number, totalRemaining: number, ownRemaining = 0): number {
  return round2(freeToSpend - (totalRemaining - ownRemaining))
}

export function formatPeriod(period: BudgetPeriod): string {
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  return `${period.start.toLocaleDateString(undefined, options)} - ${period.end.toLocaleDateString(undefined, options)}`
}
