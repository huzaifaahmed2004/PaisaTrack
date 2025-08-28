"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAccounts } from "@/hooks/use-accounts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddAccountModal } from "@/components/add-account-modal"
import { EditAccountModal } from "@/components/edit-account-modal"
import { Loader2, ArrowLeft, Plus, Edit, Trash2, Wallet } from "lucide-react"
import type { Account } from "@/lib/types"

export default function AccountsPage() {
  const { user, loading } = useAuth()
  const { accounts, totalBalance, deleteAccount } = useAccounts()
  const router = useRouter()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  useEffect(() => {
    if (!user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account)
    setEditModalOpen(true)
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (confirm("Are you sure you want to delete this account? This action cannot be undone.")) {
      try {
        await deleteAccount(accountId)
      } catch (error) {
        console.error("Error deleting account:", error)
      }
    }
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "cash":
        return "💵"
      case "bank":
        return "🏦"
      case "nayapay":
        return "📱"
      case "sadapay":
        return "💳"
      default:
        return "💰"
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Accounts</h1>
          </div>
          <Button onClick={() => setAddModalOpen(true)} className="bg-accent hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Total Balance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">PKR {totalBalance.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Accounts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length > 0 ? (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center text-xl">
                        {getAccountIcon(account.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{account.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{account.type} Account</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold">PKR {account.balance.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {account.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAccount(account)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAccount(account.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No accounts yet</h3>
                <p className="text-sm mb-4">Add your first account to start tracking your finances</p>
                <Button onClick={() => setAddModalOpen(true)} className="bg-accent hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modals */}
      <AddAccountModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      <EditAccountModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
      />
    </div>
  )
}
