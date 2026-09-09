"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccounts } from "@/hooks/use-accounts"
import { ACCOUNT_TYPES } from "@/lib/account-types"
import type { AccountType } from "@/lib/types"
import { toast } from "sonner"

interface AddAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddAccountModal({ open, onOpenChange }: AddAccountModalProps) {
  const { addAccount } = useAccounts()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "" as AccountType | "",
    balance: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return toast.error("Please enter an account name")
    if (!formData.type) return toast.error("Please select an account type")
    if (!formData.balance) return toast.error("Please enter an initial balance")

    const balance = Number.parseFloat(formData.balance)
    if (!Number.isFinite(balance)) return toast.error("Please enter a valid balance")
    if (balance < 0) return toast.error("Balance cannot be negative")

    setLoading(true)
    try {
      await addAccount({
        name: formData.name,
        type: formData.type,
        balance,
      })

      // Reset form and close modal
      setFormData({
        name: "",
        type: "",
        balance: "",
      })
      onOpenChange(false)
      toast.success("Account added")
    } catch (error: any) {
      console.error("Error adding account:", error)
      toast.error(error?.message || "Failed to add account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Wallet, Savings Account"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: AccountType) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance">Initial Balance (PKR)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? "Adding..." : "Add Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
