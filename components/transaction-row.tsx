import type React from "react"
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarClock,
  HandCoins,
  PiggyBank,
  type LucideIcon,
} from "lucide-react"
import { Amount, IconBadge, toneText, type Tone } from "@/components/app-ui"
import { transactionSign } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/lib/types"

type Meta = { icon: LucideIcon; tone: Tone; kind: string }

/** How an entry is drawn: what it is, and which colour its amount wears. */
export function transactionMeta(transaction: Transaction): Meta {
  if (transaction.transferId) return { icon: ArrowLeftRight, tone: "info", kind: "Transfer" }
  if (transaction.loanId) {
    const settlement = transaction.loanEntry === "settlement"
    return {
      icon: HandCoins,
      tone: "warning",
      kind: settlement ? "Loan settled" : transaction.type === "loan-given" ? "Lent" : "Borrowed",
    }
  }
  if (transaction.subscriptionId) return { icon: CalendarClock, tone: "muted", kind: "Bill" }
  if (transaction.goalId) return { icon: PiggyBank, tone: "primary", kind: "Savings" }
  if (transaction.type === "income") return { icon: ArrowDownLeft, tone: "positive", kind: "Income" }
  return { icon: ArrowUpRight, tone: "negative", kind: "Expense" }
}

export function TransactionRow({
  transaction,
  accountName,
  budgetName,
  showDate,
  actions,
  className,
}: {
  transaction: Transaction
  accountName?: string
  budgetName?: string
  showDate?: boolean
  actions?: React.ReactNode
  className?: string
}) {
  const meta = transactionMeta(transaction)
  const sign = transactionSign(transaction.type)
  // Expenses stay in plain ink so the list is not a wall of red; money in is green.
  const amountTone: Tone = sign === "+" ? (meta.tone === "positive" ? "positive" : "default") : "default"

  return (
    <div className={cn("flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/60", className)}>
      <IconBadge icon={meta.icon} tone={meta.tone} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{transaction.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[
            meta.kind,
            accountName,
            budgetName,
            showDate && transaction.date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <Amount value={transaction.amount} sign={sign} className={cn("text-sm font-semibold", toneText(amountTone))} />
      {actions}
    </div>
  )
}
