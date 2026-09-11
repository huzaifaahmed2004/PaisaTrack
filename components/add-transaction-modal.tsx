"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAccounts } from "@/hooks/use-accounts"
import { useBudgets } from "@/hooks/use-budgets"
import { useTransactions } from "@/hooks/use-transactions"
import { formatPKR, parseDateInput, round2, toDateInput } from "@/lib/money"
import { toast } from "sonner"

interface AddTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "income" | "spend"
}

// Radix Select cannot use an empty string as an item value.
const NO_BUDGET = "none"

export function AddTransactionModal({ open, onOpenChange, type }: AddTransactionModalProps) {
  const { accounts } = useAccounts()
  const { usage } = useBudgets()
  const { addTransaction } = useTransactions()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    accountId: "",
    amount: "",
    description: "",
    date: toDateInput(new Date()),
    budgetId: NO_BUDGET,
  })

  const selectedBudget = usage.find((entry) => entry.budget.id === formData.budgetId)
  const enteredAmount = Number.parseFloat(formData.amount)
  const wouldOverspend =
    selectedBudget && Number.isFinite(enteredAmount)
      ? round2(selectedBudget.spent + enteredAmount - selectedBudget.budget.limit)
      : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.accountId) return toast.error("Please select an account")
    if (!formData.amount) return toast.error("Please enter an amount")
    if (!formData.description.trim()) return toast.error("Please enter a description")

    const amount = Number.parseFloat(formData.amount)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount greater than 0")

    setLoading(true)
    try {
      // The balance moves inside the same atomic write as the entry itself.
      await addTransaction({
        accountId: formData.accountId,
        type,
        amount,
        description: formData.description,
        date: parseDateInput(formData.date),
        // A budget tag is bookkeeping only - it never changes the money flow.
        ...(type === "spend" && selectedBudget ? { budgetId: selectedBudget.budget.id } : {}),
      })

      // Reset form and close modal
      setFormData({
        accountId: "",
        amount: "",
        description: "",
        date: toDateInput(new Date()),
        budgetId: NO_BUDGET,
      })
      onOpenChange(false)
      toast.success(`${type === "income" ? "Income" : "Expense"} added`)
    } catch (error: any) {
      console.error("Error adding transaction:", error)
      toast.error(error?.message || "Failed to add transaction")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add {type === "income" ? "Income" : "Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">Account</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
            >
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
          </div>
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
          {type === "spend" && usage.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (optional)</Label>
              <Select
                value={formData.budgetId}
                onValueChange={(value) => setFormData({ ...formData, budgetId: value })}
              >
                <SelectTrigger id="budget">
                  <SelectValue placeholder="No budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BUDGET}>No budget</SelectItem>
                  {usage.map((entry) => (
                    <SelectItem key={entry.budget.id} value={entry.budget.id}>
                      {entry.budget.name} (
                      {entry.overBy > 0
                        ? `PKR ${formatPKR(entry.overBy)} over`
                        : `PKR ${formatPKR(entry.remaining)} left`}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBudget && wouldOverspend > 0 && (
                <p className="text-xs text-orange-500">
                  This takes {selectedBudget.budget.name} PKR {formatPKR(wouldOverspend)} over budget.
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was this for?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? "Adding..." : `Add ${type === "income" ? "Income" : "Expense"}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
