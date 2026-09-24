"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAccounts } from "@/hooks/use-accounts"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { useSpendable } from "@/hooks/use-spendable"
import { PayWindowCard } from "@/components/pay-window-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SubscriptionModal } from "@/components/subscription-modal"
import { PaySubscriptionModal } from "@/components/pay-subscription-modal"
import { Loader2, ArrowLeft, Plus, Edit, Trash2, RefreshCw, Undo2, Pause, Play } from "lucide-react"
import { formatPKR } from "@/lib/money"
import { dueStatus, dueStatusLabel, ordinalDay } from "@/lib/recurrence"
import { toast } from "sonner"
import type { Subscription } from "@/lib/types"

export default function SubscriptionsPage() {
  const { user, loading } = useAuth()
  const { accounts } = useAccounts()
  const {
    subscriptions,
    activeSubscriptions,
    dueSubscriptions,
    monthlyTotal,
    dueTotal,
    setActive,
    deleteSubscription,
    undoLastPayment,
  } = useSubscriptions()
  const { reservedForBills, heldBills, holdUntil } = useSpendable()
  const router = useRouter()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [paying, setPaying] = useState<Subscription | null>(null)

  useEffect(() => {
    if (!user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleEdit = (subscription: Subscription) => {
    setEditing(subscription)
    setFormOpen(true)
  }

  const handlePay = (subscription: Subscription) => {
    setPaying(subscription)
    setPayOpen(true)
  }

  const handleUndo = async (subscription: Subscription) => {
    if (!confirm(`Undo the last payment for ${subscription.name}? The money goes back and it becomes due again.`)) {
      return
    }

    try {
      await undoLastPayment(subscription)
      toast.success("Payment undone")
    } catch (error: any) {
      console.error("Failed to undo payment:", error)
      toast.error(error?.message || "Failed to undo payment")
    }
  }

  const handleTogglePause = async (subscription: Subscription) => {
    try {
      await setActive(subscription, !subscription.active)
      toast.success(subscription.active ? "Subscription paused" : "Subscription resumed")
    } catch (error: any) {
      console.error("Failed to update subscription:", error)
      toast.error(error?.message || "Failed to update subscription")
    }
  }

  const handleDelete = async (subscription: Subscription) => {
    if (
      !confirm(
        `Delete ${subscription.name}? Payments you already recorded stay in your transaction history. This cannot be undone.`,
      )
    ) {
      return
    }

    try {
      await deleteSubscription(subscription.id)
      toast.success("Subscription deleted")
    } catch (error: any) {
      console.error("Failed to delete subscription:", error)
      toast.error(error?.message || "Failed to delete subscription")
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const renderCard = (subscription: Subscription) => {
    const status = dueStatus(subscription.nextDueDate)
    const isDue = subscription.active && (status === "overdue" || status === "due-today")
    const account = accounts.find((entry) => entry.id === subscription.accountId)

    return (
      <div
        key={subscription.id}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-start md:items-center gap-4 min-w-0">
          <div
            className={`p-2 rounded-full ${
              !subscription.active
                ? "bg-muted-foreground/20"
                : status === "overdue"
                  ? "bg-red-500/20"
                  : status === "due-today"
                    ? "bg-orange-500/20"
                    : "bg-accent/20"
            }`}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                !subscription.active
                  ? "text-muted-foreground"
                  : status === "overdue"
                    ? "text-red-500"
                    : status === "due-today"
                      ? "text-orange-500"
                      : "text-accent"
              }`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium truncate">{subscription.name}</h3>
            {subscription.description && (
              <p className="text-sm text-muted-foreground break-words">{subscription.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {ordinalDay(subscription.dayOfMonth)} of each month
              </span>
              {subscription.active ? (
                <Badge
                  variant={status === "overdue" ? "destructive" : status === "due-today" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {dueStatusLabel(subscription.nextDueDate)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  paused
                </Badge>
              )}
              {account && <span className="text-xs text-muted-foreground">via {account.name}</span>}
            </div>
            {subscription.lastPaidAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Last paid {subscription.lastPaidAt.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3">
          <p className="text-base sm:text-lg font-semibold whitespace-nowrap">
            PKR {formatPKR(subscription.amount)}
          </p>
          <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
            {subscription.active && (
              <Button
                size="sm"
                onClick={() => handlePay(subscription)}
                className={isDue ? "bg-accent hover:bg-accent/90" : ""}
                variant={isDue ? "default" : "outline"}
              >
                Mark Paid
              </Button>
            )}
            {subscription.lastPaymentId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUndo(subscription)}
                title="Undo the last payment"
                className="text-muted-foreground hover:text-foreground"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTogglePause(subscription)}
              title={subscription.active ? "Pause" : "Resume"}
              className="text-muted-foreground hover:text-foreground"
            >
              {subscription.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(subscription)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(subscription)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const notDue = activeSubscriptions.filter((subscription) => !dueSubscriptions.includes(subscription))
  const paused = subscriptions.filter((subscription) => !subscription.active)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Monthly Subscriptions</h1>
          </div>
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="bg-accent hover:bg-accent/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subscription
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Every Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">PKR {formatPKR(monthlyTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeSubscriptions.length} active subscription{activeSubscriptions.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Waiting to be Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dueTotal > 0 ? "text-orange-500" : ""}`}>
                PKR {formatPKR(dueTotal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dueSubscriptions.length} due or overdue
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Held for Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">PKR {formatPKR(reservedForBills)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {heldBills.length} bill{heldBills.length !== 1 ? "s" : ""} due by {holdUntil.toLocaleDateString()} - not
                free to spend
              </p>
            </CardContent>
          </Card>
        </div>

        <PayWindowCard reservedForBills={reservedForBills} holdUntil={holdUntil} />

        {dueSubscriptions.length > 0 && (
          <Card className="border-orange-500/40">
            <CardHeader>
              <CardTitle className="text-lg">Due now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Hit Mark Paid once the money has actually gone out - that is when it comes off your balance.
              </p>
              {dueSubscriptions.map(renderCard)}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            {notDue.length > 0 ? (
              <div className="space-y-3">{notDue.map(renderCard)}</div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  {activeSubscriptions.length > 0 ? "Nothing else coming up" : "No subscriptions yet"}
                </h3>
                <p className="text-sm mb-4">
                  Add the bills you pay every month - rent, internet, streaming, the gym.
                </p>
                <Button
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                  className="bg-accent hover:bg-accent/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subscription
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {paused.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Paused</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">{paused.map(renderCard)}</CardContent>
          </Card>
        )}
      </main>

      <SubscriptionModal
        open={formOpen}
        onOpenChange={setFormOpen}
        subscription={editing}
        onClose={() => setEditing(null)}
      />
      <PaySubscriptionModal
        open={payOpen}
        onOpenChange={setPayOpen}
        subscription={paying}
        onClose={() => setPaying(null)}
      />
    </div>
  )
}
