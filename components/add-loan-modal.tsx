"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useLoans } from "@/hooks/use-loans"

interface AddLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddLoanModal({ open, onOpenChange }: AddLoanModalProps) {
  const { addLoan } = useLoans()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: "" as "given" | "taken" | "",
    personName: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.type || !formData.personName || !formData.amount || !formData.description) return

    setLoading(true)
    try {
      await addLoan({
        type: formData.type,
        personName: formData.personName,
        amount: Number.parseFloat(formData.amount),
        description: formData.description,
        status: "pending",
        date: new Date(formData.date),
      })

      // Reset form and close modal
      setFormData({
        type: "",
        personName: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error adding loan:", error)
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? "Adding..." : "Add Loan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
