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
import { Loader2, ArrowLeft, Plus, Edit, Trash2, Users, CheckCircle, Clock } from "lucide-react"
import type { Loan } from "@/lib/types"

export default function LoansPage() {
  const { user, loading } = useAuth()
  const { loansGiven, loansTaken, deleteLoan, updateLoan } = useLoans()
  const router = useRouter()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)

  useEffect(() => {
    if (!user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setEditModalOpen(true)
  }

  const handleDeleteLoan = async (loanId: string) => {
    if (confirm("Are you sure you want to delete this loan record? This action cannot be undone.")) {
      try {
        await deleteLoan(loanId)
      } catch (error) {
        console.error("Error deleting loan:", error)
      }
    }
  }

  const handleToggleStatus = async (loan: Loan) => {
    const newStatus = loan.status === "pending" ? "settled" : "pending"
    try {
      await updateLoan(loan.id, { status: newStatus })
    } catch (error) {
      console.error("Error updating loan status:", error)
    }
  }

  const pendingGiven = loansGiven.filter((loan) => loan.status === "pending")
  const settledGiven = loansGiven.filter((loan) => loan.status === "settled")
  const pendingTaken = loansTaken.filter((loan) => loan.status === "pending")
  const settledTaken = loansTaken.filter((loan) => loan.status === "settled")

  const totalGivenPending = pendingGiven.reduce((sum, loan) => sum + loan.amount, 0)
  const totalTakenPending = pendingTaken.reduce((sum, loan) => sum + loan.amount, 0)

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
      className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${loan.status === "pending" ? "bg-orange-500/20" : "bg-green-500/20"}`}>
          {loan.status === "pending" ? (
            <Clock className="h-4 w-4 text-orange-500" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>
        <div>
          <h3 className="font-medium">{loan.personName}</h3>
          <p className="text-sm text-muted-foreground">{loan.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{loan.date.toLocaleDateString()}</span>
            <Badge variant={loan.status === "pending" ? "destructive" : "secondary"} className="text-xs">
              {loan.status}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`text-lg font-semibold ${loan.type === "given" ? "text-blue-500" : "text-orange-500"}`}>
            PKR {loan.amount.toLocaleString()}
          </p>
          {loan.settledAt && (
            <p className="text-xs text-muted-foreground">Settled {loan.settledAt.toLocaleDateString()}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(loan)}
            className={`text-xs ${
              loan.status === "pending"
                ? "text-green-600 hover:text-green-700"
                : "text-orange-600 hover:text-orange-700"
            }`}
          >
            {loan.status === "pending" ? "Mark Settled" : "Mark Pending"}
          </Button>
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
            onClick={() => handleDeleteLoan(loan.id)}
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
      <header className="border-b border-border p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Loan Tracking</h1>
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
              <div className="text-2xl font-bold text-blue-500">PKR {totalGivenPending.toLocaleString()}</div>
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
              <div className="text-2xl font-bold text-orange-500">PKR {totalTakenPending.toLocaleString()}</div>
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
    </div>
  )
}
