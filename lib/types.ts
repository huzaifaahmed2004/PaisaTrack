export type AccountType = "cash" | "bank" | "wallet" | "other"

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  accountId: string
  type: "income" | "spend" | "loan-given" | "loan-taken"
  amount: number
  description: string
  date: Date
  createdAt: Date
  /** Set on entries created by a loan, so both stay in sync. */
  loanId?: string
  /** Which side of the loan this entry records. */
  loanEntry?: "disbursement" | "settlement"
  /** Shared by the two legs of a transfer, so they are removed together. */
  transferId?: string
  /** Set on entries created by paying a subscription. */
  subscriptionId?: string
  /** Which month's charge this entry paid, as "2026-09". */
  subscriptionPeriod?: string
  /** Set on entries that spent money saved up for a goal. */
  goalId?: string
  /** The budget an ordinary expense counts against, if any. Moves no money. */
  budgetId?: string
}

export interface Loan {
  id: string
  type: "given" | "taken"
  personName: string
  amount: number
  description: string
  status: "pending" | "settled"
  date: Date
  createdAt: Date
  settledAt?: Date
  /** The account the money moved through. Absent on carried-over loans. */
  accountId?: string
  /**
   * A loan that already existed before it was recorded here. The cash moved
   * long ago, so it changes no balance now - but it is still outstanding, and
   * settling it moves money for real.
   */
  carriedOver?: boolean
}

/** A bill that comes round every month on the same day. */
export interface Subscription {
  id: string
  name: string
  amount: number
  /** Day of the month it falls due, clamped to short months. */
  dayOfMonth: number
  /** The account it is usually paid from. Chosen again at payment time. */
  accountId?: string
  description?: string
  /** Paused subscriptions stay in the list but stop coming due. */
  active: boolean
  nextDueDate: Date
  lastPaidAt?: Date
  /** The due date the last payment covered, so it can be undone. */
  lastPaidDue?: Date
  /** The ledger entry the last payment wrote. */
  lastPaymentId?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Money put aside for a plan. The cash stays in its account - a goal only
 * reserves part of the balance so it is not counted as free to spend.
 */
export interface Goal {
  id: string
  name: string
  /** What the plan costs. */
  targetAmount: number
  /** How much is set aside for it so far. */
  savedAmount: number
  description?: string
  /** Where the money is being kept, for your own reference. */
  accountId?: string
  targetDate?: Date
  status: "active" | "completed"
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * A spending limit for one kind of expense, per budget cycle. It never moves
 * money - it only compares tagged expenses against the limit.
 */
export interface Budget {
  id: string
  name: string
  /** How much the user means to spend on this each cycle. */
  limit: number
  createdAt: Date
  updatedAt: Date
}

export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
}
