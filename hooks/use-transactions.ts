"use client"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  onSnapshot,
  doc,
  serverTimestamp,
  orderBy,
  limit,
  runTransaction,
  getDocs,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { balanceEffect, round2, toAmount } from "@/lib/money"
import type { Transaction } from "@/lib/types"

type NewTransaction = Omit<Transaction, "id" | "createdAt">
type TransactionEdits = Partial<Pick<Transaction, "accountId" | "type" | "amount" | "description" | "date" | "budgetId">>

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
      setTransactions(snapshot.docs.map(toTransaction))
      setLoading(false)
    })

    const unsubscribeRecent = onSnapshot(recentQuery, (snapshot) => {
      setRecentTransactions(snapshot.docs.map(toTransaction))
    })

    return () => {
      unsubscribeAll()
      unsubscribeRecent()
    }
  }, [user])

  const requireUser = () => {
    if (!user) throw new Error("User not authenticated")
    return user
  }

  const accountRef = (uid: string, accountId: string) => doc(db, "users", uid, "accounts", accountId)

  /**
   * Loan entries are two-sided: the loan record would be left behind if this
   * side were edited or removed on its own.
   */
  const assertStandalone = (transaction: Transaction, action: string) => {
    if (transaction.loanId) {
      throw new Error(`This entry belongs to a loan. ${action} it from the Loans page instead.`)
    }
    if (transaction.subscriptionId) {
      throw new Error(
        `This entry is a subscription payment. Undo it from the Subscriptions page instead, so the bill becomes due again.`,
      )
    }
  }

  const addTransaction = async (transactionData: NewTransaction) => {
    const currentUser = requireUser()
    const amount = round2(toAmount(transactionData.amount))
    if (amount <= 0) throw new Error("Enter an amount greater than 0")

    await runTransaction(db, async (tx) => {
      const ref = accountRef(currentUser.uid, transactionData.accountId)
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error("Account not found")

      const newBalance = round2(toAmount(snap.data().balance) + balanceEffect(transactionData.type, amount))
      if (newBalance < 0) throw new Error("Insufficient balance in this account")

      tx.update(ref, { balance: newBalance, updatedAt: serverTimestamp() })
      tx.set(doc(collection(db, "users", currentUser.uid, "transactions")), {
        ...transactionData,
        amount,
        createdAt: serverTimestamp(),
      })
    })
  }

  /**
   * Reverses the original entry's effect and applies the new one in a single
   * atomic step, so a same-account edit cannot lose the reversal.
   */
  const updateTransaction = async (original: Transaction, updates: TransactionEdits) => {
    const currentUser = requireUser()
    assertStandalone(original, "Edit")
    if (original.transferId) {
      throw new Error("Transfers cannot be edited. Delete the transfer and record it again.")
    }

    const nextAccountId = updates.accountId ?? original.accountId
    const nextType = updates.type ?? original.type
    const nextAmount = round2(toAmount(updates.amount ?? original.amount))
    if (nextAmount <= 0) throw new Error("Enter an amount greater than 0")

    const oldEffect = balanceEffect(original.type, round2(toAmount(original.amount)))
    const newEffect = balanceEffect(nextType, nextAmount)
    const sameAccount = original.accountId === nextAccountId

    await runTransaction(db, async (tx) => {
      const oldRef = accountRef(currentUser.uid, original.accountId)
      const newRef = accountRef(currentUser.uid, nextAccountId)

      const oldSnap = await tx.get(oldRef)
      const newSnap = sameAccount ? oldSnap : await tx.get(newRef)

      if (sameAccount) {
        if (!oldSnap.exists()) throw new Error("Account not found")
        const balance = round2(toAmount(oldSnap.data().balance) - oldEffect + newEffect)
        if (balance < 0) throw new Error("Insufficient balance in this account")
        tx.update(oldRef, { balance, updatedAt: serverTimestamp() })
      } else {
        if (!newSnap.exists()) throw new Error("Selected account not found")
        const newBalance = round2(toAmount(newSnap.data().balance) + newEffect)
        if (newBalance < 0) throw new Error("Insufficient balance in the selected account")
        tx.update(newRef, { balance: newBalance, updatedAt: serverTimestamp() })

        // A deleted original account simply has nothing left to reverse.
        if (oldSnap.exists()) {
          tx.update(oldRef, {
            balance: round2(toAmount(oldSnap.data().balance) - oldEffect),
            updatedAt: serverTimestamp(),
          })
        }
      }

      tx.update(doc(db, "users", currentUser.uid, "transactions", original.id), {
        ...updates,
        accountId: nextAccountId,
        type: nextType,
        amount: nextAmount,
      })
    })
  }

  /** Deleting an entry gives its money back to the account it came from. */
  const deleteTransaction = async (transaction: Transaction) => {
    const currentUser = requireUser()
    assertStandalone(transaction, "Delete")

    // Both legs of a transfer go together, or the two accounts drift apart.
    const legs: Transaction[] = [transaction]
    if (transaction.transferId) {
      const siblings = await getDocs(
        query(
          collection(db, "users", currentUser.uid, "transactions"),
          where("transferId", "==", transaction.transferId),
        ),
      )
      for (const sibling of siblings.docs) {
        if (sibling.id === transaction.id) continue
        legs.push(toTransaction(sibling))
      }
    }

    await runTransaction(db, async (tx) => {
      const affectedIds = Array.from(new Set(legs.map((leg) => leg.accountId)))
      const balances = new Map<string, number>()

      for (const accountId of affectedIds) {
        const snap = await tx.get(accountRef(currentUser.uid, accountId))
        if (snap.exists()) balances.set(accountId, toAmount(snap.data().balance))
      }

      for (const leg of legs) {
        if (!balances.has(leg.accountId)) continue
        const reverted = balances.get(leg.accountId)! - balanceEffect(leg.type, round2(toAmount(leg.amount)))
        balances.set(leg.accountId, round2(reverted))
      }

      for (const [accountId, balance] of balances) {
        tx.update(accountRef(currentUser.uid, accountId), { balance, updatedAt: serverTimestamp() })
      }

      for (const leg of legs) {
        tx.delete(doc(db, "users", currentUser.uid, "transactions", leg.id))
      }
    })
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

function toTransaction(snapshot: { id: string; data: () => any }): Transaction {
  const data = snapshot.data()
  return {
    ...data,
    id: snapshot.id,
    amount: toAmount(data.amount),
    date: data.date?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
  } as Transaction
}
