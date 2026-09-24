"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLoans } from "@/hooks/use-loans"
import { parseDateInput, toDateInput } from "@/lib/money"
import { toast } from "sonner"
import type { Loan } from "@/lib/types"

interface EditLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
  onClose: () => void
}

export function EditLoanModal({ open, onOpenChange, loan, onClose }: EditLoanModalProps) {
  const { updateLoan } = useLoans()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    personName: "",
    amount: "",
    description: "",
    date: "",
  })

  useEffect(() => {
    if (loan) {
      setFormData({
        personName: loan.personName,
        amount: loan.amount.toString(),
        description: loan.description,
        date: toDateInput(loan.date),
      })
    }
  }, [loan])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loan) return
    if (!formData.personName.trim()) return toast.error("Please enter the person's name")
    if (!formData.description.trim()) return toast.error("Please enter a description")

    const amount = Number.parseFloat(formData.amount)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount greater than 0")

    setLoading(true)
    try {
      // Changing the amount also moves the difference on the linked account.
      await updateLoan(loan, {
        personName: formData.personName,
        amount,
        description: formData.description,
        date: parseDateInput(formData.date),
      })

      toast.success("Loan updated")
      onOpenChange(false)
      onClose()
    } catch (error: any) {
      console.error("Error updating loan:", error)
      toast.error(error?.message || "Failed to update loan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Loan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {loan?.type === "given" ? "Money you lent out" : "Money you borrowed"}
            {loan?.status === "settled" ? " - settled" : " - pending"}. Use Mark Settled or Mark Pending on the loans
            list to move the money.
            {loan?.carriedOver &&
              " This was recorded as an existing loan, so changing the amount here does not touch any account."}
          </p>
          <div className="space-y-2">
            <Label htmlFor="personName">Person Name</Label>
            <Input
              id="personName"
              value={formData.personName}
              onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
              placeholder="Who is this loan with?"
            />
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
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was this loan for?"
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
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Updating..." : "Update Loan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
