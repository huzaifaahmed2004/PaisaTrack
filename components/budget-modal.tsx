"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBudgets } from "@/hooks/use-budgets"
import { formatPKR } from "@/lib/money"
import { toast } from "sonner"
import type { Budget } from "@/lib/types"

interface BudgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Passing a budget switches the dialog into edit mode. */
  budget?: Budget | null
  onClose?: () => void
}

const SUGGESTIONS = ["Food", "Groceries", "Fuel", "Eating out", "Shopping", "Transport"]

export function BudgetModal({ open, onOpenChange, budget, onClose }: BudgetModalProps) {
  const { budgets, addBudget, updateBudget, maxLimitFor } = useBudgets()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [limit, setLimit] = useState("")

  const isEditing = !!budget

  useEffect(() => {
    if (!open) return
    setName(budget?.name ?? "")
    setLimit(budget ? String(budget.limit) : "")
  }, [open, budget])

  const maxLimit = maxLimitFor(budget)
  const value = Number.parseFloat(limit)
  const raising = Number.isFinite(value) && value > (budget?.limit ?? 0)
  const tooHigh = raising && value > maxLimit

  const unusedSuggestions = SUGGESTIONS.filter(
    (suggestion) => !budgets.some((existing) => existing.name.trim().toLowerCase() === suggestion.toLowerCase()),
  )

  const close = () => {
    onOpenChange(false)
    onClose?.()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Checked in the order the fields are filled in: amount, then category.
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter an amount greater than 0")
    if (!name.trim()) return toast.error("Please pick a category")

    setLoading(true)
    try {
      if (budget) {
        await updateBudget(budget, { name, limit: value })
        toast.success("Budget updated")
      } else {
        await addBudget({ name, limit: value })
        toast.success("Budget created")
      }
      close()
    } catch (error: any) {
      console.error("Error saving budget:", error)
      toast.error(error?.message || "Failed to save budget")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Budget" : "New Budget"}</DialogTitle>
          <DialogDescription>
            A spending limit for each cycle. It moves no money - it only tracks what you spend against it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budgetLimit">Amount per cycle (PKR)</Label>
            <Input
              id="budgetLimit"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="0.00"
              className="h-11 text-base"
            />
            {tooHigh ? (
              <p className="text-xs text-destructive">
                That is more than your free-to-spend money allows - the most this budget can be is PKR{" "}
                {formatPKR(maxLimit)}.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">You can budget up to PKR {formatPKR(maxLimit)} here.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budgetName">Category</Label>
            <Input
              id="budgetName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Food, Fuel, Shopping"
              className="h-11 text-base"
            />
            {!isEditing && unusedSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {unusedSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setName(suggestion)}
                    className="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/70 active:bg-muted/60"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="h-11 flex-1 bg-accent hover:bg-accent/90">
              {loading ? "Saving..." : isEditing ? "Update Budget" : "Create Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
