"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAccounts } from "@/hooks/use-accounts"
import { useBudgets } from "@/hooks/use-budgets"
import { useTransactions } from "@/hooks/use-transactions"
import { formatPKR, parseDateInput, toDateInput } from "@/lib/money"
import { toast } from "sonner"
import type { Transaction } from "@/lib/types"

interface EditTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  onClose: () => void
}

// Radix Select cannot use an empty string as an item value.
const NO_BUDGET = "none"

export function EditTransactionModal({ open, onOpenChange, transaction, onClose }: EditTransactionModalProps) {
  const { accounts } = useAccounts()
  const { budgets } = useBudgets()
  const { updateTransaction } = useTransactions()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    accountId: "",
    type: "" as "income" | "spend" | "loan-given" | "loan-taken" | "",
    amount: "",
    description: "",
    date: "",
    budgetId: NO_BUDGET,
  })

  useEffect(() => {
    if (transaction) {
      setFormData({
        accountId: transaction.accountId,
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description,
        date: toDateInput(transaction.date),
        budgetId:
          transaction.budgetId && budgets.some((budget) => budget.id === transaction.budgetId)
            ? transaction.budgetId
            : NO_BUDGET,
      })
    }
    // Budgets load separately; re-sync once they arrive so the tag shows.
  }, [transaction, budgets])

  // Spending saved up for a plan is already counted there, so it takes no budget.
  const canBudget = formData.type === "spend" && budgets.length > 0 && !transaction?.goalId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transaction) return
    if (!formData.accountId) return toast.error("Please select an account")
    if (!formData.type) return toast.error("Please select a type")
    if (!formData.description.trim()) return toast.error("Please enter a description")

    const amount = Number.parseFloat(formData.amount)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount greater than 0")

    setLoading(true)
    try {
      // Reversing the old effect and applying the new one happens atomically
      // inside the hook, against the balances as they are stored right now.
      await updateTransaction(transaction, {
        accountId: formData.accountId,
        type: formData.type,
        amount,
        description: formData.description,
        date: parseDateInput(formData.date),
        // Changing the type away from an expense drops the budget tag.
        budgetId: canBudget && formData.budgetId !== NO_BUDGET ? formData.budgetId : "",
      })

      toast.success("Transaction updated")
      onOpenChange(false)
      onClose()
    } catch (error: any) {
      console.error("Error updating transaction:", error)
      toast.error(error?.message || "Failed to update transaction")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
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
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "income" | "spend" | "loan-given" | "loan-taken") =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="spend">Expense</SelectItem>
                <SelectItem value="loan-given">Loan Given</SelectItem>
                <SelectItem value="loan-taken">Loan Taken</SelectItem>
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
          {canBudget && (
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
                  {budgets.map((budget) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      {budget.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
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
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                onClose()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? "Updating..." : "Update Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
