"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, PieChart, Plus, Trash2 } from "lucide-react"
import { useBudgets } from "@/hooks/use-budgets"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BudgetModal } from "@/components/budget-modal"
import { useConfirm } from "@/components/confirm-dialog"
import { Amount, Callout, EmptyState, Meter, PageHeader, StatCard, budgetTone } from "@/components/app-ui"
import { formatPeriod, type BudgetUsage } from "@/lib/budget"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Budget } from "@/lib/types"

export default function BudgetsPage() {
  const {
    usage,
    period,
    payWindow,
    totalLimit,
    totalSpent,
    totalRemaining,
    unbudgetedSpend,
    unbudgeted,
    freeToSpend,
    deleteBudget,
  } = useBudgets()
  const confirm = useConfirm()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleDelete = async (budget: Budget) => {
    const ok = await confirm({
      title: `Delete the ${budget.name} budget?`,
      description: "Expenses already tagged with it stay in your history and count as unbudgeted.",
      confirmLabel: "Delete budget",
      destructive: true,
    })
    if (!ok) return

    try {
      await deleteBudget(budget.id)
      toast.success("Budget deleted")
    } catch (error: any) {
      console.error("Failed to delete budget:", error)
      toast.error(error?.message || "Failed to delete budget")
    }
  }

  // How far through the cycle today is, so each budget can be judged against pace.
  const cycleProgress = Math.min(
    Math.max(((Date.now() - period.start.getTime()) / (period.end.getTime() - period.start.getTime())) * 100, 0),
    100,
  )
  const overallProgress = totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0

  const renderBudget = (entry: BudgetUsage) => {
    const over = entry.overBy > 0
    const tone = budgetTone(entry.progress, over)

    return (
      <div key={entry.budget.id} className="rounded-2xl border bg-card p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{entry.budget.name}</p>
            <p className="text-xs text-muted-foreground">
              {entry.entries} expense{entry.entries !== 1 ? "s" : ""} this cycle
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-1 text-muted-foreground">
                <MoreHorizontal />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setEditing(entry.budget)
                  setFormOpen(true)
                }}
              >
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(entry.budget)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex items-baseline gap-1.5">
          <Amount value={entry.spent} className={cn("text-2xl font-semibold tracking-tight", over && "text-negative")} />
          <span className="text-sm text-muted-foreground">
            of <Amount value={entry.budget.limit} />
          </span>
        </div>

        <div className="relative mt-3">
          <Meter value={over ? 100 : entry.progress} tone={tone} className="h-2" />
          {/* Where spending "should" be if it were spread evenly over the cycle. */}
          <div
            className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/40"
            style={{ left: `${cycleProgress}%` }}
            title="Today"
          />
        </div>
        <p className={cn("mt-2 text-xs", over ? "font-medium text-negative" : "text-muted-foreground")}>
          {over ? (
            <>
              <Amount value={entry.overBy} /> over budget
            </>
          ) : (
            <>
              <Amount value={entry.remaining} /> left · {Math.round(entry.progress)}% used
            </>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Budgets"
        description={
          <>
            {formatPeriod(period)} · {payWindow ? "resets with each salary" : "resets each month"}
          </>
        }
        actions={
          <Button onClick={openNew}>
            <Plus />
            New budget
          </Button>
        }
      />

      {usage.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-xs md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Spent this cycle</p>
              <p className="mt-1">
                <Amount value={totalSpent} className="text-2xl font-semibold tracking-tight md:text-3xl" />
                <span className="text-sm text-muted-foreground">
                  {" "}
                  of <Amount value={totalLimit} />
                </span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{Math.round(cycleProgress)}% of the cycle gone</p>
          </div>
          <div className="relative mt-4">
            <Meter value={overallProgress} tone={budgetTone(overallProgress, totalSpent > totalLimit)} className="h-2.5" />
            <div
              className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-foreground/40"
              style={{ left: `${cycleProgress}%` }}
            />
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
        <StatCard
          label="Free to spend"
          value={<Amount value={freeToSpend} />}
          hint="After bills and savings plans"
          tone={freeToSpend < 0 ? "negative" : "default"}
        />
        <StatCard
          label="Left in budgets"
          value={<Amount value={totalRemaining} />}
          hint="Still available this cycle"
          tone="primary"
        />
        <StatCard
          label="Not budgeted"
          value={<Amount value={unbudgeted} />}
          hint="Free money no budget covers yet"
          tone={unbudgeted < 0 ? "negative" : "default"}
        />
      </div>

      {unbudgeted < 0 && (
        <Callout tone="negative">
          Your budgets have <Amount value={Math.abs(unbudgeted)} className="font-semibold" /> more left in them than you
          have free to spend. Lower a budget, or record income that has not been added yet, to line things up again.
        </Callout>
      )}

      {usage.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{usage.map(renderBudget)}</div>
      ) : (
        <div className="rounded-2xl border bg-card">
          <EmptyState
            icon={PieChart}
            title="No budgets yet"
            description="Decide how much of your free money goes to food, fuel, shopping and the rest."
            action={
              <Button onClick={openNew}>
                <Plus />
                Create your first budget
              </Button>
            }
          />
        </div>
      )}

      {unbudgetedSpend > 0 && (
        <p className="text-sm text-muted-foreground">
          <Amount value={unbudgetedSpend} className="font-medium text-foreground" /> was spent this cycle on expenses
          without a budget. Pick a budget when you add an expense to track it.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Budgets only track spending against a limit - they never move money. The marker on each bar shows how far
        through the cycle you are.
      </p>

      <BudgetModal open={formOpen} onOpenChange={setFormOpen} budget={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
