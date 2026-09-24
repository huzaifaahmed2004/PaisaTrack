"use client"

import { useMemo, useState } from "react"
import { MoreHorizontal, Pencil, ReceiptText, Search, SlidersHorizontal, Trash2, X } from "lucide-react"
import { useAccounts } from "@/hooks/use-accounts"
import { useBudgets } from "@/hooks/use-budgets"
import { useTransactions } from "@/hooks/use-transactions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditTransactionModal } from "@/components/edit-transaction-modal"
import { useConfirm } from "@/components/confirm-dialog"
import { useQuickActions } from "@/components/app-shell"
import { Amount, EmptyState, PageHeader } from "@/components/app-ui"
import { TransactionRow } from "@/components/transaction-row"
import { endOfDay, startOfDay } from "@/lib/money"
import { flowBetween, groupByDay } from "@/lib/insights"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Transaction } from "@/lib/types"

type Kind = "all" | "in" | "out" | "transfers" | "loans"

const KINDS: { value: Kind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "out", label: "Spent" },
  { value: "in", label: "Received" },
  { value: "transfers", label: "Transfers" },
  { value: "loans", label: "Loans" },
]

const matchesKind = (transaction: Transaction, kind: Kind) => {
  switch (kind) {
    case "in":
      return transaction.type === "income" && !transaction.transferId && !transaction.loanId
    case "out":
      return transaction.type === "spend" && !transaction.transferId && !transaction.loanId
    case "transfers":
      return !!transaction.transferId
    case "loans":
      return !!transaction.loanId
    default:
      return true
  }
}

const EMPTY_FILTERS = { search: "", kind: "all" as Kind, account: "all", dateFrom: "", dateTo: "" }

export default function TransactionsPage() {
  const { accounts } = useAccounts()
  const { budgets } = useBudgets()
  const { transactions, deleteTransaction } = useTransactions()
  const confirm = useConfirm()
  const { open, canRun } = useQuickActions()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [showMore, setShowMore] = useState(false)

  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name
  const budgetName = (id?: string) => (id ? budgets.find((budget) => budget.id === id)?.name : undefined)

  const filtered = useMemo(() => {
    const needle = filters.search.trim().toLowerCase()
    return transactions.filter((transaction) => {
      if (filters.account !== "all" && transaction.accountId !== filters.account) return false
      if (!matchesKind(transaction, filters.kind)) return false
      // Both bounds are inclusive of the day the user picked, in local time.
      if (filters.dateFrom && transaction.date < startOfDay(filters.dateFrom)) return false
      if (filters.dateTo && transaction.date > endOfDay(filters.dateTo)) return false
      if (needle && !transaction.description.toLowerCase().includes(needle)) return false
      return true
    })
  }, [transactions, filters])

  const groups = useMemo(() => groupByDay(filtered), [filtered])
  const totals = useMemo(() => flowBetween(filtered, new Date(0), new Date(8.64e15)), [filtered])

  const isFiltered =
    filters.search !== "" ||
    filters.kind !== "all" ||
    filters.account !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== ""

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setEditModalOpen(true)
  }

  const handleDeleteTransaction = async (transaction: Transaction) => {
    const ok = await confirm({
      title: transaction.transferId ? "Delete this transfer?" : "Delete this transaction?",
      description: transaction.transferId
        ? "Both sides will be removed and the balances put back."
        : "The amount will be put back on its account. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    })
    if (!ok) return

    try {
      // Removing an entry also reverses the money it moved.
      await deleteTransaction(transaction)
      toast.success("Transaction deleted")
    } catch (error: any) {
      console.error("Error deleting transaction:", error)
      toast.error(error?.message || "Failed to delete transaction")
    }
  }

  const editBlockedReason = (transaction: Transaction) =>
    transaction.loanId
      ? "Edit this from the Loans page"
      : transaction.subscriptionId
        ? "Edit this from the Bills page"
        : transaction.transferId
          ? "Transfers cannot be edited - delete and record it again"
          : null

  const deleteBlockedReason = (transaction: Transaction) =>
    transaction.loanId
      ? "Delete this from the Loans page"
      : transaction.subscriptionId
        ? "Undo this from the Bills page"
        : null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity"
        description={`${filtered.length} transaction${filtered.length !== 1 ? "s" : ""}${isFiltered ? " match your filters" : ""}`}
        actions={
          <Button onClick={() => open("spend")} disabled={!canRun("spend")} className="hidden md:inline-flex">
            Add expense
          </Button>
        }
      />

      <div className="grid grid-cols-3 divide-x rounded-2xl border bg-card py-3 shadow-xs">
        {[
          { label: "Money in", value: <Amount value={totals.income} />, className: "text-positive" },
          { label: "Money out", value: <Amount value={totals.spend} /> },
          {
            label: "Net",
            value: <Amount value={Math.abs(totals.net)} sign={totals.net < 0 ? "-" : "+"} />,
            className: totals.net < 0 ? "text-negative" : "text-positive",
          },
        ].map((stat) => (
          <div key={stat.label} className="min-w-0 px-3 md:px-5">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn("mt-0.5 truncate text-[15px] font-semibold md:text-xl", stat.className)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search descriptions"
              className="h-10 rounded-xl bg-card pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowMore((value) => !value)}
            className={cn("h-10 rounded-xl", showMore && "border-primary/50 text-primary")}
          >
            <SlidersHorizontal />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {KINDS.map((kind) => (
            <button
              key={kind.value}
              type="button"
              onClick={() => setFilters({ ...filters, kind: kind.value })}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                filters.kind === kind.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {kind.label}
            </button>
          ))}
          {isFiltered && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              Clear
            </button>
          )}
        </div>

        {showMore && (
          <div className="grid grid-cols-1 gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Account</label>
              <Select value={filters.account} onValueChange={(value) => setFilters({ ...filters, account: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Transactions, grouped by day */}
      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.key} className="rounded-2xl border bg-card p-2 shadow-xs md:p-3">
              <div className="flex items-center justify-between px-2 pt-1 pb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</h2>
                {group.net !== 0 && (
                  <Amount
                    value={Math.abs(group.net)}
                    sign={group.net < 0 ? "-" : "+"}
                    className="text-xs font-medium text-muted-foreground"
                  />
                )}
              </div>
              <div className="space-y-0.5">
                {group.items.map((transaction) => {
                  const editBlocked = editBlockedReason(transaction)
                  const deleteBlocked = deleteBlockedReason(transaction)
                  return (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      accountName={accountName(transaction.accountId)}
                      budgetName={budgetName(transaction.budgetId)}
                      actions={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground">
                              <MoreHorizontal />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              disabled={!!editBlocked}
                              onSelect={() => handleEditTransaction(transaction)}
                            >
                              <Pencil />
                              {editBlocked ?? "Edit"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={!!deleteBlocked}
                              onSelect={() => handleDeleteTransaction(transaction)}
                            >
                              <Trash2 />
                              {deleteBlocked ?? "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card">
          <EmptyState
            icon={ReceiptText}
            title="No transactions found"
            description={
              transactions.length === 0
                ? "Start adding transactions to see them here."
                : "Try adjusting your search or filters."
            }
            action={
              isFiltered ? (
                <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => open("spend")} disabled={!canRun("spend")}>
                  Add expense
                </Button>
              )
            }
          />
        </div>
      )}

      <EditTransactionModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  )
}
