"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
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
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Account[]

      setAccounts(accountsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const addAccount = async (accountData: Omit<Account, "id" | "createdAt" | "updatedAt">) => {
    if (!user) throw new Error("User not authenticated")

    const accountsRef = collection(db, "users", user.uid, "accounts")
    await addDoc(accountsRef, {
      ...accountData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const updateAccount = async (accountId: string, updates: Partial<Account>) => {
    if (!user) throw new Error("User not authenticated")

    const accountRef = doc(db, "users", user.uid, "accounts", accountId)
    await updateDoc(accountRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  }

  const deleteAccount = async (accountId: string) => {
    if (!user) throw new Error("User not authenticated")

    const accountRef = doc(db, "users", user.uid, "accounts", accountId)
    await deleteDoc(accountRef)
  }

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  return {
    accounts,
    loading,
    addAccount,
    updateAccount,
    deleteAccount,
    totalBalance,
  }
}
