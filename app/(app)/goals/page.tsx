"use client"

import { useState } from "react"
import { CheckCircle2, MoreHorizontal, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react"
import { useAccounts } from "@/hooks/use-accounts"
import { useGoals } from "@/hooks/use-goals"
import { useSpendable } from "@/hooks/use-spendable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GoalModal } from "@/components/goal-modal"
import { GoalFundsModal, type FundsMode } from "@/components/goal-funds-modal"
import { useConfirm } from "@/components/confirm-dialog"
import { Amount, Callout, EmptyState, PageHeader, StatCard } from "@/components/app-ui"
import { formatPKR, round2 } from "@/lib/money"
import { toast } from "sonner"
import type { Goal } from "@/lib/types"

/** A ring that fills as the plan is funded. */
function ProgressRing({ value, done }: { value: number; done?: boolean }) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative size-14 shrink-0">
      <svg viewBox="0 0 52 52" className="size-14 -rotate-90">
        <circle cx="26" cy="26" r={radius} fill="none" stroke="var(--muted)" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke={done ? "var(--positive)" : "var(--primary)"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(value, 100) / 100)}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
        {Math.round(value)}%
      </span>
    </div>
  )
}

export default function GoalsPage() {
  const { accounts } = useAccounts()
  const { goals, activeGoals, completedGoals, totalReserved, totalTargets, deleteGoal } = useGoals()
  const { reservedForBills, freeToSpend, holdLabel } = useSpendable()
  const confirm = useConfirm()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [fundsOpen, setFundsOpen] = useState(false)
  const [fundsMode, setFundsMode] = useState<FundsMode>("add")
  const [fundsGoal, setFundsGoal] = useState<Goal | null>(null)

  // Balance that neither a plan nor an upcoming bill has claimed.
  const availableToReserve = freeToSpend
  const stillNeeded = round2(
    activeGoals.reduce((sum, goal) => sum + Math.max(goal.targetAmount - goal.savedAmount, 0), 0),
  )

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openFunds = (goal: Goal, mode: FundsMode) => {
    setFundsGoal(goal)
    setFundsMode(mode)
    setFundsOpen(true)
  }

  const handleDelete = async (goal: Goal) => {
    const ok = await confirm({
      title: `Delete "${goal.name}"?`,
      description: `${
        goal.savedAmount > 0
          ? `The PKR ${formatPKR(goal.savedAmount)} it is holding goes back to your spendable balance - no cash moves. `
          : ""
      }This cannot be undone.`,
      confirmLabel: "Delete plan",
      destructive: true,
    })
    if (!ok) return

    try {
      await deleteGoal(goal.id)
      toast.success("Plan deleted")
    } catch (error: any) {
      console.error("Failed to delete goal:", error)
      toast.error(error?.message || "Failed to delete plan")
    }
  }

  const renderGoal = (goal: Goal) => {
    const progress = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0
    const remaining = round2(Math.max(goal.targetAmount - goal.savedAmount, 0))
    const reached = remaining === 0
    const account = accounts.find((entry) => entry.id === goal.accountId)
    const done = goal.status === "completed"

    // What to put aside each month to arrive on time.
    const monthsLeft = goal.targetDate
      ? Math.max(
          (goal.targetDate.getFullYear() - new Date().getFullYear()) * 12 +
            goal.targetDate.getMonth() -
            new Date().getMonth(),
          1,
        )
      : null
    const perMonth = monthsLeft && !reached && !done ? round2(remaining / monthsLeft) : null

    return (
      <div key={goal.id} className="flex flex-col rounded-2xl border bg-card p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <ProgressRing value={progress} done={done || reached} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{goal.name}</p>
              {done ? (
                <Badge variant="muted">done</Badge>
              ) : reached ? (
                <Badge variant="positive">target reached</Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm">
              <Amount value={goal.savedAmount} className="font-semibold" />
              <span className="text-muted-foreground">
                {" "}
                of <Amount value={goal.targetAmount} />
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[
                goal.targetDate && `by ${goal.targetDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`,
                account && `kept in ${account.name}`,
              ]
                .filter(Boolean)
                .join(" · ")}
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
                  setEditing(goal)
                  setFormOpen(true)
                }}
              >
                <Pencil />
                Edit
              </DropdownMenuItem>
              {goal.savedAmount > 0 && (
                <DropdownMenuItem onSelect={() => openFunds(goal, "release")}>Release money</DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(goal)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {goal.description && <p className="mt-3 text-sm text-muted-foreground break-words">{goal.description}</p>}

        {!done && (
          <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            {reached ? (
              "Fully funded - spend it when you are ready."
            ) : (
              <>
                <Amount value={remaining} className="font-medium text-foreground" /> to go
                {perMonth !== null && (
                  <>
                    {" "}
                    · about <Amount value={perMonth} className="font-medium text-foreground" /> a month to make it
                  </>
                )}
              </>
            )}
          </p>
        )}

        <div className="mt-auto flex gap-2 pt-4">
          {goal.status === "active" && (
            <Button size="sm" className="flex-1" onClick={() => openFunds(goal, "add")}>
              Set aside
            </Button>
          )}
          {goal.savedAmount > 0 && (
            <Button size="sm" variant="outline" className="flex-1" onClick={() => openFunds(goal, "spend")}>
              Spend it
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Savings plans"
        description="Money put aside for things you are planning. It stays in its account."
        actions={
          <Button onClick={openNew}>
            <Plus />
            New plan
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
        <StatCard
          label="Set aside"
          value={<Amount value={totalReserved} />}
          hint={`Across ${goals.length} plan${goals.length !== 1 ? "s" : ""}`}
          tone="primary"
          icon={PiggyBank}
        />
        <StatCard
          label="Free to spend"
          value={<Amount value={availableToReserve} />}
          hint={
            reservedForBills > 0
              ? `After plans, and PKR ${formatPKR(reservedForBills)} ${holdLabel}`
              : "Balance no plan has claimed"
          }
          tone={availableToReserve < 0 ? "negative" : "default"}
        />
        <StatCard
          label="Still needed"
          value={<Amount value={stillNeeded} />}
          hint={`To finish ${activeGoals.length} plan${activeGoals.length !== 1 ? "s" : ""} worth PKR ${formatPKR(totalTargets)}`}
        />
      </div>

      {availableToReserve < 0 && (
        <Callout tone="negative">
          Your plans and upcoming bills need <Amount value={Math.abs(availableToReserve)} className="font-semibold" />{" "}
          more than your accounts hold. Release that much from a plan, or record income that has not been added yet, to
          line things up again.
        </Callout>
      )}

      {activeGoals.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{activeGoals.map(renderGoal)}</div>
      ) : (
        <div className="rounded-2xl border bg-card">
          <EmptyState
            icon={PiggyBank}
            title="Nothing set aside yet"
            description="Put money aside for the things you are planning - a laptop, a trip, an emergency fund."
            action={
              <Button onClick={openNew}>
                <Plus />
                Create your first plan
              </Button>
            }
          />
        </div>
      )}

      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="size-4 text-positive" />
            Done
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{completedGoals.map(renderGoal)}</div>
        </div>
      )}

      <GoalModal open={formOpen} onOpenChange={setFormOpen} goal={editing} onClose={() => setEditing(null)} />
      <GoalFundsModal
        open={fundsOpen}
        onOpenChange={setFundsOpen}
        goal={fundsGoal}
        mode={fundsMode}
        availableToReserve={availableToReserve}
        onClose={() => setFundsGoal(null)}
      />
    </div>
  )
}
