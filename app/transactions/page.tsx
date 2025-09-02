"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAccounts } from "@/hooks/use-accounts"
import { useTransactions } from "@/hooks/use-transactions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { EditTransactionModal } from "@/components/edit-transaction-modal"
import { Loader2, ArrowLeft, Filter, ArrowUpRight, ArrowDownRight, Edit, Trash2, TrendingUp } from "lucide-react"
import type { Transaction } from "@/lib/types"

export default function TransactionsPage() {
  const { user, loading } = useAuth()
  const { accounts } = useAccounts()
  const { transactions, deleteTransaction } = useTransactions()
  const router = useRouter()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [filters, setFilters] = useState({
    account: "all",
    type: "all",
    dateFrom: "",
    dateTo: "",
  })

  useEffect(() => {
    if (!user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setEditModalOpen(true)
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    if (confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      try {
        await deleteTransaction(transactionId)
      } catch (error) {
        console.error("Error deleting transaction:", error)
      }
    }
  }

  const filteredTransactions = transactions.filter((transaction) => {
    if (filters.account !== "all" && transaction.accountId !== filters.account) return false
    if (filters.type !== "all" && transaction.type !== filters.type) return false
    if (filters.dateFrom && transaction.date < new Date(filters.dateFrom)) return false
    if (filters.dateTo && transaction.date > new Date(filters.dateTo)) return false
    return true
  })

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case "spend":
        return <ArrowDownRight className="h-4 w-4 text-red-500" />
      case "loan-given":
        return <ArrowUpRight className="h-4 w-4 text-blue-500" />
      case "loan-taken":
        return <ArrowDownRight className="h-4 w-4 text-orange-500" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "income":
        return "text-green-500"
      case "spend":
        return "text-red-500"
      case "loan-given":
        return "text-blue-500"
      case "loan-taken":
        return "text-orange-500"
      default:
        return "text-foreground"
    }
  }

  const getTransactionSign = (type: string) => {
    return type === "income" || type === "loan-taken" ? "+" : "-"
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Transaction History</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Account</label>
                <Select value={filters.account} onValueChange={(value) => setFilters({ ...filters, account: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="spend">Expense</SelectItem>
                    <SelectItem value="loan-given">Loan Given</SelectItem>
                    <SelectItem value="loan-taken">Loan Taken</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>
            {(filters.account !== "all" || filters.type !== "all" || filters.dateFrom || filters.dateTo) && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ account: "all", type: "all", dateFrom: "", dateTo: "" })}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length > 0 ? (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => {
                  const account = accounts.find((acc) => acc.id === transaction.accountId)

                  return (
                    <div
                      key={transaction.id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-start md:items-center gap-4">
                        <div className="p-2 rounded-full bg-background">{getTransactionIcon(transaction.type)}</div>
                        <div className="min-w-0">
                          <h3 className="font-medium truncate">{transaction.description}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate max-w-[140px] sm:max-w-[200px]">{account?.name}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="capitalize">{transaction.type.replace("-", " ")}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{transaction.date.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-4">
                        <div className="text-right">
                          <p className={`text-base sm:text-lg font-semibold ${getTransactionColor(transaction.type)}`}>
                            {getTransactionSign(transaction.type)}PKR {transaction.amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTransaction(transaction)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No transactions found</h3>
                <p className="text-sm mb-4">
                  {transactions.length === 0
                    ? "Start adding transactions to see them here"
                    : "Try adjusting your filters to see more transactions"}
                </p>
                <Button onClick={() => router.push("/dashboard")} className="bg-accent hover:bg-accent/90">
                  Go to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Modal */}
      <EditTransactionModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  )
}
