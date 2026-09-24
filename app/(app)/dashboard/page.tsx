"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CalendarClock,
  HandCoins,
  PieChart,
  PiggyBank,
  Plus,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAccounts } from "@/hooks/use-accounts"
import { useTransactions } from "@/hooks/use-transactions"
import { useLoans } from "@/hooks/use-loans"
import { useGoals } from "@/hooks/use-goals"
import { useSpendable } from "@/hooks/use-spendable"
import { useBudgets } from "@/hooks/use-budgets"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { Button } from "@/components/ui/button"
import { PaySubscriptionModal } from "@/components/pay-subscription-modal"
import { QUICK_ACTIONS, QuickActionTile, useQuickActions } from "@/components/app-shell"
import { Amount, EmptyState, Meter, Panel, budgetTone, toneText } from "@/components/app-ui"
import { SpendingChart } from "@/components/spending-chart"
import { TransactionRow } from "@/components/transaction-row"
import { dueStatus, dueStatusLabel } from "@/lib/recurrence"
import { accountTypeIcon, accountTypeLabel } from "@/lib/account-types"
import { flowBetween, greeting, monthBounds, monthlyFlow, percentChange } from "@/lib/insights"
import { formatPKR } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { Subscription } from "@/lib/types"

export default function DashboardPage() {
  const { user } = useAuth()
  const { accounts, totalBalance } = useAccounts()
  const { transactions, recentTransactions } = useTransactions()
  const { loans, netLoanAmount, totalGivenPending, totalTakenPending } = useLoans()
  const { subscriptions, dueSubscriptions, dueTotal, monthlyTotal, activeSubscriptions } = useSubscriptions()
  const { activeGoals, totalReserved } = useGoals()
  const { reservedForBills, freeToSpend } = useSpendable()
  const { usage: budgetUsage, totalSpent: budgetSpent, totalLimit: budgetLimit } = useBudgets()
  const { open, canRun } = useQuickActions()

  const [payingSubscription, setPayingSubscription] = useState<Subscription | null>(null)

  const months = useMemo(() => monthlyFlow(transactions, 6), [transactions])
  const thisMonth = months[months.length - 1]
  // Compare against the same stretch of last month, not all of it, so the
  // number is fair early in the month.
  const lastMonthToDate = useMemo(() => {
    const { start } = monthBounds(-1)
    const now = new Date()
    const end = new Date(start.getFullYear(), start.getMonth(), now.getDate(), 23, 59, 59, 999)
    return flowBetween(transactions, start, end)
  }, [transactions])
  const spendChange = percentChange(thisMonth?.spend ?? 0, lastMonthToDate.spend)

  // Balances already reflect cash that moved, so only the outstanding side of
  // each pending loan is added on top: what you are owed, less what you owe.
  const netWorth = totalBalance + netLoanAmount
  const overBudgets = budgetUsage.filter((entry) => entry.overBy > 0)
  const upcomingBills = activeSubscriptions
    .filter((subscription) => !dueSubscriptions.includes(subscription) && dueStatus(subscription.nextDueDate) === "due-soon")
    .sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime())
  const pausedCount = subscriptions.length - activeSubscriptions.length
  const hasAttention = dueSubscriptions.length > 0 || overBudgets.length > 0 || freeToSpend < 0

  // How the balance is spoken for, for the allocation bar in the hero.
  const allocation = [
    { key: "free", label: "Free", value: Math.max(freeToSpend, 0), className: "bg-white" },
    { key: "plans", label: "Savings", value: totalReserved, className: "bg-white/55" },
    { key: "bills", label: "Bills", value: reservedForBills, className: "bg-white/30" },
  ]
  const allocationTotal = allocation.reduce((sum, part) => sum + part.value, 0)

  const firstName = user?.displayName?.split(" ")[0] ?? ""

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {greeting()}
            {firstName && `, ${firstName}`}
          </h1>
        </div>
        <div className="hidden gap-2 md:flex">
          <Button variant="outline" onClick={() => open("income")} disabled={!canRun("income")}>
            Add income
          </Button>
          <Button onClick={() => open("spend")} disabled={!canRun("spend")}>
            <Plus />
            Add expense
          </Button>
        </div>
      </div>

      {/* Hero + this month */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-5 text-white shadow-lg md:p-7 lg:col-span-2">
          <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-sm text-white/75">Free to spend</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight md:text-5xl">
              <Amount value={freeToSpend} className={freeToSpend < 0 ? "text-red-100" : undefined} />
            </p>
            <p className="mt-1.5 text-sm text-white/70">
              {totalReserved + reservedForBills > 0
                ? "What is left after savings plans and upcoming bills"
                : "Nothing is set aside yet - all of it is yours to use"}
            </p>

            {allocationTotal > 0 && (
              <div className="mt-6 space-y-2.5">
                <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-white/10">
                  {allocation.map((part) =>
                    part.value > 0 ? (
                      <div
                        key={part.key}
                        className={cn("h-full first:rounded-l-full last:rounded-r-full", part.className)}
                        style={{ width: `${(part.value / allocationTotal) * 100}%` }}
                      />
                    ) : null,
                  )}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/80">
                  {allocation.map((part) => (
                    <span key={part.key} className="flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", part.className)} />
                      {part.label}
                      <Amount value={part.value} className="font-medium text-white" />
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
              <div>
                <p className="text-xs text-white/65">Total balance</p>
                <Amount value={totalBalance} className="text-lg font-semibold md:text-xl" />
              </div>
              <div>
                <p className="text-xs text-white/65">Net worth incl. loans</p>
                <Amount value={netWorth} className="text-lg font-semibold md:text-xl" />
              </div>
            </div>
          </div>
        </section>

        <Panel title="This month" description="Income and spending, excluding transfers and loans">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-positive/12 text-positive">
                <TrendingUp className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Money in</p>
                <Amount value={thisMonth?.income ?? 0} className="text-lg font-semibold" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-negative/12 text-negative">
                <TrendingDown className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Money out</p>
                <Amount value={thisMonth?.spend ?? 0} className="text-lg font-semibold" />
              </div>
              {spendChange !== null && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    spendChange > 0 ? "bg-negative/12 text-negative" : "bg-positive/12 text-positive",
                  )}
                  title="Compared with the same days last month"
                >
                  {spendChange > 0 ? "+" : ""}
                  {spendChange}%
                </span>
              )}
            </div>
            <div className="rounded-xl bg-muted/60 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Net this month</p>
              <Amount
                value={Math.abs(thisMonth?.net ?? 0)}
                sign={(thisMonth?.net ?? 0) < 0 ? "-" : "+"}
                className={cn("text-base font-semibold", (thisMonth?.net ?? 0) < 0 ? "text-negative" : "text-positive")}
              />
            </div>
          </div>
        </Panel>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 md:grid-cols-5 md:gap-3">
        {QUICK_ACTIONS.map((item) => (
          <QuickActionTile key={item.action} {...item} disabled={!canRun(item.action)} onClick={() => open(item.action)} />
        ))}
        <button
          type="button"
          onClick={() => open("assistant")}
          className="hidden flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-primary/8 px-2 py-3.5 text-xs font-medium text-primary transition-colors hover:bg-primary/12 md:flex"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          Just say it
        </button>
      </div>
      {accounts.length === 0 && (
        <p className="-mt-2 text-center text-xs text-muted-foreground">
          Add an account first to record transactions. Existing loans can be entered without one.
        </p>
      )}

      {/* Needs attention */}
      {hasAttention && (
        <Panel
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              Needs attention
            </span>
          }
          className="border-warning/30"
        >
          <div className="space-y-1">
            {freeToSpend < 0 && (
              <p className="rounded-xl bg-negative/8 px-3 py-2.5 text-sm">
                Your plans and upcoming bills need <Amount value={Math.abs(freeToSpend)} className="font-semibold" />{" "}
                more than your accounts hold.
              </p>
            )}
            {dueSubscriptions.map((subscription) => (
              <div key={subscription.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                  <CalendarClock className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{subscription.name}</p>
                  <p className="text-xs text-warning">{dueStatusLabel(subscription.nextDueDate)}</p>
                </div>
                <Amount value={subscription.amount} className="text-sm font-semibold" />
                <Button size="sm" onClick={() => setPayingSubscription(subscription)}>
                  Pay
                </Button>
              </div>
            ))}
            {overBudgets.map((entry) => (
              <Link
                key={entry.budget.id}
                href="/budgets"
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent/60"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-negative/12 text-negative">
                  <PieChart className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.budget.name} budget</p>
                  <p className="text-xs text-negative">
                    <Amount value={entry.overBy} /> over this cycle
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      {/* Spending trend + accounts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Spending"
          description="Last six months"
          href="/transactions"
          hrefLabel="Activity"
          className="lg:col-span-2"
        >
          {transactions.length > 0 ? (
            <SpendingChart data={months} />
          ) : (
            <EmptyState
              compact
              icon={ReceiptText}
              title="No spending yet"
              description="Your monthly spending will chart here once you record some."
            />
          )}
        </Panel>

        <Panel title="Accounts" href="/accounts" hrefLabel="Manage">
          {accounts.length > 0 ? (
            <div className="-mx-2 space-y-0.5">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
                    {accountTypeIcon(account.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">{accountTypeLabel(account.type)}</p>
                  </div>
                  <Amount value={account.balance} className="text-sm font-semibold" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Wallet}
              title="No accounts yet"
              description="Add cash, a bank or a wallet to get started."
              action={
                <Button size="sm" asChild>
                  <Link href="/accounts">
                    <Plus />
                    Add account
                  </Link>
                </Button>
              }
            />
          )}
        </Panel>
      </div>

      {/* Budgets + savings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Budgets"
          description={
            budgetUsage.length > 0 ? (
              <>
                <Amount value={budgetSpent} /> of <Amount value={budgetLimit} /> used this cycle
              </>
            ) : undefined
          }
          href="/budgets"
          hrefLabel="Manage"
        >
          {budgetUsage.length > 0 ? (
            <div className="space-y-4">
              {budgetUsage.slice(0, 4).map((entry) => {
                const over = entry.overBy > 0
                return (
                  <div key={entry.budget.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{entry.budget.name}</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        <Amount value={entry.spent} className={cn("font-semibold", over ? "text-negative" : "text-foreground")} />{" "}
                        / {formatPKR(entry.budget.limit)}
                      </span>
                    </div>
                    <Meter value={over ? 100 : entry.progress} tone={budgetTone(entry.progress, over)} />
                  </div>
                )
              })}
              {budgetUsage.length > 4 && (
                <p className="text-xs text-muted-foreground">+{budgetUsage.length - 4} more</p>
              )}
            </div>
          ) : (
            <EmptyState
              compact
              icon={PieChart}
              title="No budgets yet"
              description="Plan how much of your free money goes where."
            />
          )}
        </Panel>

        <Panel
          title="Savings plans"
          description={totalReserved > 0 ? <><Amount value={totalReserved} /> set aside</> : undefined}
          href="/goals"
          hrefLabel="Manage"
        >
          {activeGoals.length > 0 ? (
            <div className="space-y-4">
              {activeGoals.slice(0, 4).map((goal) => {
                const progress = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0
                return (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{goal.name}</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Meter value={progress} tone="primary" />
                    <p className="text-xs text-muted-foreground">
                      <Amount value={goal.savedAmount} className="font-medium text-foreground" /> of{" "}
                      <Amount value={goal.targetAmount} />
                    </p>
                  </div>
                )
              })}
              {activeGoals.length > 4 && <p className="text-xs text-muted-foreground">+{activeGoals.length - 4} more</p>}
            </div>
          ) : (
            <EmptyState
              compact
              icon={PiggyBank}
              title="No savings plans yet"
              description="Set money aside for the things you are planning."
            />
          )}
        </Panel>
      </div>

      {/* Activity + bills & loans */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Recent activity" href="/transactions" className="lg:col-span-2">
          {recentTransactions.length > 0 ? (
            <div className="-mx-2 space-y-0.5">
              {recentTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  accountName={accounts.find((account) => account.id === transaction.accountId)?.name}
                  showDate
                />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={ReceiptText}
              title="No transactions yet"
              description="Your recent transactions will appear here."
            />
          )}
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Bills"
            description={
              activeSubscriptions.length > 0 ? (
                <>
                  <Amount value={monthlyTotal} /> a month
                  {pausedCount > 0 && ` · ${pausedCount} paused`}
                </>
              ) : undefined
            }
            href="/subscriptions"
            hrefLabel="Manage"
          >
            {activeSubscriptions.length > 0 ? (
              dueSubscriptions.length === 0 && upcomingBills.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due in the next week.</p>
              ) : (
                <div className="space-y-2">
                  {dueTotal > 0 && (
                    <p className="text-sm font-medium text-warning">
                      <Amount value={dueTotal} /> waiting to be paid
                    </p>
                  )}
                  {upcomingBills.slice(0, 3).map((subscription) => (
                    <div key={subscription.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{subscription.name}</p>
                        <p className="text-xs text-muted-foreground">{dueStatusLabel(subscription.nextDueDate)}</p>
                      </div>
                      <Amount value={subscription.amount} className="font-semibold" />
                    </div>
                  ))}
                </div>
              )
            ) : (
              <EmptyState compact icon={CalendarClock} title="No bills yet" description="Track rent, internet and more." />
            )}
          </Panel>

          <Panel title="Loans" href="/loans" hrefLabel="View">
            {loans.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Owed to you</p>
                  <Amount value={totalGivenPending} className={cn("text-base font-semibold", toneText("positive"))} />
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">You owe</p>
                  <Amount value={totalTakenPending} className={cn("text-base font-semibold", toneText("negative"))} />
                </div>
              </div>
            ) : (
              <EmptyState compact icon={HandCoins} title="No loans recorded" />
            )}
          </Panel>
        </div>
      </div>

      <PaySubscriptionModal
        open={!!payingSubscription}
        onOpenChange={(next) => !next && setPayingSubscription(null)}
        subscription={payingSubscription}
        onClose={() => setPayingSubscription(null)}
      />
    </div>
  )
}
