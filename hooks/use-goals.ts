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
  runTransaction,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { round2, toAmount } from "@/lib/money"
import type { Goal } from "@/lib/types"

type NewGoal = {
  name: string
  targetAmount: number
  description?: string
  accountId?: string
  targetDate?: Date | null
}

export function useGoals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setGoals([])
      setLoading(false)
      return
    }

    const goalsRef = collection(db, "users", user.uid, "goals")
    const q = query(goalsRef, orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((entry) => {
        const raw = entry.data()
        return {
          ...raw,
          id: entry.id,
          targetAmount: toAmount(raw.targetAmount),
          savedAmount: toAmount(raw.savedAmount),
          status: raw.status === "completed" ? "completed" : "active",
          targetDate: raw.targetDate?.toDate() || undefined,
          completedAt: raw.completedAt?.toDate() || undefined,
          createdAt: raw.createdAt?.toDate() || new Date(),
          updatedAt: raw.updatedAt?.toDate() || new Date(),
        } as Goal
      })

      setGoals(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const requireUser = () => {
    if (!user) throw new Error("User not authenticated")
    return user
  }

  const goalRef = (uid: string, goalId: string) => doc(db, "users", uid, "goals", goalId)

  const addGoal = async (data: NewGoal) => {
    const currentUser = requireUser()

    const targetAmount = round2(toAmount(data.targetAmount))
    if (targetAmount <= 0) throw new Error("Enter a target greater than 0")

    await addDoc(collection(db, "users", currentUser.uid, "goals"), {
      name: data.name,
      targetAmount,
      savedAmount: 0,
      description: data.description || "",
      accountId: data.accountId || "",
      ...(data.targetDate ? { targetDate: data.targetDate } : {}),
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const updateGoal = async (goal: Goal, updates: Partial<NewGoal>) => {
    const currentUser = requireUser()

    const targetAmount = round2(toAmount(updates.targetAmount ?? goal.targetAmount))
    if (targetAmount <= 0) throw new Error("Enter a target greater than 0")

    await updateDoc(goalRef(currentUser.uid, goal.id), {
      ...updates,
      targetAmount,
      ...(updates.targetDate === null ? { targetDate: null } : {}),
      updatedAt: serverTimestamp(),
    })
  }

  /** Deleting a goal frees whatever it was holding - no cash moves. */
  const deleteGoal = async (goalId: string) => {
    const currentUser = requireUser()
    await deleteDoc(goalRef(currentUser.uid, goalId))
  }

  /**
   * Sets more money aside. Nothing leaves the account - the amount is simply
   * reserved, so it stops showing up as free to spend.
   */
  const addFunds = async (goal: Goal, amount: number, availableToReserve: number) => {
    const currentUser = requireUser()

    const value = round2(toAmount(amount))
    if (value <= 0) throw new Error("Enter an amount greater than 0")
    if (value > round2(availableToReserve)) {
      throw new Error("You do not have that much left to set aside")
    }

    await runTransaction(db, async (tx) => {
      const ref = goalRef(currentUser.uid, goal.id)
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error("Goal not found")

      tx.update(ref, {
        savedAmount: round2(toAmount(snap.data().savedAmount) + value),
        status: "active",
        updatedAt: serverTimestamp(),
      })
    })
  }

  /** Releases money back to your spendable balance. Again, no cash moves. */
  const releaseFunds = async (goal: Goal, amount: number) => {
    const currentUser = requireUser()

    const value = round2(toAmount(amount))
    if (value <= 0) throw new Error("Enter an amount greater than 0")

    await runTransaction(db, async (tx) => {
      const ref = goalRef(currentUser.uid, goal.id)
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error("Goal not found")

      const remaining = round2(toAmount(snap.data().savedAmount) - value)
      if (remaining < 0) throw new Error("That is more than this goal is holding")

      tx.update(ref, { savedAmount: remaining, updatedAt: serverTimestamp() })
    })
  }

  /**
   * The plan finally happens: this is the one action that moves real money.
   * The amount leaves the chosen account as an expense, and comes off what the
   * goal was holding.
   */
  const spendFromGoal = async (goal: Goal, accountId: string, amount: number, spentOn: Date = new Date()) => {
    const currentUser = requireUser()
    if (!accountId) throw new Error("Please select an account")

    const value = round2(toAmount(amount))
    if (value <= 0) throw new Error("Enter an amount greater than 0")

    await runTransaction(db, async (tx) => {
      const ref = goalRef(currentUser.uid, goal.id)
      const accountRef = doc(db, "users", currentUser.uid, "accounts", accountId)

      const goalSnap = await tx.get(ref)
      if (!goalSnap.exists()) throw new Error("Goal not found")
      const accountSnap = await tx.get(accountRef)
      if (!accountSnap.exists()) throw new Error("Account not found")

      const saved = toAmount(goalSnap.data().savedAmount)
      if (value > round2(saved)) throw new Error("That is more than this goal is holding")

      const balance = round2(toAmount(accountSnap.data().balance) - value)
      if (balance < 0) throw new Error("Insufficient balance in this account")

      tx.update(accountRef, { balance, updatedAt: serverTimestamp() })

      tx.set(doc(collection(db, "users", currentUser.uid, "transactions")), {
        accountId,
        type: "spend",
        amount: value,
        description: `${goal.name} (from savings)`,
        date: spentOn,
        createdAt: serverTimestamp(),
        goalId: goal.id,
      })

      const remaining = round2(saved - value)
      tx.update(ref, {
        savedAmount: remaining,
        // Spending the last of it closes the goal off.
        ...(remaining === 0 ? { status: "completed", completedAt: spentOn } : {}),
        updatedAt: serverTimestamp(),
      })
    })
  }

  const activeGoals = goals.filter((goal) => goal.status === "active")
  const completedGoals = goals.filter((goal) => goal.status === "completed")

  /** Every rupee currently spoken for, across all goals. */
  const totalReserved = round2(goals.reduce((sum, goal) => sum + toAmount(goal.savedAmount), 0))
  const totalTargets = round2(activeGoals.reduce((sum, goal) => sum + toAmount(goal.targetAmount), 0))

  return {
    goals,
    activeGoals,
    completedGoals,
    totalReserved,
    totalTargets,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    addFunds,
    releaseFunds,
    spendFromGoal,
  }
}
