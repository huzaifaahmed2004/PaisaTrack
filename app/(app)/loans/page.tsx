"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useLoans } from "@/hooks/use-loans"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AddLoanModal } from "@/components/add-loan-modal"
import { EditLoanModal } from "@/components/edit-loan-modal"
import { SettleLoanModal } from "@/components/settle-loan-modal"
import { Loader2, ArrowLeft, Plus, Edit, Trash2, Users, CheckCircle, Clock } from "lucide-react"
import { formatPKR } from "@/lib/money"
import { toast } from "sonner"
import type { Loan } from "@/lib/types"

export default function LoansPage() {
  const { user, loading } = useAuth()
  const { loansGiven, loansTaken, deleteLoan, unsettleLoan, totalGivenPending, totalTakenPending } = useLoans()
  const router = useRouter()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [loanToSettle, setLoanToSettle] = useState<Loan | null>(null)

  useEffect(() => {
    if (!user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setEditModalOpen(true)
  }

  const handleDeleteLoan = async (loan: Loan) => {
    const warning =
      loan.carriedOver && loan.status === "pending"
        ? "Delete this loan? It never moved money through an account, so no balance changes. This cannot be undone."
        : "Delete this loan? Its entries will be removed and any money it moved will be put back on the account. This cannot be undone."

    if (confirm(warning)) {
      try {
        await deleteLoan(loan)
        toast.success("Loan deleted")
      } catch (error: any) {
        console.error("Error deleting loan:", error)
        toast.error(error?.message || "Failed to delete loan")
      }
    }
  }

  const handleOpenSettle = (loan: Loan) => {
    setLoanToSettle(loan)
    setSettleModalOpen(true)
  }

  const handleMarkPending = async (loan: Loan) => {
    if (!confirm("Reopen this loan? The settlement will be reversed on the account it was settled into.")) return

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

  const renderLoanCard = (loan: Loan) => (
    <div
      key={loan.id}
      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
    >
      <div className="flex items-start md:items-center gap-4">
        <div className={`p-2 rounded-full ${loan.status === "pending" ? "bg-orange-500/20" : "bg-green-500/20"}`}>
          {loan.status === "pending" ? (
            <Clock className="h-4 w-4 text-orange-500" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-medium truncate">{loan.personName}</h3>
          <p className="text-sm text-muted-foreground break-words">{loan.description}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{loan.date.toLocaleDateString()}</span>
            <Badge variant={loan.status === "pending" ? "destructive" : "secondary"} className="text-xs">
              {loan.status}
            </Badge>
            {loan.carriedOver && (
              <Badge variant="outline" className="text-xs" title="Recorded as an existing loan - no account balance was changed">
                existing
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-4">
        <div className="text-right">
          <p className={`text-base sm:text-lg font-semibold ${loan.type === "given" ? "text-blue-500" : "text-orange-500"}`}>
            PKR {formatPKR(loan.amount)}
          </p>
          {loan.settledAt && (
            <p className="text-xs text-muted-foreground">Settled {loan.settledAt.toLocaleDateString()}</p>
          )}
        </div>
        <div className="flex gap-1 sm:gap-2">
          {loan.status === "pending" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenSettle(loan)}
              className="text-xs text-green-600 hover:text-green-700"
            >
              Mark Settled
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMarkPending(loan)}
              className="text-xs text-orange-600 hover:text-orange-700"
            >
              Mark Pending
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditLoan(loan)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteLoan(loan)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between max-w-4xl mx-auto gap-3 flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold md:text-2xl lg:text-3xl">Loan Tracking</h1>
          </div>
          <Button onClick={() => setAddModalOpen(true)} className="bg-accent hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Loan
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Money Lent Out</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">PKR {formatPKR(totalGivenPending)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingGiven.length} pending loan{pendingGiven.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Money Borrowed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">PKR {formatPKR(totalTakenPending)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingTaken.length} pending loan{pendingTaken.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Loans Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Loan Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="given" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="given">Loans Given ({loansGiven.length})</TabsTrigger>
                <TabsTrigger value="taken">Loans Taken ({loansTaken.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="given" className="space-y-4 mt-6">
                {loansGiven.length > 0 ? (
                  <div className="space-y-4">
                    {pendingGiven.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Pending</h3>
                        <div className="space-y-3">{pendingGiven.map(renderLoanCard)}</div>
                      </div>
                    )}
                    {settledGiven.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Settled</h3>
                        <div className="space-y-3">{settledGiven.map(renderLoanCard)}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No loans given yet</h3>
                    <p className="text-sm mb-4">Track money you've lent to others</p>
                    <Button onClick={() => setAddModalOpen(true)} className="bg-accent hover:bg-accent/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Loan Given
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="taken" className="space-y-4 mt-6">
                {loansTaken.length > 0 ? (
                  <div className="space-y-4">
                    {pendingTaken.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Pending</h3>
                        <div className="space-y-3">{pendingTaken.map(renderLoanCard)}</div>
                      </div>
                    )}
                    {settledTaken.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Settled</h3>
                        <div className="space-y-3">{settledTaken.map(renderLoanCard)}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No loans taken yet</h3>
                    <p className="text-sm mb-4">Track money you've borrowed from others</p>
                    <Button onClick={() => setAddModalOpen(true)} className="bg-accent hover:bg-accent/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Loan Taken
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Modals */}
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
