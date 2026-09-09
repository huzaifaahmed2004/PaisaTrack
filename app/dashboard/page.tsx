"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAccounts } from "@/hooks/use-accounts"
import { useTransactions } from "@/hooks/use-transactions"
import { useLoans } from "@/hooks/use-loans"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddTransactionModal } from "@/components/add-transaction-modal"
import { AddLoanModal } from "@/components/add-loan-modal"
import { Loader2, LogOut, Plus, Wallet, TrendingUp, Users, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Trash2, RefreshCw, PiggyBank } from "lucide-react"
import { TransferModal } from "@/components/transfer-modal"
import { ClearDataModal } from "@/components/clear-data-modal"
import { PaySubscriptionModal } from "@/components/pay-subscription-modal"
import { useGoals } from "@/hooks/use-goals"
import { Progress } from "@/components/ui/progress"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { dueStatusLabel } from "@/lib/recurrence"
import { Badge } from "@/components/ui/badge"
import { formatPKR, round2, transactionSign } from "@/lib/money"
import type { Subscription } from "@/lib/types"
import { accountTypeLabel } from "@/lib/account-types"

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const { accounts, totalBalance } = useAccounts()
  const { transactions, recentTransactions } = useTransactions()
  const { loans, netLoanAmount, totalGivenPending, totalTakenPending } = useLoans()
  const { subscriptions, dueSubscriptions, dueTotal, monthlyTotal, activeSubscriptions } = useSubscriptions()
  const { goals, activeGoals, totalReserved } = useGoals()
  const router = useRouter()

  const [incomeModalOpen, setIncomeModalOpen] = useState(false)
  const [spendModalOpen, setSpendModalOpen] = useState(false)
  const [loanModalOpen, setLoanModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [clearDataOpen, setClearDataOpen] = useState(false)
  const [payingSubscription, setPayingSubscription] = useState<Subscription | null>(null)

  useEffect(() => {
    if (!user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Failed to logout:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  // Balances already reflect cash that moved, so only the outstanding side of
  // each pending loan is added on top: what you are owed, less what you owe.
  const netWorth = totalBalance + netLoanAmount
  const hasLoans = loans.length > 0
  const loansGivenPending = loans.filter((loan) => loan.type === "given" && loan.status === "pending").length
  const loansTakenPending = loans.filter((loan) => loan.type === "taken" && loan.status === "pending").length
  const pausedCount = subscriptions.length - activeSubscriptions.length
  // What is genuinely free: the balance no savings plan has claimed.
  const freeToSpend = round2(totalBalance - totalReserved)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-accent-foreground">₨</span>
            </div>
            <h1 className="text-xl font-bold">PaisaTrack</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Welcome Message */}
        <div className="text-center py-6">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {user.displayName}!</h2>
          <p className="text-muted-foreground">Let's track your finances</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">PKR {formatPKR(totalBalance)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalReserved > 0
                  ? `PKR ${formatPKR(freeToSpend)} free - PKR ${formatPKR(totalReserved)} set aside`
                  : "All accounts combined"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">PKR {formatPKR(netWorth)}</div>
              <p className="text-xs text-muted-foreground mt-1">Including loans</p>
            </CardContent>
          </Card>
          <Card className={dueSubscriptions.length > 0 ? "border-orange-500/40" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">PKR {formatPKR(monthlyTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {dueSubscriptions.length > 0 ? (
                  <span className="text-orange-500 font-medium">PKR {formatPKR(dueTotal)} due now</span>
                ) : (
                  `Every month across ${activeSubscriptions.length} bill${activeSubscriptions.length !== 1 ? "s" : ""}`
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              <Button
                className="flex flex-col gap-2 h-auto py-4 bg-accent hover:bg-accent/90"
                onClick={() => setIncomeModalOpen(true)}
                disabled={accounts.length === 0}
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm">Income</span>
              </Button>
              <Button
                className="flex flex-col gap-2 h-auto py-4 bg-accent hover:bg-accent/90"
                onClick={() => setSpendModalOpen(true)}
                disabled={accounts.length === 0}
              >
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm">Spend</span>
              </Button>
              <Button
                className="flex flex-col gap-2 h-auto py-4 bg-accent hover:bg-accent/90"
                onClick={() => setLoanModalOpen(true)}
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">Loan</span>
              </Button>
              <Button
                className="flex flex-col gap-2 h-auto py-4 bg-accent hover:bg-accent/90"
                onClick={() => setTransferModalOpen(true)}
                disabled={accounts.length < 2}
              >
                <ArrowLeftRight className="h-5 w-5" />
                <span className="text-sm">Transfer</span>
              </Button>
            </div>
            {accounts.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Add an account first to record transactions. Existing loans can be entered without one.
              </p>
            )}
            {accounts.length === 1 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                You need at least two accounts to transfer between wallets
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Accounts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/accounts")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </CardHeader>
          <CardContent>
            {accounts.length > 0 ? (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h3 className="font-medium">{account.name}</h3>
                      <p className="text-sm text-muted-foreground">{accountTypeLabel(account.type)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">PKR {formatPKR(account.balance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No accounts added yet</p>
                <p className="text-sm">Add your first account to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Loans Summary</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/loans")}>
              View Loans
            </Button>
          </CardHeader>
          <CardContent>
            {hasLoans ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Owed to you</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-green-500">PKR {formatPKR(totalGivenPending)}</span>
                    <span className="text-xs text-muted-foreground">
                      {loansGivenPending} loan{loansGivenPending !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">You owe</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-red-500">PKR {formatPKR(totalTakenPending)}</span>
                    <span className="text-xs text-muted-foreground">
                      {loansTakenPending} loan{loansTakenPending !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No loans recorded yet</p>
                <p className="text-sm">Add a loan from Quick Actions</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Savings Plans</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/goals")}>
              <PiggyBank className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </CardHeader>
          <CardContent>
            {activeGoals.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  <span className="text-lg font-bold text-foreground">PKR {formatPKR(totalReserved)}</span> set aside,
                  leaving PKR {formatPKR(freeToSpend)} free to spend
                </p>
                {activeGoals.slice(0, 3).map((goal) => {
                  const progress =
                    goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0

                  return (
                    <div key={goal.id} className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-medium truncate">{goal.name}</h3>
                        <p className="text-sm whitespace-nowrap">
                          <span className="font-semibold">PKR {formatPKR(goal.savedAmount)}</span>
                          <span className="text-muted-foreground"> of {formatPKR(goal.targetAmount)}</span>
                        </p>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )
                })}
                {activeGoals.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{activeGoals.length - 3} more plan{activeGoals.length - 3 !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <PiggyBank className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No savings plans yet</p>
                <p className="text-sm">Set money aside for the things you are planning</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={dueSubscriptions.length > 0 ? "border-orange-500/40" : undefined}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Monthly Subscriptions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/subscriptions")}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </CardHeader>
          <CardContent>
            {activeSubscriptions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-1">
                  <p className="text-sm text-muted-foreground">
                    <span className="text-lg font-bold text-foreground">PKR {formatPKR(monthlyTotal)}</span> a month
                    across {activeSubscriptions.length} subscription{activeSubscriptions.length !== 1 ? "s" : ""}
                  </p>
                  {dueSubscriptions.length > 0 && (
                    <p className="text-sm font-medium text-orange-500">PKR {formatPKR(dueTotal)} waiting to be paid</p>
                  )}
                </div>

                {dueSubscriptions.length > 0 ? (
                  dueSubscriptions.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted rounded-lg"
                    >
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{subscription.name}</h3>
                        <Badge variant="destructive" className="text-xs mt-1">
                          {dueStatusLabel(subscription.nextDueDate)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold whitespace-nowrap">PKR {formatPKR(subscription.amount)}</p>
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90"
                          onClick={() => setPayingSubscription(subscription)}
                        >
                          Mark Paid
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing due right now.</p>
                )}

                {pausedCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {pausedCount} paused subscription{pausedCount !== 1 ? "s" : ""} not counted above
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <RefreshCw className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No subscriptions yet</p>
                <p className="text-sm">Track rent, internet, streaming and other monthly bills</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/transactions")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => {
                  const account = accounts.find((acc) => acc.id === transaction.accountId)
                  const isMoneyIn = transactionSign(transaction.type) === "+"

                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isMoneyIn ? "bg-green-500/20" : "bg-red-500/20"}`}>
                          {isMoneyIn ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{transaction.description}</h3>
                          <p className="text-sm text-muted-foreground">
                            {account?.name} • {transaction.date.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${isMoneyIn ? "text-green-500" : "text-red-500"}`}>
                          {transactionSign(transaction.type)}PKR {formatPKR(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Your recent transactions will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-lg">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-medium">Clear all data</p>
              <p className="text-sm text-muted-foreground">
                Delete every account, transaction and loan, and start over from scratch.
              </p>
            </div>
            <Button variant="destructive" onClick={() => setClearDataOpen(true)} className="shrink-0">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Data
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Modals */}
      <AddTransactionModal open={incomeModalOpen} onOpenChange={setIncomeModalOpen} type="income" />
      <AddTransactionModal open={spendModalOpen} onOpenChange={setSpendModalOpen} type="spend" />
      <AddLoanModal open={loanModalOpen} onOpenChange={setLoanModalOpen} />
      <TransferModal open={transferModalOpen} onOpenChange={setTransferModalOpen} />
      <PaySubscriptionModal
        open={!!payingSubscription}
        onOpenChange={(open) => !open && setPayingSubscription(null)}
        subscription={payingSubscription}
        onClose={() => setPayingSubscription(null)}
      />
      <ClearDataModal
        open={clearDataOpen}
        onOpenChange={setClearDataOpen}
        accountCount={accounts.length}
        transactionCount={transactions.length}
        loanCount={loans.length}
        subscriptionCount={subscriptions.length}
        goalCount={goals.length}
      />
    </div>
  )
}
