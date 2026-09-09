"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProfileData } from "@/hooks/use-profile-data"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface ClearDataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountCount: number
  transactionCount: number
  loanCount: number
  subscriptionCount: number
  goalCount: number
}

const CONFIRM_PHRASE = "RESET"

export function ClearDataModal({
  open,
  onOpenChange,
  accountCount,
  transactionCount,
  loanCount,
  subscriptionCount,
  goalCount,
}: ClearDataModalProps) {
  const { clearAllData, clearing } = useProfileData()
  const [confirmation, setConfirmation] = useState("")

  useEffect(() => {
    if (!open) setConfirmation("")
  }, [open])

  const nothingToClear = accountCount + transactionCount + loanCount + subscriptionCount + goalCount === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirmation.trim().toUpperCase() !== CONFIRM_PHRASE) {
      return toast.error(`Type ${CONFIRM_PHRASE} to confirm`)
    }

    try {
      await clearAllData()
      toast.success("All data cleared. You are starting fresh.")
      onOpenChange(false)
    } catch (error: any) {
      console.error("Failed to clear data:", error)
      toast.error(error?.message || "Failed to clear data")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Clear all data
          </DialogTitle>
          <DialogDescription>
            This permanently deletes everything in your PaisaTrack profile and cannot be undone. Your account stays,
            so you can start tracking again from scratch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-1">
            <p className="font-medium">About to be deleted</p>
            <ul className="text-muted-foreground space-y-0.5">
              <li>
                {accountCount} account{accountCount !== 1 ? "s" : ""}
              </li>
              <li>
                {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
              </li>
              <li>
                {loanCount} loan record{loanCount !== 1 ? "s" : ""}
              </li>
              <li>
                {subscriptionCount} subscription{subscriptionCount !== 1 ? "s" : ""}
              </li>
              <li>
                {goalCount} savings plan{goalCount !== 1 ? "s" : ""}
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to confirm
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={clearing || nothingToClear || confirmation.trim().toUpperCase() !== CONFIRM_PHRASE}
            >
              {clearing ? "Clearing..." : "Clear everything"}
            </Button>
          </div>
          {nothingToClear && <p className="text-xs text-muted-foreground text-center">There is no data to clear.</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
