"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccounts } from "@/hooks/use-accounts"
import { useGoals } from "@/hooks/use-goals"
import { formatPKR, parseDateInput, toDateInput } from "@/lib/money"
import { toast } from "sonner"
import type { Goal } from "@/lib/types"

export type FundsMode = "add" | "release" | "spend"

interface GoalFundsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal | null
  mode: FundsMode
  /** Balance not already reserved by another goal. */
  availableToReserve: number
  onClose?: () => void
}

const COPY: Record<FundsMode, { title: string; action: string }> = {
  add: { title: "Set Money Aside", action: "Set Aside" },
  release: { title: "Release Money", action: "Release" },
  spend: { title: "Spend on This Plan", action: "Confirm Spend" },
}

export function GoalFundsModal({
  open,
  onOpenChange,
  goal,
  mode,
  availableToReserve,
  onClose,
}: GoalFundsModalProps) {
  const { accounts } = useAccounts()
  const { addFunds, releaseFunds, spendFromGoal } = useGoals()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [accountId, setAccountId] = useState("")
  const [spentOn, setSpentOn] = useState(toDateInput(new Date()))

  useEffect(() => {
    if (!open || !goal) return

    // Sensible starting point: the shortfall when saving, the full pot when spending.
    const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0)
    setAmount(mode === "add" ? (remaining > 0 ? remaining.toString() : "") : goal.savedAmount.toString())
    setAccountId(goal.accountId || "")
    setSpentOn(toDateInput(new Date()))
  }, [open, goal, mode])

  const selectedAccount = accounts.find((account) => account.id === accountId)
  const value = Number.parseFloat(amount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal) return
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter an amount greater than 0")

    setLoading(true)
    try {
      if (mode === "add") {
        await addFunds(goal, value, availableToReserve)
        toast.success(`PKR ${formatPKR(value)} set aside for ${goal.name}`)
      } else if (mode === "release") {
        await releaseFunds(goal, value)
        toast.success(`PKR ${formatPKR(value)} released back`)
      } else {
        await spendFromGoal(goal, accountId, value, parseDateInput(spentOn))
        toast.success(`Spent PKR ${formatPKR(value)} on ${goal.name}`)
      }

      onOpenChange(false)
      onClose?.()
    } catch (error: any) {
      console.error("Goal funds action failed:", error)
      toast.error(error?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const description = !goal
    ? ""
    : mode === "add"
      ? `Reserves part of your balance for ${goal.name}. The money stays where it is - it just stops counting as free to spend. You have PKR ${formatPKR(availableToReserve)} not yet spoken for.`
      : mode === "release"
        ? `Frees up money ${goal.name} is holding so you can spend it on anything. No cash moves. This plan is holding PKR ${formatPKR(goal.savedAmount)}.`
        : `This is the real purchase: the money leaves the account you pick and is recorded as an expense. ${goal.name} is holding PKR ${formatPKR(goal.savedAmount)}.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY[mode].title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goalAmount">Amount (PKR)</Label>
            <Input
              id="goalAmount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            {mode === "add" && Number.isFinite(value) && value > availableToReserve && (
              <p className="text-xs text-destructive">
                Only PKR {formatPKR(availableToReserve)} of your balance is unreserved.
              </p>
            )}
            {mode !== "add" && goal && Number.isFinite(value) && value > goal.savedAmount && (
              <p className="text-xs text-destructive">
                This plan is only holding PKR {formatPKR(goal.savedAmount)}.
              </p>
            )}
          </div>

          {mode === "spend" && (
            <>
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
                {selectedAccount && Number.isFinite(value) && selectedAccount.balance < value && (
                  <p className="text-xs text-destructive">
                    This account only holds PKR {formatPKR(selectedAccount.balance)}.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="spentOn">Date</Label>
                <Input
                  id="spentOn"
                  type="date"
                  required
                  value={spentOn}
                  onChange={(e) => setSpentOn(e.target.value)}
                />
              </div>
            </>
          )}

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
              disabled={loading || !goal || (mode === "spend" && accounts.length === 0)}
              className="flex-1 bg-accent hover:bg-accent/90"
            >
              {loading ? "Working..." : COPY[mode].action}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
