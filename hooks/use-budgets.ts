"use client"

import { useEffect, useState } from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { useTransactions } from "@/hooks/use-transactions"
import { useSettings } from "@/hooks/use-settings"
import { useSpendable } from "@/hooks/use-spendable"
import { budgetCapacity, budgetUsage } from "@/lib/budget"
import { formatPKR, round2, toAmount } from "@/lib/money"
import { budgetPeriod } from "@/lib/recurrence"
import type { Budget } from "@/lib/types"

type BudgetInput = { name: string; limit: number }

/**
 * Budgets plan how free-to-spend money gets used. They never move money and
 * never change free-to-spend itself - they only compare spending to a limit.
 */
export function useBudgets() {
  const { user } = useAuth()
  const { transactions } = useTransactions()
  const { payWindow } = useSettings()
  const { freeToSpend } = useSpendable()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setBudgets([])
      setLoading(false)
      return
    }

    const budgetsRef = collection(db, "users", user.uid, "budgets")
    const unsubscribe = onSnapshot(query(budgetsRef, orderBy("createdAt", "asc")), (snapshot) => {
      setBudgets(
        snapshot.docs.map((entry) => {
          const raw = entry.data()
          return {
            ...raw,
            id: entry.id,
            name: raw.name ?? "",
            limit: toAmount(raw.limit),
            createdAt: raw.createdAt?.toDate() || new Date(),
            updatedAt: raw.updatedAt?.toDate() || new Date(),
          } as Budget
        }),
      )
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const requireUser = () => {
    if (!user) throw new Error("User not authenticated")
    return user
  }

  const period = budgetPeriod(payWindow)
  const summary = budgetUsage(budgets, transactions, period)
  // Free money that no budget has claimed yet.
  const unbudgeted = round2(freeToSpend - summary.totalRemaining)

  const usageOf = (budgetId?: string) => summary.usage.find((entry) => entry.budget.id === budgetId)

  /** The highest limit a budget could be given right now. */
  const maxLimitFor = (budget?: Budget | null) => {
    const own = usageOf(budget?.id)
    const capacity = budgetCapacity(freeToSpend, summary.totalRemaining, own?.remaining ?? 0)
    return round2(Math.max(capacity, 0) + (own?.spent ?? 0))
  }

  const validate = (input: BudgetInput, budget?: Budget) => {
    const limit = round2(toAmount(input.limit))
    if (limit <= 0) throw new Error("Enter an amount greater than 0")

    const name = input.name.trim()
    if (!name) throw new Error("Please pick a category")

    const taken = budgets.some(
      (existing) => existing.id !== budget?.id && existing.name.trim().toLowerCase() === name.toLowerCase(),
    )
    if (taken) throw new Error("You already have a budget for that category")

    const own = usageOf(budget?.id)
    const currentRemaining = own?.remaining ?? 0
    const newRemaining = round2(Math.max(limit - (own?.spent ?? 0), 0))

    // Lowering a budget is always allowed, even when budgets are over-allocated.
    if (newRemaining > currentRemaining) {
      const capacity = budgetCapacity(freeToSpend, summary.totalRemaining, currentRemaining)
      if (newRemaining > capacity) {
        if (freeToSpend <= 0) {
          throw new Error("You have no free-to-spend money to budget right now - bills and plans already claim it")
        }
        throw new Error(
          capacity > 0
            ? `Only PKR ${formatPKR(capacity)} of your free-to-spend money is not budgeted yet`
            : "All of your free-to-spend money is already budgeted",
        )
      }
    }

    return { name, limit }
  }

  const addBudget = async (input: BudgetInput) => {
    const currentUser = requireUser()
    const data = validate(input)

    await addDoc(collection(db, "users", currentUser.uid, "budgets"), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const updateBudget = async (budget: Budget, input: BudgetInput) => {
    const currentUser = requireUser()
    const data = validate(input, budget)

    await updateDoc(doc(db, "users", currentUser.uid, "budgets", budget.id), {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  /** Expenses tagged with it stay in the history and simply count as unbudgeted. */
  const deleteBudget = async (budgetId: string) => {
    const currentUser = requireUser()
    await deleteDoc(doc(db, "users", currentUser.uid, "budgets", budgetId))
  }

  return {
    budgets,
    usage: summary.usage,
    period,
    payWindow,
    totalLimit: summary.totalLimit,
    totalSpent: summary.totalSpent,
    totalRemaining: summary.totalRemaining,
    unbudgetedSpend: summary.unbudgetedSpend,
    unbudgeted,
    freeToSpend,
    maxLimitFor,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
  }
}
