"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Plus, Trash2, Wallet } from "lucide-react"
import { useAccounts } from "@/hooks/use-accounts"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddAccountModal } from "@/components/add-account-modal"
import { EditAccountModal } from "@/components/edit-account-modal"
import { useConfirm } from "@/components/confirm-dialog"
import { Amount, EmptyState, PageHeader } from "@/components/app-ui"
import { formatPKR } from "@/lib/money"
import { accountTypeIcon, accountTypeLabel } from "@/lib/account-types"
import { toast } from "sonner"
import type { Account } from "@/lib/types"

export default function AccountsPage() {
  const { accounts, totalBalance, deleteAccount, countAccountTransactions } = useAccounts()
  const confirm = useConfirm()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account)
    setEditModalOpen(true)
  }

  const handleDeleteAccount = async (account: Account) => {
    try {
      // Entries belonging to this account go with it, so say how many.
      const entryCount = await countAccountTransactions(account.id)
      const ok = await confirm({
        title: `Delete "${account.name}"?`,
        description:
          entryCount > 0
            ? `Its ${entryCount} transaction${entryCount !== 1 ? "s" : ""} will be deleted too, and PKR ${formatPKR(account.balance)} will drop out of your totals. This cannot be undone.`
            : "This cannot be undone.",
        confirmLabel: "Delete account",
        destructive: true,
      })
      if (!ok) return

      await deleteAccount(account.id)
      toast.success("Account deleted")
    } catch (error: any) {
      console.error("Error deleting account:", error)
      toast.error(error?.message || "Failed to delete account")
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounts"
        description="Cash, banks and wallets you keep money in"
        actions={
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus />
            Add account
          </Button>
        }
      />

      <section className="rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-5 text-white shadow-lg md:p-6">
        <p className="text-sm text-white/75">Total balance</p>
        <Amount value={totalBalance} className="mt-1 block text-3xl font-semibold tracking-tight md:text-4xl" />
        <p className="mt-1 text-sm text-white/70">
          Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
        </p>
        {accounts.length > 1 && totalBalance > 0 && (
          <div className="mt-5 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-white/10">
            {accounts
              .filter((account) => account.balance > 0)
              .map((account, index) => (
                <div
                  key={account.id}
                  title={account.name}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(account.balance / totalBalance) * 100}%`,
                    background: `rgb(255 255 255 / ${Math.max(0.95 - index * 0.18, 0.25)})`,
                  }}
                />
              ))}
          </div>
        )}
      </section>

      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const share = totalBalance > 0 ? Math.max((account.balance / totalBalance) * 100, 0) : 0
            return (
              <div key={account.id} className="rounded-2xl border bg-card p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                    {accountTypeIcon(account.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">{accountTypeLabel(account.type)}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-1 text-muted-foreground">
                        <MoreHorizontal />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleEditAccount(account)}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => handleDeleteAccount(account)}>
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Amount
                  value={account.balance}
                  className={`mt-4 block text-2xl font-semibold tracking-tight ${account.balance < 0 ? "text-negative" : ""}`}
                />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Math.round(share)}% of total</span>
                  <span>Updated {account.updatedAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            )
          })}
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          >
            <Plus className="size-5" />
            Add account
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card">
          <EmptyState
            icon={Wallet}
            title="No accounts yet"
            description="Add your first account to start tracking your finances."
            action={
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus />
                Add your first account
              </Button>
            }
          />
        </div>
      )}

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
