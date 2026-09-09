"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccounts } from "@/hooks/use-accounts"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { useLoans } from "@/hooks/use-loans"
import { formatPKR } from "@/lib/money"
import type { Loan } from "@/lib/types"

interface SettleLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
}

export function SettleLoanModal({ open, onOpenChange, loan }: SettleLoanModalProps) {
  const { accounts } = useAccounts()
  const { user } = useAuth()
  const { settleLoan } = useLoans()
  const [loading, setLoading] = useState(false)
  const [accountId, setAccountId] = useState("")

  const resetAndClose = () => {
    setAccountId("")
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error("You must be signed in")
    if (!loan) return toast.error("No loan selected")
    if (!accountId) return toast.error("Please select an account")
    if (loan.status === "settled") return toast.error("This loan is already settled")

    const selectedAccount = accounts.find((a) => a.id === accountId)
    if (!selectedAccount) return toast.error("Account not found")

    setLoading(true)
    try {
      await settleLoan(loan, accountId)

      toast.success("Loan marked as settled")
      resetAndClose()
    } catch (error: any) {
      console.error("Failed to settle loan:", error)
      toast.error(error?.message || "Failed to settle loan")
    } finally {
      setLoading(false)
    }
  }

  const isGiven = loan?.type === "given"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Loan as Settled</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {loan && (
            <p className="text-sm text-muted-foreground">
              {isGiven
                ? `PKR ${formatPKR(loan.amount)} from ${loan.personName} comes back into the account you pick.`
                : `PKR ${formatPKR(loan.amount)} is paid to ${loan.personName} out of the account you pick.`}
            </p>
          )}
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder={isGiven ? "Select account to receive into" : "Select account to pay from"} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} (PKR {formatPKR(a.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !loan} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? "Settling..." : "Confirm Settle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
