"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAccounts } from "@/hooks/use-accounts"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { formatPKR } from "@/lib/money"
import { firstDueOnOrAfter, ordinalDay } from "@/lib/recurrence"
import { toast } from "sonner"
import type { Subscription } from "@/lib/types"

interface SubscriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Passing a subscription switches the dialog into edit mode. */
  subscription?: Subscription | null
  onClose?: () => void
}

const NO_ACCOUNT = "none"

export function SubscriptionModal({ open, onOpenChange, subscription, onClose }: SubscriptionModalProps) {
  const { accounts } = useAccounts()
  const { addSubscription, updateSubscription } = useSubscriptions()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    dayOfMonth: "1",
    accountId: NO_ACCOUNT,
    description: "",
  })

  const isEditing = !!subscription

  useEffect(() => {
    if (subscription) {
      setFormData({
        name: subscription.name,
        amount: subscription.amount.toString(),
        dayOfMonth: subscription.dayOfMonth.toString(),
        accountId: subscription.accountId || NO_ACCOUNT,
        description: subscription.description || "",
      })
    } else if (open) {
      setFormData({ name: "", amount: "", dayOfMonth: "1", accountId: NO_ACCOUNT, description: "" })
    }
  }, [subscription, open])

  const dayOfMonth = Number.parseInt(formData.dayOfMonth, 10)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return toast.error("Please enter a name")

    const amount = Number.parseFloat(formData.amount)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount greater than 0")
    if (!(dayOfMonth >= 1 && dayOfMonth <= 31)) return toast.error("Pick a billing day between 1 and 31")

    const payload = {
      name: formData.name.trim(),
      amount,
      dayOfMonth,
      accountId: formData.accountId === NO_ACCOUNT ? "" : formData.accountId,
      description: formData.description.trim(),
    }

    setLoading(true)
    try {
      if (subscription) {
        await updateSubscription(subscription, payload)
        toast.success("Subscription updated")
      } else {
        await addSubscription(payload)
        toast.success("Subscription added")
      }

      onOpenChange(false)
      onClose?.()
    } catch (error: any) {
      console.error("Error saving subscription:", error)
      toast.error(error?.message || "Failed to save subscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Subscription" : "Add Monthly Subscription"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Netflix, Internet bill, Gym"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (PKR)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dayOfMonth">Billing day</Label>
              <Input
                id="dayOfMonth"
                type="number"
                min="1"
                max="31"
                required
                value={formData.dayOfMonth}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
              />
            </div>
          </div>

          {dayOfMonth >= 1 && dayOfMonth <= 31 && (
            <p className="text-xs text-muted-foreground">
              Due the {ordinalDay(dayOfMonth)} of every month
              {!isEditing && ` - next on ${firstDueOnOrAfter(dayOfMonth).toLocaleDateString()}`}.
              {dayOfMonth > 28 && " In shorter months it falls on the last day."}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="account">Usual account (optional)</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ask me each time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ACCOUNT}>Ask me each time</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} (PKR {formatPKR(account.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only a default - no money moves until you mark a month as paid.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Anything worth remembering about this bill"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false)
                onClose?.()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? "Saving..." : isEditing ? "Update" : "Add Subscription"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
