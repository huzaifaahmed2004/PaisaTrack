"use client"

import { useState } from "react"
import { collection, getDocs, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 400

const COLLECTIONS = ["transactions", "loans", "subscriptions", "goals", "budgets", "accounts"] as const

export function useProfileData() {
  const { user } = useAuth()
  const [clearing, setClearing] = useState(false)

  /**
   * Wipes every account, transaction, loan, subscription, savings plan and
   * budget for the signed-in user, leaving the profile itself intact so they
   * can start over from an empty ledger.
   */
  const clearAllData = async () => {
    if (!user) throw new Error("User not authenticated")

    setClearing(true)
    try {
      let deleted = 0

      // Everything that points at an account goes before the accounts do, so
      // nothing is orphaned if the wipe is interrupted part way through.
      for (const name of COLLECTIONS) {
        const snapshot = await getDocs(collection(db, "users", user.uid, name))

        for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
          const batch = writeBatch(db)
          snapshot.docs.slice(i, i + BATCH_LIMIT).forEach((entry) => batch.delete(entry.ref))
          await batch.commit()
        }

        deleted += snapshot.size
      }

      return deleted
    } finally {
      setClearing(false)
    }
  }

  return { clearAllData, clearing }
}
