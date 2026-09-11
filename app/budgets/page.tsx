"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useBudgets } from "@/hooks/use-budgets"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BudgetModal } from "@/components/budget-modal"
import { Loader2, ArrowLeft, Plus, Edit, Trash2, PieChart } from "lucide-react"
import { formatPeriod, type BudgetUsage } from "@/lib/budget"
import { formatPKR } from "@/lib/money"
import { toast } from "sonner"
import type { Budget } from "@/lib/types"

export default function BudgetsPage() {
  const { user, loading } = useAuth()
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
  const router = useRouter()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)

  useEffect(() => {
    if (!user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleDelete = async (budget: Budget) => {
    if (
      !confirm(
        `Delete the ${budget.name} budget? Expenses already tagged with it stay in your history and count as unbudgeted.`,
      )
    ) {
      return
    }

    try {
      await deleteBudget(budget.id)
      toast.success("Budget deleted")
    } catch (error: any) {
      console.error("Failed to delete budget:", error)
      toast.error(error?.message || "Failed to delete budget")
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const renderBudget = (entry: BudgetUsage) => {
    const over = entry.overBy > 0
    const near = !over && entry.progress >= 80

    return (
      <div key={entry.budget.id} className="p-4 bg-muted rounded-lg space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{entry.budget.name}</h3>
            <p className="text-xs text-muted-foreground">
              {entry.entries} expense{entry.entries !== 1 ? "s" : ""} this cycle
            </p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold whitespace-nowrap ${over ? "text-red-500" : ""}`}>
              PKR {formatPKR(entry.spent)}
            </p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">of PKR {formatPKR(entry.budget.limit)}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full transition-all ${
                over ? "bg-red-500" : near ? "bg-orange-500" : "bg-green-500"
              }`}
              style={{ width: `${over ? 100 : entry.progress}%` }}
            />
          </div>
          <p className={`text-xs ${over ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
            {over
              ? `PKR ${formatPKR(entry.overBy)} over budget`
              : `PKR ${formatPKR(entry.remaining)} left - ${Math.round(entry.progress)}% used`}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(entry.budget)
              setFormOpen(true)
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(entry.budget)}
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
            <h1 className="text-xl font-bold">Budgets</h1>
          </div>
          <Button onClick={openNew} className="bg-accent hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" />
            New Budget
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          This cycle: <span className="font-medium text-foreground">{formatPeriod(period)}</span>
          {payWindow ? " - resets with each salary" : " - resets each month"}. Budgets only track spending against a
          limit; they never move money.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Free to Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${freeToSpend < 0 ? "text-red-500" : ""}`}>
                PKR {formatPKR(freeToSpend)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">After bills and savings plans</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Left in Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">PKR {formatPKR(totalRemaining)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                PKR {formatPKR(totalSpent)} spent of PKR {formatPKR(totalLimit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Not Budgeted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${unbudgeted < 0 ? "text-red-500" : ""}`}>
                PKR {formatPKR(unbudgeted)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Free money no budget covers yet</p>
            </CardContent>
          </Card>
        </div>

        {unbudgeted < 0 && (
          <Card className="border-destructive/40">
            <CardContent className="pt-6">
              <p className="text-sm">
                Your budgets have PKR {formatPKR(Math.abs(unbudgeted))} more left in them than you have free to spend.
                Lower a budget, or record income that has not been added yet, to line things up again.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            {usage.length > 0 ? (
              <div className="space-y-4">{usage.map(renderBudget)}</div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <PieChart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No budgets yet</h3>
                <p className="text-sm mb-4">
                  Decide how much of your free money goes to food, fuel, shopping and the rest.
                </p>
                <Button onClick={openNew} className="bg-accent hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Budget
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {unbudgetedSpend > 0 && (
          <p className="text-sm text-muted-foreground">
            PKR {formatPKR(unbudgetedSpend)} was spent this cycle on expenses without a budget. Pick a budget when you
            add an expense to track it.
          </p>
        )}
      </main>

      <BudgetModal open={formOpen} onOpenChange={setFormOpen} budget={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
