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
import { useTransfers } from "@/hooks/use-transfers"
import { formatPKR, parseDateInput, round2, toDateInput } from "@/lib/money"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

interface TransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransferModal({ open, onOpenChange }: TransferModalProps) {
  const { accounts } = useAccounts()
  const { user } = useAuth()
  const { transfer } = useTransfers()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    description: "",
    date: toDateInput(new Date()),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validations
    const amount = round2(Number.parseFloat(formData.amount))
    if (!user) return toast.error("You must be signed in to transfer funds")
    if (!formData.fromAccountId) return toast.error("Please select the source account")
    if (!formData.toAccountId) return toast.error("Please select the destination account")
    if (formData.fromAccountId === formData.toAccountId)
      return toast.error("Source and destination accounts must be different")
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount greater than 0")
    if (!formData.description.trim()) return toast.error("Please enter a description")

    const from = accounts.find((a) => a.id === formData.fromAccountId)
    const to = accounts.find((a) => a.id === formData.toAccountId)
    if (!from || !to) return toast.error("Selected accounts not found")
    if (from.balance < amount) return toast.error("Insufficient balance in source account")

    setLoading(true)
    try {
      await transfer({
        fromAccountId: from.id,
        fromAccountName: from.name,
        toAccountId: to.id,
        toAccountName: to.name,
        amount,
        description: formData.description,
        date: parseDateInput(formData.date),
      })

      toast.success("Transfer completed")
      // Reset and close
      setFormData({ fromAccountId: "", toAccountId: "", amount: "", description: "", date: toDateInput(new Date()) })
      onOpenChange(false)
    } catch (err: any) {
      console.error("Transfer failed:", err)
      toast.error(err?.message ?? "Transfer failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Between Accounts</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>From</Label>
            <Select
              value={formData.fromAccountId}
              onValueChange={(value) => setFormData({ ...formData, fromAccountId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source account" />
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
            <Label>To</Label>
            <Select
              value={formData.toAccountId}
              onValueChange={(value) => setFormData({ ...formData, toAccountId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination account" />
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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this transfer for?"
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
              {loading ? "Transferring..." : "Transfer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
