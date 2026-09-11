"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DayStepper } from "@/components/ui/day-stepper"
import { Label } from "@/components/ui/label"
import { useSettings } from "@/hooks/use-settings"
import { formatPKR } from "@/lib/money"
import { ordinalDay } from "@/lib/recurrence"
import { toast } from "sonner"

interface PayWindowCardProps {
  reservedForBills: number
  holdUntil: Date
}

export function PayWindowCard({ reservedForBills, holdUntil }: PayWindowCardProps) {
  const { payWindow, setPayWindow } = useSettings()
  const [earliest, setEarliest] = useState("")
  const [latest, setLatest] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEarliest(payWindow ? String(payWindow.earliestDay) : "")
    setLatest(payWindow ? String(payWindow.latestDay) : "")
  }, [payWindow])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)
    try {
      await setPayWindow({
        earliestDay: Number.parseInt(earliest, 10),
        latestDay: Number.parseInt(latest, 10),
      })
      toast.success("Salary cycle saved")
    } catch (error: any) {
      toast.error(error?.message || "Could not save salary cycle")
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      await setPayWindow(null)
      toast.success("Salary cycle cleared")
    } catch (error: any) {
      toast.error(error?.message || "Could not clear salary cycle")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Salary Cycle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {payWindow
            ? `Your salary lands between the ${ordinalDay(payWindow.earliestDay)} and the ${ordinalDay(payWindow.latestDay)}, so bills due up to ${holdUntil.toLocaleDateString()} are held - PKR ${formatPKR(reservedForBills)} that is not free to spend.`
            : `Bills due by the end of this month are held - PKR ${formatPKR(reservedForBills)}. Set the days your salary usually lands to hold bills until your next salary instead.`}
        </p>

        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="payEarliest">Earliest day</Label>
            <DayStepper id="payEarliest" value={earliest} onChange={setEarliest} placeholder="7" className="w-36" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payLatest">Latest day</Label>
            <DayStepper id="payLatest" value={latest} onChange={setLatest} placeholder="13" className="w-36" />
          </div>
          <Button type="submit" disabled={saving} className="h-11 bg-accent hover:bg-accent/90">
            Save
          </Button>
          {payWindow && (
            <Button type="button" variant="ghost" className="h-11" onClick={handleClear} disabled={saving}>
              Clear
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
