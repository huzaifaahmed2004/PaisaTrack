"use client"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import type { Transaction } from "@/lib/types"

export function useTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTransactions([])
      setRecentTransactions([])
      setLoading(false)
      return
    }

    const transactionsRef = collection(db, "users", user.uid, "transactions")
    const allQuery = query(transactionsRef, orderBy("date", "desc"))
    const recentQuery = query(transactionsRef, orderBy("date", "desc"), limit(5))

    const unsubscribeAll = onSnapshot(allQuery, (snapshot) => {
      const transactionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Transaction[]

      setTransactions(transactionsData)
      setLoading(false)
    })

    const unsubscribeRecent = onSnapshot(recentQuery, (snapshot) => {
      const recentData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Transaction[]

      setRecentTransactions(recentData)
    })

    return () => {
      unsubscribeAll()
      unsubscribeRecent()
    }
  }, [user])

  const addTransaction = async (transactionData: Omit<Transaction, "id" | "createdAt">) => {
    if (!user) throw new Error("User not authenticated")

    const transactionsRef = collection(db, "users", user.uid, "transactions")
    await addDoc(transactionsRef, {
      ...transactionData,
      createdAt: serverTimestamp(),
    })
  }

  const updateTransaction = async (transactionId: string, updates: Partial<Transaction>) => {
    if (!user) throw new Error("User not authenticated")

    const transactionRef = doc(db, "users", user.uid, "transactions", transactionId)
    await updateDoc(transactionRef, updates)
  }

  const deleteTransaction = async (transactionId: string) => {
    if (!user) throw new Error("User not authenticated")

    const transactionRef = doc(db, "users", user.uid, "transactions", transactionId)
    await deleteDoc(transactionRef)
  }

  return {
    transactions,
    recentTransactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
