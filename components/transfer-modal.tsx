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
import { db } from "@/lib/firebase"
import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

interface TransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransferModal({ open, onOpenChange }: TransferModalProps) {
  const { accounts } = useAccounts()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validations
    const amount = Number.parseFloat(formData.amount)
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
      await runTransaction(db, async (tx) => {
        // Account refs
        const fromRef = doc(db, "users", user.uid, "accounts", from.id)
        const toRef = doc(db, "users", user.uid, "accounts", to.id)

        // Read latest balances
        const fromSnap = await tx.get(fromRef)
        const toSnap = await tx.get(toRef)
        if (!fromSnap.exists() || !toSnap.exists()) throw new Error("Account documents missing")

        const fromBal = (fromSnap.data().balance as number) ?? 0
        const toBal = (toSnap.data().balance as number) ?? 0
        if (fromBal < amount) throw new Error("Insufficient balance in source account")

        // Update balances
        tx.update(fromRef, { balance: fromBal - amount, updatedAt: serverTimestamp() })
        tx.update(toRef, { balance: toBal + amount, updatedAt: serverTimestamp() })

        // Create mirrored transactions under each account's user path
        const date = new Date(formData.date)

        const fromTxCol = collection(db, "users", user.uid, "transactions")
        const toTxCol = collection(db, "users", user.uid, "transactions")

        const outTxRef = doc(fromTxCol)
        const inTxRef = doc(toTxCol)

        tx.set(outTxRef, {
          accountId: from.id,
          type: "spend",
          amount,
          description: formData.description + ` → ${to.name}`,
          date,
          createdAt: serverTimestamp(),
        })

        tx.set(inTxRef, {
          accountId: to.id,
          type: "income",
          amount,
          description: formData.description + ` ← ${from.name}`,
          date,
          createdAt: serverTimestamp(),
        })
      })

      toast.success("Transfer completed")
      // Reset and close
      setFormData({ fromAccountId: "", toAccountId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] })
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
                    {account.name} (PKR {account.balance.toLocaleString()})
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
                    {account.name} (PKR {account.balance.toLocaleString()})
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
              min="0"
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
