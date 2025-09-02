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
import { Loader2, LogOut, Plus, Wallet, TrendingUp, Users, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from "lucide-react"
import { TransferModal } from "@/components/transfer-modal"

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const { accounts, totalBalance } = useAccounts()
  const { recentTransactions } = useTransactions()
  const { netLoanAmount, loansGiven, loansTaken } = useLoans()
  const router = useRouter()

  const [incomeModalOpen, setIncomeModalOpen] = useState(false)
  const [spendModalOpen, setSpendModalOpen] = useState(false)
  const [loanModalOpen, setLoanModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)

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

  const netWorth = totalBalance + netLoanAmount

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">PKR {totalBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">All accounts combined</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">PKR {netWorth.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Including loans</p>
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
                disabled={accounts.length === 0}
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
                Add an account first to record transactions
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
                      <p className="text-sm text-muted-foreground capitalize">{account.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">PKR {account.balance.toLocaleString()}</p>
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
            {loansGiven.length + loansTaken.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Pending Loans Given</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-red-500">PKR {loansGiven
                      .filter((l) => l.status === "pending")
                      .reduce((s, l) => s + l.amount, 0)
                      .toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">{loansGiven.filter((l) => l.status === "pending").length} loan(s)</span>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Pending Loans Taken</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-green-500">PKR {loansTaken
                      .filter((l) => l.status === "pending")
                      .reduce((s, l) => s + l.amount, 0)
                      .toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">{loansTaken.filter((l) => l.status === "pending").length} loan(s)</span>
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
                  const isIncome = transaction.type === "income"

                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isIncome ? "bg-green-500/20" : "bg-red-500/20"}`}>
                          {isIncome ? (
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
                        <p className={`font-semibold ${isIncome ? "text-green-500" : "text-red-500"}`}>
                          {isIncome ? "+" : "-"}PKR {transaction.amount.toLocaleString()}
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
      </main>

      {/* Modals */}
      <AddTransactionModal open={incomeModalOpen} onOpenChange={setIncomeModalOpen} type="income" />
      <AddTransactionModal open={spendModalOpen} onOpenChange={setSpendModalOpen} type="spend" />
      <AddLoanModal open={loanModalOpen} onOpenChange={setLoanModalOpen} />
      <TransferModal open={transferModalOpen} onOpenChange={setTransferModalOpen} />
    </div>
  )
}
