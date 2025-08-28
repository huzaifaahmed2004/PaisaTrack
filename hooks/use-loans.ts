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
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import type { Loan } from "@/lib/types"

export function useLoans() {
  const { user } = useAuth()
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoans([])
      setLoading(false)
      return
    }

    const loansRef = collection(db, "users", user.uid, "loans")
    const q = query(loansRef, orderBy("date", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loansData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        settledAt: doc.data().settledAt?.toDate() || undefined,
      })) as Loan[]

      setLoans(loansData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const addLoan = async (loanData: Omit<Loan, "id" | "createdAt">) => {
    if (!user) throw new Error("User not authenticated")

    const loansRef = collection(db, "users", user.uid, "loans")
    await addDoc(loansRef, {
      ...loanData,
      createdAt: serverTimestamp(),
    })
  }

  const updateLoan = async (loanId: string, updates: Partial<Loan>) => {
    if (!user) throw new Error("User not authenticated")

    const loanRef = doc(db, "users", user.uid, "loans", loanId)
    await updateDoc(loanRef, {
      ...updates,
      ...(updates.status === "settled" && { settledAt: serverTimestamp() }),
    })
  }

  const deleteLoan = async (loanId: string) => {
    if (!user) throw new Error("User not authenticated")

    const loanRef = doc(db, "users", user.uid, "loans", loanId)
    await deleteDoc(loanRef)
  }

  const loansGiven = loans.filter((loan) => loan.type === "given")
  const loansTaken = loans.filter((loan) => loan.type === "taken")

  const netLoanAmount =
    loansGiven.filter((loan) => loan.status === "pending").reduce((sum, loan) => sum + loan.amount, 0) -
    loansTaken.filter((loan) => loan.status === "pending").reduce((sum, loan) => sum + loan.amount, 0)

  return {
    loans,
    loansGiven,
    loansTaken,
    netLoanAmount,
    loading,
    addLoan,
    updateLoan,
    deleteLoan,
  }
}
