"use client"

import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { round2, toAmount } from "@/lib/money"

/**
 * Moving money between your own accounts. Both legs are written together and
 * share a transferId, so they are always reversed together too.
 */
export function useTransfers() {
  const { user } = useAuth()

  const transfer = async (params: {
    fromAccountId: string
    fromAccountName: string
    toAccountId: string
    toAccountName: string
    amount: number
    description: string
    date: Date
  }) => {
    if (!user) throw new Error("You must be signed in to transfer funds")

    const amount = round2(toAmount(params.amount))
    if (amount <= 0) throw new Error("Enter a valid amount greater than 0")
    if (params.fromAccountId === params.toAccountId) {
      throw new Error("Source and destination accounts must be different")
    }

    await runTransaction(db, async (tx) => {
      const fromRef = doc(db, "users", user.uid, "accounts", params.fromAccountId)
      const toRef = doc(db, "users", user.uid, "accounts", params.toAccountId)

      const fromSnap = await tx.get(fromRef)
      const toSnap = await tx.get(toRef)
      if (!fromSnap.exists() || !toSnap.exists()) throw new Error("Account documents missing")

      const fromBal = toAmount(fromSnap.data().balance)
      const toBal = toAmount(toSnap.data().balance)
      if (fromBal < amount) throw new Error("Insufficient balance in source account")

      tx.update(fromRef, { balance: round2(fromBal - amount), updatedAt: serverTimestamp() })
      tx.update(toRef, { balance: round2(toBal + amount), updatedAt: serverTimestamp() })

      const transactionsCol = collection(db, "users", user.uid, "transactions")
      const outRef = doc(transactionsCol)
      const inRef = doc(transactionsCol)
      // Shared id so the pair is always deleted and reversed together.
      const transferId = outRef.id

      tx.set(outRef, {
        accountId: params.fromAccountId,
        type: "spend",
        amount,
        description: `${params.description} → ${params.toAccountName}`,
        date: params.date,
        createdAt: serverTimestamp(),
        transferId,
      })

      tx.set(inRef, {
        accountId: params.toAccountId,
        type: "income",
        amount,
        description: `${params.description} ← ${params.fromAccountName}`,
        date: params.date,
        createdAt: serverTimestamp(),
        transferId,
      })
    })
  }

  return { transfer }
}
