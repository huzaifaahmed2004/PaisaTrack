"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccounts } from "@/hooks/use-accounts"

interface AddAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddAccountModal({ open, onOpenChange }: AddAccountModalProps) {
  const { addAccount } = useAccounts()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "" as "cash" | "bank" | "nayapay" | "sadapay" | "other" | "",
    balance: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.type || !formData.balance) return

    setLoading(true)
    try {
      await addAccount({
        name: formData.name,
        type: formData.type,
        balance: Number.parseFloat(formData.balance),
      })

      // Reset form and close modal
      setFormData({
        name: "",
        type: "",
        balance: "",
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error adding account:", error)
    } finally {
      setLoading(false)
    }
  }

  const accountTypes = [
    { value: "cash", label: "Cash", icon: "💵" },
    { value: "bank", label: "Bank Account", icon: "🏦" },
    { value: "nayapay", label: "NayaPay", icon: "📱" },
    { value: "sadapay", label: "SadaPay", icon: "💳" },
    { value: "other", label: "Other", icon: "💰" },
  ]

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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Wallet, Savings Account"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "cash" | "bank" | "nayapay" | "sadapay" | "other") =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
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
