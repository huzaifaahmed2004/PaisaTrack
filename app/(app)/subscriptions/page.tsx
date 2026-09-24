"use client"

import { useState } from "react"
import { CalendarClock, MoreHorizontal, Pause, Pencil, Play, Plus, Trash2, Undo2 } from "lucide-react"
import { useAccounts } from "@/hooks/use-accounts"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { useSpendable } from "@/hooks/use-spendable"
import { PayWindowCard } from "@/components/pay-window-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SubscriptionModal } from "@/components/subscription-modal"
import { PaySubscriptionModal } from "@/components/pay-subscription-modal"
import { useConfirm } from "@/components/confirm-dialog"
import { Amount, EmptyState, PageHeader, StatCard } from "@/components/app-ui"
import { dueStatus, dueStatusLabel, ordinalDay } from "@/lib/recurrence"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Subscription } from "@/lib/types"

export default function SubscriptionsPage() {
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
  const confirm = useConfirm()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [paying, setPaying] = useState<Subscription | null>(null)

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleEdit = (subscription: Subscription) => {
    setEditing(subscription)
    setFormOpen(true)
  }

  const handlePay = (subscription: Subscription) => {
    setPaying(subscription)
    setPayOpen(true)
  }

  const handleUndo = async (subscription: Subscription) => {
    const ok = await confirm({
      title: `Undo the last payment for ${subscription.name}?`,
      description: "The money goes back and it becomes due again.",
      confirmLabel: "Undo payment",
    })
    if (!ok) return

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
      toast.success(subscription.active ? "Bill paused" : "Bill resumed")
    } catch (error: any) {
      console.error("Failed to update subscription:", error)
      toast.error(error?.message || "Failed to update bill")
    }
  }

  const handleDelete = async (subscription: Subscription) => {
    const ok = await confirm({
      title: `Delete ${subscription.name}?`,
      description: "Payments you already recorded stay in your transaction history. This cannot be undone.",
      confirmLabel: "Delete bill",
      destructive: true,
    })
    if (!ok) return

    try {
      await deleteSubscription(subscription.id)
      toast.success("Bill deleted")
    } catch (error: any) {
      console.error("Failed to delete subscription:", error)
      toast.error(error?.message || "Failed to delete bill")
    }
  }

  const renderRow = (subscription: Subscription) => {
    const status = dueStatus(subscription.nextDueDate)
    const isDue = subscription.active && (status === "overdue" || status === "due-today")
    const account = accounts.find((entry) => entry.id === subscription.accountId)
    const due = subscription.nextDueDate

    return (
      <div
        key={subscription.id}
        className={cn(
          "flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-accent/60",
          !subscription.active && "opacity-60",
        )}
      >
        {/* A tear-off calendar date: the day it falls due. */}
        <div
          className={cn(
            "flex size-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border text-center leading-none",
            isDue && status === "overdue" && "border-negative/40 bg-negative/8",
            isDue && status === "due-today" && "border-warning/40 bg-warning/8",
          )}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            {due.toLocaleDateString(undefined, { month: "short" })}
          </span>
          <span className="mt-0.5 text-base font-semibold tabular-nums">{due.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium">{subscription.name}</p>
            {subscription.active ? (
              <Badge variant={status === "overdue" ? "negative" : status === "due-today" ? "warning" : status === "due-soon" ? "info" : "muted"}>
                {dueStatusLabel(due)}
              </Badge>
            ) : (
              <Badge variant="outline">paused</Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {[
              `${ordinalDay(subscription.dayOfMonth)} of each month`,
              account && `via ${account.name}`,
              subscription.lastPaidAt && `last paid ${subscription.lastPaidAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Amount value={subscription.amount} className="text-sm font-semibold" />
        {subscription.active && (
          <Button
            size="sm"
            variant={isDue ? "default" : "outline"}
            onClick={() => handlePay(subscription)}
            className={cn(!isDue && "hidden sm:inline-flex")}
          >
            Pay
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground">
              <MoreHorizontal />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {subscription.active && !isDue && (
              <DropdownMenuItem onSelect={() => handlePay(subscription)} className="sm:hidden">
                <CalendarClock />
                Mark paid
              </DropdownMenuItem>
            )}
            {subscription.lastPaymentId && (
              <DropdownMenuItem onSelect={() => handleUndo(subscription)}>
                <Undo2 />
                Undo last payment
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => handleTogglePause(subscription)}>
              {subscription.active ? <Pause /> : <Play />}
              {subscription.active ? "Pause" : "Resume"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleEdit(subscription)}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(subscription)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const notDue = activeSubscriptions.filter((subscription) => !dueSubscriptions.includes(subscription))
  const paused = subscriptions.filter((subscription) => !subscription.active)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bills"
        description="Rent, internet, streaming and everything else that comes round each month"
        actions={
          <Button onClick={openNew}>
            <Plus />
            Add bill
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard
          label="Every month"
          value={<Amount value={monthlyTotal} />}
          hint={`${activeSubscriptions.length} active bill${activeSubscriptions.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Waiting to be paid"
          value={<Amount value={dueTotal} />}
          hint={`${dueSubscriptions.length} due or overdue`}
          tone={dueTotal > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Held for bills"
          value={<Amount value={reservedForBills} />}
          hint={`${heldBills.length} due by ${holdUntil.toLocaleDateString(undefined, { day: "numeric", month: "short" })} - not free to spend`}
          tone="primary"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {dueSubscriptions.length > 0 && (
        <section className="rounded-2xl border border-warning/30 bg-card p-3 shadow-xs md:p-4">
          <div className="px-2 pb-2">
            <h2 className="font-semibold">Due now</h2>
            <p className="text-xs text-muted-foreground">
              Hit Pay once the money has actually gone out - that is when it comes off your balance.
            </p>
          </div>
          <div className="space-y-0.5">{dueSubscriptions.map(renderRow)}</div>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-3 shadow-xs md:p-4">
        <h2 className="px-2 pb-2 font-semibold">Upcoming</h2>
        {notDue.length > 0 ? (
          <div className="space-y-0.5">{notDue.map(renderRow)}</div>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title={activeSubscriptions.length > 0 ? "Nothing else coming up" : "No bills yet"}
            description="Add the bills you pay every month - rent, internet, streaming, the gym."
            action={
              <Button onClick={openNew}>
                <Plus />
                Add bill
              </Button>
            }
          />
        )}
      </section>

      {paused.length > 0 && (
        <section className="rounded-2xl border bg-card p-3 shadow-xs md:p-4">
          <h2 className="px-2 pb-2 font-semibold">Paused</h2>
          <div className="space-y-0.5">{paused.map(renderRow)}</div>
        </section>
      )}

      <PayWindowCard reservedForBills={reservedForBills} holdUntil={holdUntil} />

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
