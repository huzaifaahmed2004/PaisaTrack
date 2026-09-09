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
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { addDoc, collection, doc, runTransaction, serverTimestamp } from "firebase/firestore"
import { Checkbox } from "@/components/ui/checkbox"
import { formatPKR, parseDateInput, round2, toAmount, toDateInput } from "@/lib/money"

interface AddLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddLoanModal({ open, onOpenChange }: AddLoanModalProps) {
  const { accounts } = useAccounts()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: "" as "given" | "taken" | "",
    personName: "",
    amount: "",
    description: "",
    date: toDateInput(new Date()),
    accountId: "",
    carriedOver: false,
  })

  const resetForm = () =>
    setFormData({
      type: "",
      personName: "",
      amount: "",
      description: "",
      date: toDateInput(new Date()),
      accountId: "",
      carriedOver: false,
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error("You must be signed in")
    if (!formData.type) return toast.error("Please select loan type")
    if (!formData.personName.trim()) return toast.error("Please enter the person's name")
    if (!formData.amount) return toast.error("Please enter an amount")
    const amount = round2(Number.parseFloat(formData.amount))
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount greater than 0")
    if (!formData.description.trim()) return toast.error("Please enter a description")
    if (!formData.carriedOver && !formData.accountId) return toast.error("Please select an account")

    setLoading(true)
    try {
      if (formData.carriedOver) {
        // The money changed hands before this app was tracking it, so no
        // balance moves and no ledger entry is written. It is recorded purely
        // as an outstanding obligation - settling it later moves the money.
        await addDoc(collection(db, "users", user.uid, "loans"), {
          type: formData.type,
          personName: formData.personName,
          amount,
          description: formData.description,
          status: "pending",
          date: parseDateInput(formData.date),
          createdAt: serverTimestamp(),
          carriedOver: true,
        })
      } else {
        const selectedAccount = accounts.find((a) => a.id === formData.accountId)
        if (!selectedAccount) throw new Error("Account not found")

        await runTransaction(db, async (tx) => {
          const accountRef = doc(db, "users", user.uid, "accounts", selectedAccount.id)
          const accountSnap = await tx.get(accountRef)
          if (!accountSnap.exists()) throw new Error("Account not found")
          const currentBal = toAmount(accountSnap.data().balance)

          if (formData.type === "given" && currentBal < amount) {
            throw new Error("Insufficient balance for this loan")
          }

          const newBal = round2(formData.type === "given" ? currentBal - amount : currentBal + amount)
          tx.update(accountRef, { balance: newBal, updatedAt: serverTimestamp() })

          const loansCol = collection(db, "users", user.uid, "loans")
          const loanRef = doc(loansCol)
          tx.set(loanRef, {
            type: formData.type,
            personName: formData.personName,
            amount,
            description: formData.description,
            status: "pending",
            date: parseDateInput(formData.date),
            createdAt: serverTimestamp(),
            accountId: selectedAccount.id,
            carriedOver: false,
          })

          const txCol = collection(db, "users", user.uid, "transactions")
          const txRef = doc(txCol)
          tx.set(txRef, {
            accountId: selectedAccount.id,
            type: formData.type === "given" ? "loan-given" : "loan-taken",
            amount,
            description: `${formData.type === "given" ? "Loan Given to" : "Loan Taken from"} ${formData.personName} - ${formData.description}`,
            date: parseDateInput(formData.date),
            createdAt: serverTimestamp(),
            // Links the entry back to the loan so the two stay in sync.
            loanId: loanRef.id,
            loanEntry: "disbursement",
          })
        })
      }

      // Reset form and close modal
      resetForm()
      onOpenChange(false)
      toast.success(formData.carriedOver ? "Existing loan recorded" : "Loan added")
    } catch (error: any) {
      console.error("Error adding loan:", error)
      toast.error(error?.message || "Failed to add loan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Loan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Loan Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "given" | "taken") => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select loan type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="given">Loan Given (I lent money)</SelectItem>
                <SelectItem value="taken">Loan Taken (I borrowed money)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <Checkbox
              id="carriedOver"
              checked={formData.carriedOver}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, carriedOver: checked === true, accountId: "" })
              }
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="carriedOver" className="font-medium leading-none cursor-pointer">
                This loan already exists
              </Label>
              <p className="text-xs text-muted-foreground">
                {formData.type === "given"
                  ? "You lent this money before you started using PaisaTrack. No account balance changes now - you just get it back later."
                  : "You borrowed this money before you started using PaisaTrack. No account balance changes now - you still have to pay it back."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personName">Person Name</Label>
            <Input
              id="personName"
              required
              value={formData.personName}
              onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
              placeholder="Who is this loan with?"
            />
          </div>
          {!formData.carriedOver && (
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
              <p className="text-xs text-muted-foreground">
                {formData.type === "taken"
                  ? "The money is added to this account."
                  : "The money is taken out of this account."}
              </p>
            </div>
          )}
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
              placeholder="What was this loan for?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">{formData.carriedOver ? "Date it was originally given/taken" : "Date"}</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? "Adding..." : formData.carriedOver ? "Record Existing Loan" : "Add Loan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
