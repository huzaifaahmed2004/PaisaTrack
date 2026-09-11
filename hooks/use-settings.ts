"use client"

import { useEffect, useState } from "react"
import { deleteField, doc, onSnapshot, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import type { PayWindow } from "@/lib/recurrence"

const isDay = (value: number) => Number.isInteger(value) && value >= 1 && value <= 31

/**
 * Per-user preferences, stored on users/{uid} itself. Clearing profile data
 * wipes the ledger collections but leaves these alone.
 */
export function useSettings() {
  const { user } = useAuth()
  const [payWindow, setPayWindowState] = useState<PayWindow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setPayWindowState(null)
      setLoading(false)
      return
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const data = snapshot.data()
      const earliestDay = Number(data?.paydayEarliest)
      const latestDay = Number(data?.paydayLatest)

      setPayWindowState(
        isDay(earliestDay) && isDay(latestDay) && earliestDay <= latestDay ? { earliestDay, latestDay } : null,
      )
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  /** Pass null to go back to holding bills until the end of the month. */
  const setPayWindow = async (window: PayWindow | null) => {
    if (!user) throw new Error("User not authenticated")

    if (window) {
      if (!isDay(window.earliestDay) || !isDay(window.latestDay)) {
        throw new Error("Salary days must be between 1 and 31")
      }
      if (window.earliestDay > window.latestDay) {
        throw new Error("The earliest day must come before the latest day")
      }
    }

    await setDoc(
      doc(db, "users", user.uid),
      window
        ? { paydayEarliest: window.earliestDay, paydayLatest: window.latestDay }
        : { paydayEarliest: deleteField(), paydayLatest: deleteField() },
      { merge: true },
    )
  }

  return { payWindow, setPayWindow, loading }
}
