"use client"

import { useState } from "react"
import { ArrowDownLeft, ArrowUpRight, HandCoins, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useLoans } from "@/hooks/use-loans"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddLoanModal } from "@/components/add-loan-modal"
import { EditLoanModal } from "@/components/edit-loan-modal"
import { SettleLoanModal } from "@/components/settle-loan-modal"
import { useConfirm } from "@/components/confirm-dialog"
import { Amount, EmptyState, PageHeader, StatCard } from "@/components/app-ui"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Loan } from "@/lib/types"

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

export default function LoansPage() {
  const { loansGiven, loansTaken, deleteLoan, unsettleLoan, totalGivenPending, totalTakenPending } = useLoans()
  const confirm = useConfirm()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [loanToSettle, setLoanToSettle] = useState<Loan | null>(null)

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setEditModalOpen(true)
  }

  const handleDeleteLoan = async (loan: Loan) => {
    const ok = await confirm({
      title: "Delete this loan?",
      description:
        loan.carriedOver && loan.status === "pending"
          ? "It never moved money through an account, so no balance changes. This cannot be undone."
          : "Its entries will be removed and any money it moved will be put back on the account. This cannot be undone.",
      confirmLabel: "Delete loan",
      destructive: true,
    })
    if (!ok) return

    try {
      await deleteLoan(loan)
      toast.success("Loan deleted")
    } catch (error: any) {
      console.error("Error deleting loan:", error)
      toast.error(error?.message || "Failed to delete loan")
    }
  }

  const handleOpenSettle = (loan: Loan) => {
    setLoanToSettle(loan)
    setSettleModalOpen(true)
  }

  const handleMarkPending = async (loan: Loan) => {
    const ok = await confirm({
      title: "Reopen this loan?",
      description: "The settlement will be reversed on the account it was settled into.",
      confirmLabel: "Reopen",
    })
    if (!ok) return

    try {
      // Reopening has to undo the settlement, or the money would be counted twice.
      const reversed = await unsettleLoan(loan)
      toast.success(
        reversed
          ? "Loan reopened as pending"
          : "Loan reopened as pending. No linked settlement entry was found, so check the account balance yourself.",
      )
    } catch (error: any) {
      console.error("Error updating loan status:", error)
      toast.error(error?.message || "Failed to reopen loan")
    }
  }

  const pendingGiven = loansGiven.filter((loan) => loan.status === "pending")
  const settledGiven = loansGiven.filter((loan) => loan.status === "settled")
  const pendingTaken = loansTaken.filter((loan) => loan.status === "pending")
  const settledTaken = loansTaken.filter((loan) => loan.status === "settled")

  const renderLoan = (loan: Loan) => {
    const pending = loan.status === "pending"
    return (
      <div
        key={loan.id}
        className={cn("flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-accent/60", !pending && "opacity-70")}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            loan.type === "given" ? "bg-positive/12 text-positive" : "bg-negative/12 text-negative",
          )}
        >
          {initials(loan.personName) || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium">{loan.personName}</p>
            {!pending && <Badge variant="muted">settled</Badge>}
            {loan.carriedOver && (
              <Badge variant="outline" title="Recorded as an existing loan - no account balance was changed">
                existing
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {[loan.description, loan.date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })]
              .filter(Boolean)
              .join(" · ")}
            {loan.settledAt && ` · settled ${loan.settledAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
          </p>
        </div>
        <Amount value={loan.amount} className="text-sm font-semibold" />
        {pending && (
          <Button size="sm" variant="outline" onClick={() => handleOpenSettle(loan)} className="hidden sm:inline-flex">
            Settle
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground">
              <MoreHorizontal />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {pending ? (
              <DropdownMenuItem onSelect={() => handleOpenSettle(loan)}>
                <HandCoins />
                Mark settled
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => handleMarkPending(loan)}>
                <RotateCcw />
                Reopen as pending
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => handleEditLoan(loan)}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => handleDeleteLoan(loan)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const renderList = (pending: Loan[], settled: Loan[], emptyTitle: string, emptyDescription: string) =>
    pending.length + settled.length > 0 ? (
      <div className="space-y-4">
        {pending.length > 0 && (
          <div>
            <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending</h3>
            <div className="space-y-0.5">{pending.map(renderLoan)}</div>
          </div>
        )}
        {settled.length > 0 && (
          <div>
            <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Settled</h3>
            <div className="space-y-0.5">{settled.map(renderLoan)}</div>
          </div>
        )}
      </div>
    ) : (
      <EmptyState
        icon={HandCoins}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus />
            Add loan
          </Button>
        }
      />
    )

  const net = totalGivenPending - totalTakenPending

  return (
    <div className="space-y-5">
      <PageHeader
        title="Loans"
        description="Money you have lent out and borrowed"
        actions={
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus />
            Add loan
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard
          label="Owed to you"
          value={<Amount value={totalGivenPending} />}
          hint={`${pendingGiven.length} pending`}
          tone="positive"
          icon={ArrowDownLeft}
        />
        <StatCard
          label="You owe"
          value={<Amount value={totalTakenPending} />}
          hint={`${pendingTaken.length} pending`}
          tone="negative"
          icon={ArrowUpRight}
        />
        <StatCard
          label="Net position"
          value={<Amount value={Math.abs(net)} sign={net < 0 ? "-" : net > 0 ? "+" : ""} />}
          hint={net >= 0 ? "In your favour" : "You owe more than you are owed"}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <section className="rounded-2xl border bg-card p-3 shadow-xs md:p-4">
        <Tabs defaultValue="given" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="given">Lent ({loansGiven.length})</TabsTrigger>
            <TabsTrigger value="taken">Borrowed ({loansTaken.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="given" className="mt-3">
            {renderList(pendingGiven, settledGiven, "No loans given yet", "Track money you have lent to others.")}
          </TabsContent>
          <TabsContent value="taken" className="mt-3">
            {renderList(pendingTaken, settledTaken, "No loans taken yet", "Track money you have borrowed from others.")}
          </TabsContent>
        </Tabs>
      </section>

      <AddLoanModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      <EditLoanModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        loan={selectedLoan}
        onClose={() => setSelectedLoan(null)}
      />
      <SettleLoanModal open={settleModalOpen} onOpenChange={setSettleModalOpen} loan={loanToSettle} />
    </div>
  )
}
