"use client"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  where,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { round2, toAmount } from "@/lib/money"
import { isLegacyAccountType, normalizeAccountType } from "@/lib/account-types"
import type { Account } from "@/lib/types"

export function useAccounts() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setAccounts([])
      setLoading(false)
      return
    }

    const accountsRef = collection(db, "users", user.uid, "accounts")
    const q = query(accountsRef)

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accountsData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        type: normalizeAccountType(doc.data().type),
        balance: toAmount(doc.data().balance),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Account[]

      setAccounts(accountsData)
      setLoading(false)

      // Fold the retired NayaPay/SadaPay types into "wallet" for good, so the
      // stored records match what is on screen.
      const legacy = snapshot.docs.filter((doc) => isLegacyAccountType(doc.data().type))
      if (legacy.length > 0) {
        const batch = writeBatch(db)
        legacy.forEach((doc) => batch.update(doc.ref, { type: normalizeAccountType(doc.data().type) }))
        batch.commit().catch((error) => console.error("Failed to migrate account types:", error))
      }
    })

    return () => unsubscribe()
  }, [user])

  const requireUser = () => {
    if (!user) throw new Error("User not authenticated")
    return user
  }

  const addAccount = async (accountData: Omit<Account, "id" | "createdAt" | "updatedAt">) => {
    const currentUser = requireUser()

    const balance = round2(toAmount(accountData.balance))
    if (balance < 0) throw new Error("Balance cannot be negative")

    const accountsRef = collection(db, "users", currentUser.uid, "accounts")
    await addDoc(accountsRef, {
      ...accountData,
      balance,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const updateAccount = async (accountId: string, updates: Partial<Account>) => {
    const currentUser = requireUser()

    if (updates.balance !== undefined) {
      const balance = round2(toAmount(updates.balance))
      if (balance < 0) throw new Error("Balance cannot be negative")
      updates = { ...updates, balance }
    }

    const accountRef = doc(db, "users", currentUser.uid, "accounts", accountId)
    await updateDoc(accountRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  }

  /** How many ledger entries would go with this account if it were deleted. */
  const countAccountTransactions = async (accountId: string) => {
    const currentUser = requireUser()
    const snapshot = await getDocs(
      query(collection(db, "users", currentUser.uid, "transactions"), where("accountId", "==", accountId)),
    )
    return snapshot.size
  }

  /** Entries belonging to a deleted account would be unreadable, so they go too. */
  const deleteAccount = async (accountId: string) => {
    const currentUser = requireUser()

    const entries = await getDocs(
      query(collection(db, "users", currentUser.uid, "transactions"), where("accountId", "==", accountId)),
    )

    const batch = writeBatch(db)
    entries.docs.forEach((entry) => batch.delete(entry.ref))
    batch.delete(doc(db, "users", currentUser.uid, "accounts", accountId))
    await batch.commit()
  }

  const totalBalance = round2(accounts.reduce((sum, account) => sum + toAmount(account.balance), 0))

  return {
    accounts,
    loading,
    addAccount,
    updateAccount,
    deleteAccount,
    countAccountTransactions,
    totalBalance,
  }
}
