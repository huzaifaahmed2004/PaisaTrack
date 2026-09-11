"use client"

import { useAccounts } from "@/hooks/use-accounts"
import { useTransactions } from "@/hooks/use-transactions"
import { useTransfers } from "@/hooks/use-transfers"
import { useLoans } from "@/hooks/use-loans"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { useGoals } from "@/hooks/use-goals"
import { useSpendable } from "@/hooks/use-spendable"
import { useBudgets } from "@/hooks/use-budgets"
import { formatPKR, parseDateInput } from "@/lib/money"
import { ordinalDay } from "@/lib/recurrence"
import type { AssistantAction } from "@/lib/ai/actions"

/**
 * Runs assistant actions through the very same hooks the buttons use, so the
 * balance rules, atomic writes and guards apply identically no matter whether
 * a person tapped a button or spoke a sentence.
 */
export function useAssistantActions() {
  const { accounts, addAccount } = useAccounts()
  const { addTransaction } = useTransactions()
  const { transfer } = useTransfers()
  const { loans, createLoan, settleLoan } = useLoans()
  const { subscriptions, addSubscription, markPaid } = useSubscriptions()
  const { goals, addGoal, addFunds, releaseFunds, spendFromGoal } = useGoals()
  const { freeToSpend } = useSpendable()
  const { budgets, usage: budgetUsageList, addBudget } = useBudgets()

  const accountName = (id?: string) => accounts.find((account) => account.id === id)?.name ?? "the account"
  const parseDate = (value?: string) => (value ? parseDateInput(value) : new Date())
  // Only a budget that still exists is honoured - a stale id is dropped.
  const budgetFor = (type: string, budgetId?: string) =>
    type === "spend" && budgetId ? budgets.find((budget) => budget.id === budgetId) : undefined

  /** A plain-language sentence the user confirms before anything is written. */
  const describe = (action: AssistantAction): string => {
    const { name, args } = action

    switch (name) {
      case "add_transaction":
        return `Record ${args.type === "income" ? "income" : "an expense"} of PKR ${formatPKR(args.amount)} ${
          args.type === "income" ? "into" : "from"
        } ${accountName(args.accountId)} - "${args.description}"${
          budgetFor(args.type, args.budgetId) ? ` (${budgetFor(args.type, args.budgetId)!.name} budget)` : ""
        }`
      case "transfer":
        return `Transfer PKR ${formatPKR(args.amount)} from ${accountName(args.fromAccountId)} to ${accountName(
          args.toAccountId,
        )}`
      case "add_account":
        return `Add a ${args.type} account "${args.name}" with PKR ${formatPKR(args.balance)}`
      case "add_loan": {
        const direction = args.type === "given" ? "lent to" : "borrowed from"
        const via = args.carriedOver
          ? " (already happened - no balance changes)"
          : ` via ${accountName(args.accountId)}`
        return `Record PKR ${formatPKR(args.amount)} ${direction} ${args.personName}${via}`
      }
      case "settle_loan": {
        const loan = loans.find((entry) => entry.id === args.loanId)
        if (!loan) return "Settle a loan"
        return `Settle the PKR ${formatPKR(loan.amount)} loan with ${loan.personName} - money ${
          loan.type === "given" ? "into" : "out of"
        } ${accountName(args.accountId)}`
      }
      case "add_subscription":
        return `Add "${args.name}" as a PKR ${formatPKR(args.amount)} monthly bill due the ${ordinalDay(
          args.dayOfMonth,
        )}`
      case "pay_subscription": {
        const subscription = subscriptions.find((entry) => entry.id === args.subscriptionId)
        if (!subscription) return "Mark a subscription paid"
        return `Mark ${subscription.name} paid - PKR ${formatPKR(subscription.amount)} out of ${accountName(
          args.accountId,
        )}`
      }
      case "add_goal":
        return `Start a savings plan "${args.name}" with a target of PKR ${formatPKR(args.targetAmount)}`
      case "goal_set_aside": {
        const goal = goals.find((entry) => entry.id === args.goalId)
        return `Set PKR ${formatPKR(args.amount)} aside for ${goal?.name ?? "the plan"} - no cash moves`
      }
      case "goal_release": {
        const goal = goals.find((entry) => entry.id === args.goalId)
        return `Release PKR ${formatPKR(args.amount)} from ${goal?.name ?? "the plan"} - no cash moves`
      }
      case "goal_spend": {
        const goal = goals.find((entry) => entry.id === args.goalId)
        return `Spend PKR ${formatPKR(args.amount)} on ${goal?.name ?? "the plan"} from ${accountName(
          args.accountId,
        )}`
      }
      case "add_budget":
        return `Create a "${args.name}" budget of PKR ${formatPKR(args.limit)} per cycle - no money moves`
      default:
        return "Unknown action"
    }
  }

  /** Runs one action. Throws with a readable message when it cannot proceed. */
  const execute = async (action: AssistantAction): Promise<string> => {
    const { name, args } = action

    switch (name) {
      case "add_transaction": {
        await addTransaction({
          accountId: args.accountId,
          type: args.type,
          amount: args.amount,
          description: args.description,
          date: parseDate(args.date),
          ...(budgetFor(args.type, args.budgetId) ? { budgetId: args.budgetId } : {}),
        })
        return `${args.type === "income" ? "Income" : "Expense"} of PKR ${formatPKR(args.amount)} recorded`
      }

      case "transfer": {
        const from = accounts.find((account) => account.id === args.fromAccountId)
        const to = accounts.find((account) => account.id === args.toAccountId)
        if (!from || !to) throw new Error("Could not find those accounts")

        await transfer({
          fromAccountId: from.id,
          fromAccountName: from.name,
          toAccountId: to.id,
          toAccountName: to.name,
          amount: args.amount,
          description: args.description || "Transfer",
          date: parseDate(args.date),
        })
        return `Transferred PKR ${formatPKR(args.amount)} to ${to.name}`
      }

      case "add_account": {
        await addAccount({ name: args.name, type: args.type, balance: args.balance })
        return `${args.name} added`
      }

      case "add_loan": {
        await createLoan({
          type: args.type,
          personName: args.personName,
          amount: args.amount,
          description: args.description || (args.type === "given" ? "Loan given" : "Loan taken"),
          date: parseDate(args.date),
          accountId: args.accountId,
          carriedOver: args.carriedOver,
        })
        return `Loan with ${args.personName} recorded`
      }

      case "settle_loan": {
        const loan = loans.find((entry) => entry.id === args.loanId)
        if (!loan) throw new Error("Could not find that loan")

        await settleLoan(loan, args.accountId)
        return `Loan with ${loan.personName} settled`
      }

      case "add_subscription": {
        await addSubscription({
          name: args.name,
          amount: args.amount,
          dayOfMonth: args.dayOfMonth,
          accountId: args.accountId,
          description: args.description,
        })
        return `${args.name} added as a monthly bill`
      }

      case "pay_subscription": {
        const subscription = subscriptions.find((entry) => entry.id === args.subscriptionId)
        if (!subscription) throw new Error("Could not find that subscription")

        await markPaid(subscription, args.accountId, parseDate(args.date))
        return `${subscription.name} marked paid`
      }

      case "add_goal": {
        await addGoal({
          name: args.name,
          targetAmount: args.targetAmount,
          accountId: args.accountId,
          description: args.description,
          targetDate: args.targetDate ? parseDateInput(args.targetDate) : null,
        })
        return `Savings plan "${args.name}" created`
      }

      case "goal_set_aside": {
        const goal = goals.find((entry) => entry.id === args.goalId)
        if (!goal) throw new Error("Could not find that plan")

        await addFunds(goal, args.amount, freeToSpend)
        return `PKR ${formatPKR(args.amount)} set aside for ${goal.name}`
      }

      case "goal_release": {
        const goal = goals.find((entry) => entry.id === args.goalId)
        if (!goal) throw new Error("Could not find that plan")

        await releaseFunds(goal, args.amount)
        return `PKR ${formatPKR(args.amount)} released from ${goal.name}`
      }

      case "goal_spend": {
        const goal = goals.find((entry) => entry.id === args.goalId)
        if (!goal) throw new Error("Could not find that plan")

        await spendFromGoal(goal, args.accountId, args.amount, parseDate(args.date))
        return `Spent PKR ${formatPKR(args.amount)} on ${goal.name}`
      }

      case "add_budget": {
        await addBudget({ name: args.name, limit: args.limit })
        return `${args.name} budget created`
      }

      default:
        throw new Error("That action is not supported")
    }
  }

  /** The snapshot the model needs to resolve names to ids. */
  const buildContext = () => ({
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: account.balance,
    })),
    loans: loans.map((loan) => ({
      id: loan.id,
      personName: loan.personName,
      amount: loan.amount,
      type: loan.type,
      status: loan.status,
    })),
    subscriptions: subscriptions.map((subscription) => ({
      id: subscription.id,
      name: subscription.name,
      amount: subscription.amount,
      dayOfMonth: subscription.dayOfMonth,
    })),
    goals: goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
    })),
    budgets: budgetUsageList.map((entry) => ({
      id: entry.budget.id,
      name: entry.budget.name,
      limit: entry.budget.limit,
      spent: entry.spent,
    })),
  })

  return { describe, execute, buildContext }
}
