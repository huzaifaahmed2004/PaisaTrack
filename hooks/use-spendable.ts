"use client"

import { useAccounts } from "@/hooks/use-accounts"
import { useGoals } from "@/hooks/use-goals"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { useSettings } from "@/hooks/use-settings"
import { round2 } from "@/lib/money"
import { billsHeld } from "@/lib/recurrence"

/**
 * The one place free-to-spend is worked out. Money stays in its accounts, but
 * two things already have a claim on it: savings plans, and bills that fall due
 * before the next salary. Whatever is left over is genuinely free.
 */
export function useSpendable() {
  const { totalBalance } = useAccounts()
  const { totalReserved: reservedForPlans } = useGoals()
  const { subscriptions } = useSubscriptions()
  const { payWindow } = useSettings()

  const bills = billsHeld(subscriptions, payWindow)
  const reservedForBills = bills.total
  const totalHeld = round2(reservedForPlans + reservedForBills)
  const freeToSpend = round2(totalBalance - totalHeld)
  const holdLabel = payWindow ? "held until your next salary" : "held for bills due this month"

  return {
    totalBalance,
    reservedForPlans,
    reservedForBills,
    heldBills: bills.held,
    holdUntil: bills.horizon,
    payWindow,
    holdLabel,
    totalHeld,
    freeToSpend,
  }
}
