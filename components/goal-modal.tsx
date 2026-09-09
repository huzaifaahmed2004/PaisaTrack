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
import { useGoals } from "@/hooks/use-goals"
import { formatPKR, parseDateInput, toDateInput } from "@/lib/money"
import { toast } from "sonner"
import type { Goal } from "@/lib/types"

interface GoalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Passing a goal switches the dialog into edit mode. */
  goal?: Goal | null
  onClose?: () => void
}

const NO_ACCOUNT = "none"

export function GoalModal({ open, onOpenChange, goal, onClose }: GoalModalProps) {
  const { accounts } = useAccounts()
  const { addGoal, updateGoal } = useGoals()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    accountId: NO_ACCOUNT,
    targetDate: "",
    description: "",
  })

  const isEditing = !!goal

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        targetAmount: goal.targetAmount.toString(),
        accountId: goal.accountId || NO_ACCOUNT,
        targetDate: goal.targetDate ? toDateInput(goal.targetDate) : "",
        description: goal.description || "",
      })
    } else if (open) {
      setFormData({ name: "", targetAmount: "", accountId: NO_ACCOUNT, targetDate: "", description: "" })
    }
  }, [goal, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return toast.error("Please name this plan")

    const targetAmount = Number.parseFloat(formData.targetAmount)
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return toast.error("Enter a target greater than 0")
    }

    const payload = {
      name: formData.name.trim(),
      targetAmount,
      accountId: formData.accountId === NO_ACCOUNT ? "" : formData.accountId,
      description: formData.description.trim(),
      targetDate: formData.targetDate ? parseDateInput(formData.targetDate) : null,
    }

    setLoading(true)
    try {
      if (goal) {
        await updateGoal(goal, payload)
        toast.success("Plan updated")
      } else {
        await addGoal(payload)
        toast.success("Plan added")
      }

      onOpenChange(false)
      onClose?.()
    } catch (error: any) {
      console.error("Error saving goal:", error)
      toast.error(error?.message || "Failed to save plan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Plan" : "New Savings Plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">What are you saving for?</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., New laptop, Trip to Hunza, Emergency fund"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmount">Target amount (PKR)</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target date (optional)</Label>
            <Input
              id="targetDate"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">Kept in (optional)</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No particular account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ACCOUNT}>No particular account</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} (PKR {formatPKR(account.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Just a note to yourself. Setting money aside never moves it out of an account.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Anything worth remembering about this plan"
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
              {loading ? "Saving..." : isEditing ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
