"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAccounts } from "@/hooks/use-accounts"
import { useGoals } from "@/hooks/use-goals"
import { useSpendable } from "@/hooks/use-spendable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { GoalModal } from "@/components/goal-modal"
import { GoalFundsModal, type FundsMode } from "@/components/goal-funds-modal"
import { Loader2, ArrowLeft, Plus, Edit, Trash2, PiggyBank, Target } from "lucide-react"
import { formatPKR, round2 } from "@/lib/money"
import { toast } from "sonner"
import type { Goal } from "@/lib/types"

export default function GoalsPage() {
  const { user, loading } = useAuth()
  const { accounts } = useAccounts()
  const { goals, activeGoals, completedGoals, totalReserved, totalTargets, deleteGoal } = useGoals()
  const { reservedForBills, freeToSpend, holdLabel } = useSpendable()
  const router = useRouter()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [fundsOpen, setFundsOpen] = useState(false)
  const [fundsMode, setFundsMode] = useState<FundsMode>("add")
  const [fundsGoal, setFundsGoal] = useState<Goal | null>(null)

  useEffect(() => {
    if (!user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  // Balance that neither a plan nor an upcoming bill has claimed.
  const availableToReserve = freeToSpend

  const openFunds = (goal: Goal, mode: FundsMode) => {
    setFundsGoal(goal)
    setFundsMode(mode)
    setFundsOpen(true)
  }

  const handleDelete = async (goal: Goal) => {
    const held =
      goal.savedAmount > 0
        ? ` The PKR ${formatPKR(goal.savedAmount)} it is holding goes back to your spendable balance - no cash moves.`
        : ""

    if (!confirm(`Delete "${goal.name}"?${held} This cannot be undone.`)) return

    try {
      await deleteGoal(goal.id)
      toast.success("Plan deleted")
    } catch (error: any) {
      console.error("Failed to delete goal:", error)
      toast.error(error?.message || "Failed to delete plan")
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const renderGoal = (goal: Goal) => {
    const progress = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0
    const remaining = round2(Math.max(goal.targetAmount - goal.savedAmount, 0))
    const reached = remaining === 0
    const account = accounts.find((entry) => entry.id === goal.accountId)

    return (
      <div key={goal.id} className="p-4 bg-muted rounded-lg space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold truncate">{goal.name}</h3>
              {goal.status === "completed" ? (
                <Badge variant="secondary" className="text-xs">
                  done
                </Badge>
              ) : reached ? (
                <Badge className="text-xs bg-green-600 hover:bg-green-600">target reached</Badge>
              ) : null}
            </div>
            {goal.description && <p className="text-sm text-muted-foreground break-words">{goal.description}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              {goal.targetDate && <span>by {goal.targetDate.toLocaleDateString()}</span>}
              {account && <span>kept in {account.name}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold whitespace-nowrap">PKR {formatPKR(goal.savedAmount)}</p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">of PKR {formatPKR(goal.targetAmount)}</p>
          </div>
        </div>

        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {reached ? "Fully funded" : `PKR ${formatPKR(remaining)} to go`} - {Math.round(progress)}%
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {goal.status === "active" && (
            <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={() => openFunds(goal, "add")}>
              Set Aside
            </Button>
          )}
          {goal.savedAmount > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => openFunds(goal, "spend")}>
                Spend It
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openFunds(goal, "release")}>
                Release
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(goal)
              setFormOpen(true)
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(goal)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Savings Plans</h1>
          </div>
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="bg-accent hover:bg-accent/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Set Aside</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">PKR {formatPKR(totalReserved)}</div>
              <p className="text-xs text-muted-foreground mt-1">Reserved across {goals.length} plan{goals.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Free to Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${availableToReserve < 0 ? "text-red-500" : ""}`}>
                PKR {formatPKR(availableToReserve)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {reservedForBills > 0
                  ? `After plans, and PKR ${formatPKR(reservedForBills)} ${holdLabel}`
                  : "Balance no plan has claimed"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Still Needed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                PKR{" "}
                {formatPKR(
                  round2(
                    activeGoals.reduce((sum, goal) => sum + Math.max(goal.targetAmount - goal.savedAmount, 0), 0),
                  ),
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                To finish {activeGoals.length} plan{activeGoals.length !== 1 ? "s" : ""} worth PKR{" "}
                {formatPKR(totalTargets)}
              </p>
            </CardContent>
          </Card>
        </div>

        {availableToReserve < 0 && (
          <Card className="border-destructive/40">
            <CardContent className="pt-6">
              <p className="text-sm">
                Your plans and upcoming bills need PKR {formatPKR(Math.abs(availableToReserve))} more than your
                accounts hold. Release that much from a plan, or record income that has not been added yet, to line
                things up again.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {activeGoals.length > 0 ? (
              <div className="space-y-4">{activeGoals.map(renderGoal)}</div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <PiggyBank className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nothing set aside yet</h3>
                <p className="text-sm mb-4">
                  Put money aside for the things you are planning - a laptop, a trip, an emergency fund.
                </p>
                <Button
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                  className="bg-accent hover:bg-accent/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {completedGoals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Done
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">{completedGoals.map(renderGoal)}</CardContent>
          </Card>
        )}
      </main>

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
