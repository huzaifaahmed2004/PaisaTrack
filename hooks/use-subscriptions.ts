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
  deleteField,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { round2, toAmount } from "@/lib/money"
import { addMonths, billingPeriod, billingPeriodLabel, dueStatus, firstDueOnOrAfter } from "@/lib/recurrence"
import type { Subscription } from "@/lib/types"

type NewSubscription = {
  name: string
  amount: number
  dayOfMonth: number
  accountId?: string
  description?: string
}

export function useSubscriptions() {
  const { user } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSubscriptions([])
      setLoading(false)
      return
    }

    const subscriptionsRef = collection(db, "users", user.uid, "subscriptions")
    const q = query(subscriptionsRef, orderBy("nextDueDate", "asc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((entry) => {
        const raw = entry.data()
        const dayOfMonth = Math.min(Math.max(Math.round(toAmount(raw.dayOfMonth)) || 1, 1), 31)

        return {
          ...raw,
          id: entry.id,
          amount: toAmount(raw.amount),
          dayOfMonth,
          active: raw.active !== false,
          // A due date that never got written falls back to the next occurrence.
          nextDueDate: raw.nextDueDate?.toDate() || firstDueOnOrAfter(dayOfMonth),
          lastPaidAt: raw.lastPaidAt?.toDate() || undefined,
          lastPaidDue: raw.lastPaidDue?.toDate() || undefined,
          createdAt: raw.createdAt?.toDate() || new Date(),
          updatedAt: raw.updatedAt?.toDate() || new Date(),
        } as Subscription
      })

      setSubscriptions(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const requireUser = () => {
    if (!user) throw new Error("User not authenticated")
    return user
  }

  const addSubscription = async (data: NewSubscription) => {
    const currentUser = requireUser()

    const amount = round2(toAmount(data.amount))
    if (amount <= 0) throw new Error("Enter an amount greater than 0")

    const dayOfMonth = Math.round(data.dayOfMonth)
    if (!(dayOfMonth >= 1 && dayOfMonth <= 31)) throw new Error("Pick a day between 1 and 31")

    await addDoc(collection(db, "users", currentUser.uid, "subscriptions"), {
      ...data,
      amount,
      dayOfMonth,
      active: true,
      nextDueDate: firstDueOnOrAfter(dayOfMonth),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const updateSubscription = async (subscription: Subscription, updates: Partial<NewSubscription>) => {
    const currentUser = requireUser()

    const amount = round2(toAmount(updates.amount ?? subscription.amount))
    if (amount <= 0) throw new Error("Enter an amount greater than 0")

    const dayOfMonth = Math.round(updates.dayOfMonth ?? subscription.dayOfMonth)
    if (!(dayOfMonth >= 1 && dayOfMonth <= 31)) throw new Error("Pick a day between 1 and 31")

    // Moving the billing day moves the pending due date with it.
    const nextDueDate =
      dayOfMonth !== subscription.dayOfMonth ? firstDueOnOrAfter(dayOfMonth) : subscription.nextDueDate

    await updateDoc(doc(db, "users", currentUser.uid, "subscriptions", subscription.id), {
      ...updates,
      amount,
      dayOfMonth,
      nextDueDate,
      updatedAt: serverTimestamp(),
    })
  }

  /** Pausing keeps the record but stops it appearing as due. */
  const setActive = async (subscription: Subscription, active: boolean) => {
    const currentUser = requireUser()

    await updateDoc(doc(db, "users", currentUser.uid, "subscriptions", subscription.id), {
      active,
      // Coming back from a pause, the next charge is the next one ahead.
      ...(active ? { nextDueDate: firstDueOnOrAfter(subscription.dayOfMonth) } : {}),
      updatedAt: serverTimestamp(),
    })
  }

  const deleteSubscription = async (subscriptionId: string) => {
    const currentUser = requireUser()
    // Payments already made stay in the history as ordinary expenses.
    await deleteDoc(doc(db, "users", currentUser.uid, "subscriptions", subscriptionId))
  }

  /**
   * Records that this month's charge has actually gone out: the money leaves
   * the chosen account, an expense entry is written, and the bill rolls on to
   * next month.
   */
  const markPaid = async (subscription: Subscription, accountId: string, paidOn: Date = new Date()) => {
    const currentUser = requireUser()
    if (!accountId) throw new Error("Please select an account")

    const amount = round2(toAmount(subscription.amount))
    if (amount <= 0) throw new Error("This subscription has no amount to pay")

    const dueDate = subscription.nextDueDate

    await runTransaction(db, async (tx) => {
      const accountRef = doc(db, "users", currentUser.uid, "accounts", accountId)
      const accountSnap = await tx.get(accountRef)
      if (!accountSnap.exists()) throw new Error("Account not found")

      const balance = round2(toAmount(accountSnap.data().balance) - amount)
      if (balance < 0) throw new Error("Insufficient balance in this account")

      tx.update(accountRef, { balance, updatedAt: serverTimestamp() })

      const paymentRef = doc(collection(db, "users", currentUser.uid, "transactions"))
      tx.set(paymentRef, {
        accountId,
        type: "spend",
        amount,
        description: `${subscription.name} - ${billingPeriodLabel(dueDate)}`,
        date: paidOn,
        createdAt: serverTimestamp(),
        // Linked so the payment can be undone from the subscription.
        subscriptionId: subscription.id,
        subscriptionPeriod: billingPeriod(dueDate),
      })

      tx.update(doc(db, "users", currentUser.uid, "subscriptions", subscription.id), {
        nextDueDate: addMonths(dueDate, subscription.dayOfMonth, 1),
        lastPaidAt: paidOn,
        lastPaidDue: dueDate,
        lastPaymentId: paymentRef.id,
        accountId,
        updatedAt: serverTimestamp(),
      })
    })
  }

  /** Puts the most recent payment back: money returned, bill due again. */
  const undoLastPayment = async (subscription: Subscription) => {
    const currentUser = requireUser()
    if (!subscription.lastPaymentId || !subscription.lastPaidDue) {
      throw new Error("There is no recorded payment to undo")
    }

    await runTransaction(db, async (tx) => {
      const paymentRef = doc(db, "users", currentUser.uid, "transactions", subscription.lastPaymentId!)
      const paymentSnap = await tx.get(paymentRef)
      if (!paymentSnap.exists()) throw new Error("That payment entry no longer exists")

      const payment = paymentSnap.data()
      const accountRef = doc(db, "users", currentUser.uid, "accounts", payment.accountId)
      const accountSnap = await tx.get(accountRef)

      if (accountSnap.exists()) {
        tx.update(accountRef, {
          balance: round2(toAmount(accountSnap.data().balance) + toAmount(payment.amount)),
          updatedAt: serverTimestamp(),
        })
      }

      tx.delete(paymentRef)
      tx.update(doc(db, "users", currentUser.uid, "subscriptions", subscription.id), {
        nextDueDate: subscription.lastPaidDue,
        lastPaidAt: deleteField(),
        lastPaidDue: deleteField(),
        lastPaymentId: deleteField(),
        updatedAt: serverTimestamp(),
      })
    })
  }

  const activeSubscriptions = subscriptions.filter((subscription) => subscription.active)
  const dueSubscriptions = activeSubscriptions.filter((subscription) => {
    const status = dueStatus(subscription.nextDueDate)
    return status === "overdue" || status === "due-today"
  })

  const monthlyTotal = round2(
    activeSubscriptions.reduce((sum, subscription) => sum + toAmount(subscription.amount), 0),
  )
  const dueTotal = round2(dueSubscriptions.reduce((sum, subscription) => sum + toAmount(subscription.amount), 0))


  return {
    subscriptions,
    activeSubscriptions,
    dueSubscriptions,
    monthlyTotal,
    dueTotal,
    loading,
    addSubscription,
    updateSubscription,
    setActive,
    deleteSubscription,
    markPaid,
    undoLastPayment,
  }
}
