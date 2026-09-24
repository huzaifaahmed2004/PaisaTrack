"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccounts } from "@/hooks/use-accounts"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { formatPKR, parseDateInput, toDateInput } from "@/lib/money"
import { billingPeriodLabel } from "@/lib/recurrence"
import { toast } from "sonner"
import type { Subscription } from "@/lib/types"

interface PaySubscriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: Subscription | null
  onClose?: () => void
}

export function PaySubscriptionModal({ open, onOpenChange, subscription, onClose }: PaySubscriptionModalProps) {
  const { accounts } = useAccounts()
  const { markPaid } = useSubscriptions()
  const [loading, setLoading] = useState(false)
  const [accountId, setAccountId] = useState("")
  const [paidOn, setPaidOn] = useState(toDateInput(new Date()))

  useEffect(() => {
    if (open && subscription) {
      setAccountId(subscription.accountId || "")
      setPaidOn(toDateInput(new Date()))
    }
  }, [open, subscription])

  const selectedAccount = accounts.find((account) => account.id === accountId)
  const shortfall = selectedAccount && subscription ? selectedAccount.balance < subscription.amount : false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subscription) return
    if (!accountId) return toast.error("Please select an account")

    setLoading(true)
    try {
      // This is the moment money actually leaves the account.
      await markPaid(subscription, accountId, parseDateInput(paidOn))
      toast.success(`${subscription.name} marked paid`)
      onOpenChange(false)
      onClose?.()
    } catch (error: any) {
      console.error("Failed to mark subscription paid:", error)
      toast.error(error?.message || "Failed to mark as paid")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
          <DialogDescription>
            {subscription
              ? `PKR ${formatPKR(subscription.amount)} for ${billingPeriodLabel(subscription.nextDueDate)} leaves the account you pick, and an expense is recorded.`
              : "Select a subscription to pay."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Paid from</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} (PKR {formatPKR(account.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accounts.length === 0 && (
              <p className="text-xs text-muted-foreground">Add an account first - the money has to come from somewhere.</p>
            )}
            {shortfall && (
              <p className="text-xs text-destructive">
                This account only holds PKR {formatPKR(selectedAccount!.balance)}.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidOn">Date paid</Label>
            <Input
              id="paidOn"
              type="date"
              required
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
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
            <Button
              type="submit"
              disabled={loading || !subscription || accounts.length === 0}
              className="flex-1"
            >
              {loading ? "Recording..." : "Confirm Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
