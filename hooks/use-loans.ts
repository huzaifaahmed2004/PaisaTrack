"use client"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  doc,
  serverTimestamp,
  orderBy,
  runTransaction,
  getDocs,
  where,
  deleteField,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { balanceEffect, round2, toAmount } from "@/lib/money"
import type { Loan, Transaction } from "@/lib/types"

type LoanEdits = Partial<Pick<Loan, "personName" | "amount" | "description" | "date">>

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
        ...doc.data(),
        id: doc.id,
        amount: toAmount(doc.data().amount),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        settledAt: doc.data().settledAt?.toDate() || undefined,
      })) as Loan[]

      setLoans(loansData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const requireUser = () => {
    if (!user) throw new Error("User not authenticated")
    return user
  }

  const accountRef = (uid: string, accountId: string) => doc(db, "users", uid, "accounts", accountId)

  /** Every ledger entry this loan created: its disbursement and its settlement. */
  const linkedTransactions = async (uid: string, loanId: string): Promise<Transaction[]> => {
    const snapshot = await getDocs(
      query(collection(db, "users", uid, "transactions"), where("loanId", "==", loanId)),
    )
    return snapshot.docs.map((entry) => ({
      ...entry.data(),
      id: entry.id,
      amount: toAmount(entry.data().amount),
      date: entry.data().date?.toDate() || new Date(),
      createdAt: entry.data().createdAt?.toDate() || new Date(),
    })) as Transaction[]
  }

  const addLoan = async (loanData: Omit<Loan, "id" | "createdAt">) => {
    const currentUser = requireUser()

    await addDoc(collection(db, "users", currentUser.uid, "loans"), {
      ...loanData,
      amount: round2(toAmount(loanData.amount)),
      createdAt: serverTimestamp(),
    })
  }

  /**
   * Records a loan and, unless it is carried over from before, moves the money
   * through the chosen account and writes the matching ledger entry.
   */
  const createLoan = async (params: {
    type: "given" | "taken"
    personName: string
    amount: number
    description: string
    date: Date
    accountId?: string
    carriedOver?: boolean
    accountName?: string
  }) => {
    const currentUser = requireUser()

    const amount = round2(toAmount(params.amount))
    if (amount <= 0) throw new Error("Enter a valid amount greater than 0")

    if (params.carriedOver) {
      // The cash changed hands before this app was tracking it: no balance
      // moves and no ledger entry, just the outstanding obligation.
      await addDoc(collection(db, "users", currentUser.uid, "loans"), {
        type: params.type,
        personName: params.personName,
        amount,
        description: params.description,
        status: "pending",
        date: params.date,
        createdAt: serverTimestamp(),
        carriedOver: true,
      })
      return
    }

    if (!params.accountId) throw new Error("Please select an account")

    await runTransaction(db, async (tx) => {
      const ref = accountRef(currentUser.uid, params.accountId!)
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error("Account not found")

      const currentBal = toAmount(snap.data().balance)
      if (params.type === "given" && currentBal < amount) {
        throw new Error("Insufficient balance for this loan")
      }

      const newBal = round2(params.type === "given" ? currentBal - amount : currentBal + amount)
      tx.update(ref, { balance: newBal, updatedAt: serverTimestamp() })

      const loanRef = doc(collection(db, "users", currentUser.uid, "loans"))
      tx.set(loanRef, {
        type: params.type,
        personName: params.personName,
        amount,
        description: params.description,
        status: "pending",
        date: params.date,
        createdAt: serverTimestamp(),
        accountId: params.accountId,
        carriedOver: false,
      })

      tx.set(doc(collection(db, "users", currentUser.uid, "transactions")), {
        accountId: params.accountId,
        type: params.type === "given" ? "loan-given" : "loan-taken",
        amount,
        description: `${params.type === "given" ? "Loan Given to" : "Loan Taken from"} ${params.personName} - ${params.description}`,
        date: params.date,
        createdAt: serverTimestamp(),
        // Links the entry back to the loan so the two stay in sync.
        loanId: loanRef.id,
        loanEntry: "disbursement",
      })
    })
  }

  /**
   * Settles a loan: money comes back in for one you gave, or goes out for one
   * you took, and the entry is tagged so it can be reversed later.
   */
  const settleLoan = async (loan: Loan, accountId: string) => {
    const currentUser = requireUser()
    if (!accountId) throw new Error("Please select an account")
    if (loan.status === "settled") throw new Error("This loan is already settled")

    const amount = round2(toAmount(loan.amount))
    const isGiven = loan.type === "given" // we lent; settlement brings money in

    await runTransaction(db, async (tx) => {
      const ref = accountRef(currentUser.uid, accountId)
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error("Account not found")

      const newBal = round2(toAmount(snap.data().balance) + (isGiven ? amount : -amount))
      if (newBal < 0) throw new Error("Insufficient balance to settle this loan")

      tx.update(ref, { balance: newBal, updatedAt: serverTimestamp() })
      tx.update(doc(db, "users", currentUser.uid, "loans", loan.id), {
        status: "settled",
        settledAt: serverTimestamp(),
      })

      tx.set(doc(collection(db, "users", currentUser.uid, "transactions")), {
        accountId,
        type: isGiven ? "income" : "spend",
        amount,
        description: `Loan settlement with ${loan.personName} - ${loan.description}`,
        date: new Date(),
        createdAt: serverTimestamp(),
        // Tagged so the settlement can be reversed if the loan is reopened.
        loanId: loan.id,
        loanEntry: "settlement",
      })
    })
  }

  /**
   * Edits the loan's details. Changing the amount of a pending loan moves the
   * difference on the account it was disbursed from, and keeps the linked
   * ledger entry in step.
   */
  const updateLoan = async (loan: Loan, updates: LoanEdits) => {
    const currentUser = requireUser()

    const nextAmount = round2(toAmount(updates.amount ?? loan.amount))
    if (nextAmount <= 0) throw new Error("Enter an amount greater than 0")

    const oldAmount = round2(toAmount(loan.amount))
    const amountChanged = nextAmount !== oldAmount
    const entries = amountChanged ? await linkedTransactions(currentUser.uid, loan.id) : []

    await runTransaction(db, async (tx) => {
      const loanRef = doc(db, "users", currentUser.uid, "loans", loan.id)

      if (amountChanged && loan.accountId) {
        const ref = accountRef(currentUser.uid, loan.accountId)
        const snap = await tx.get(ref)
        if (!snap.exists()) throw new Error("The account this loan was recorded against no longer exists")

        // Re-apply each linked entry at the new amount.
        let balance = toAmount(snap.data().balance)
        for (const entry of entries) {
          balance = balance - balanceEffect(entry.type, round2(toAmount(entry.amount)))
          balance = balance + balanceEffect(entry.type, nextAmount)
        }
        balance = round2(balance)
        if (balance < 0) throw new Error("That amount would push the account below zero")

        tx.update(ref, { balance, updatedAt: serverTimestamp() })
        for (const entry of entries) {
          tx.update(doc(db, "users", currentUser.uid, "transactions", entry.id), { amount: nextAmount })
        }
      }

      tx.update(loanRef, { ...updates, amount: nextAmount })
    })
  }

  /**
   * Undoes a settlement: the money the settlement moved goes back, and the
   * settlement entry is removed. The original disbursement stays untouched.
   */
  const unsettleLoan = async (loan: Loan) => {
    const currentUser = requireUser()
    if (loan.status !== "settled") return

    const settlements = (await linkedTransactions(currentUser.uid, loan.id)).filter(
      (entry) => entry.loanEntry === "settlement",
    )

    await runTransaction(db, async (tx) => {
      const balances = await readBalances(tx, currentUser.uid, settlements)

      for (const entry of settlements) {
        if (!balances.has(entry.accountId)) continue
        const reverted = balances.get(entry.accountId)! - balanceEffect(entry.type, round2(toAmount(entry.amount)))
        if (round2(reverted) < 0) throw new Error("Reversing this settlement would push the account below zero")
        balances.set(entry.accountId, round2(reverted))
      }

      for (const [accountId, balance] of balances) {
        tx.update(accountRef(currentUser.uid, accountId), { balance, updatedAt: serverTimestamp() })
      }
      for (const entry of settlements) {
        tx.delete(doc(db, "users", currentUser.uid, "transactions", entry.id))
      }

      tx.update(doc(db, "users", currentUser.uid, "loans", loan.id), {
        status: "pending",
        settledAt: deleteField(),
      })
    })

    // Loans settled before entries were tagged have nothing to reverse; the
    // caller tells the user so they can correct the balance themselves.
    return settlements.length
  }

  /** Removes the loan and reverses every ledger entry it created. */
  const deleteLoan = async (loan: Loan) => {
    const currentUser = requireUser()
    const entries = await linkedTransactions(currentUser.uid, loan.id)

    await runTransaction(db, async (tx) => {
      const balances = await readBalances(tx, currentUser.uid, entries)

      // An untagged loan from before entries were linked: undo the original
      // disbursement directly. A settled one nets to zero, so it needs nothing,
      // and a carried-over loan never moved money in the first place.
      if (entries.length === 0 && loan.accountId && loan.status === "pending" && !loan.carriedOver) {
        const ref = accountRef(currentUser.uid, loan.accountId)
        const snap = await tx.get(ref)
        if (snap.exists()) {
          const amount = round2(toAmount(loan.amount))
          const effect = loan.type === "given" ? -amount : amount
          balances.set(loan.accountId, round2(toAmount(snap.data().balance) - effect))
        }
      }

      for (const entry of entries) {
        if (!balances.has(entry.accountId)) continue
        const reverted = balances.get(entry.accountId)! - balanceEffect(entry.type, round2(toAmount(entry.amount)))
        balances.set(entry.accountId, round2(reverted))
      }

      for (const [accountId, balance] of balances) {
        if (balance < 0) throw new Error("Deleting this loan would push an account below zero")
        tx.update(accountRef(currentUser.uid, accountId), { balance, updatedAt: serverTimestamp() })
      }
      for (const entry of entries) {
        tx.delete(doc(db, "users", currentUser.uid, "transactions", entry.id))
      }

      tx.delete(doc(db, "users", currentUser.uid, "loans", loan.id))
    })
  }

  const loansGiven = loans.filter((loan) => loan.type === "given")
  const loansTaken = loans.filter((loan) => loan.type === "taken")

  const pendingTotal = (list: Loan[]) =>
    round2(list.filter((loan) => loan.status === "pending").reduce((sum, loan) => sum + toAmount(loan.amount), 0))

  const totalGivenPending = pendingTotal(loansGiven)
  const totalTakenPending = pendingTotal(loansTaken)

  // Money still owed to you is an asset; money you still owe is a liability.
  const netLoanAmount = round2(totalGivenPending - totalTakenPending)

  return {
    loans,
    loansGiven,
    loansTaken,
    totalGivenPending,
    totalTakenPending,
    netLoanAmount,
    loading,
    addLoan,
    createLoan,
    settleLoan,
    updateLoan,
    unsettleLoan,
    deleteLoan,
  }
}

/** Firestore transactions require every read before the first write. */
async function readBalances(tx: any, uid: string, entries: Transaction[]) {
  const balances = new Map<string, number>()
  for (const accountId of Array.from(new Set(entries.map((entry) => entry.accountId)))) {
    const snap = await tx.get(doc(db, "users", uid, "accounts", accountId))
    if (snap.exists()) balances.set(accountId, toAmount(snap.data().balance))
  }
  return balances
}
