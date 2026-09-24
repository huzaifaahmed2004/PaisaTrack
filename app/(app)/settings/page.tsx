"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Check, LogOut, Monitor, Moon, Sun, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAccent } from "@/hooks/use-accent"
import { useAccounts } from "@/hooks/use-accounts"
import { useTransactions } from "@/hooks/use-transactions"
import { useLoans } from "@/hooks/use-loans"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { useGoals } from "@/hooks/use-goals"
import { useBudgets } from "@/hooks/use-budgets"
import { useSpendable } from "@/hooks/use-spendable"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PayWindowCard } from "@/components/pay-window-card"
import { ClearDataModal } from "@/components/clear-data-modal"
import { PageHeader, Panel } from "@/components/app-ui"
import { ACCENTS } from "@/lib/theme"
import { cn } from "@/lib/utils"

const MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

/** A miniature of the app in the given mode, so the choice is visible before it is made. */
function ModePreview({ mode }: { mode: "light" | "dark" | "system" }) {
  const pane = (dark: boolean) => (
    <div className={cn("flex h-full flex-1 gap-1 p-1.5", dark ? "bg-[#1b1c22]" : "bg-[#f6f7f9]")}>
      <div className={cn("w-3 rounded-sm", dark ? "bg-[#26272e]" : "bg-white")} />
      <div className="flex flex-1 flex-col gap-1">
        <div className="h-4 rounded-sm bg-gradient-to-br from-hero-from to-hero-to" />
        <div className={cn("flex-1 rounded-sm", dark ? "bg-[#26272e]" : "bg-white")} />
      </div>
    </div>
  )

  return (
    <div className="flex h-16 overflow-hidden rounded-lg border">
      {mode === "system" ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(mode === "dark")
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { accent, setAccent } = useAccent()
  const { accounts } = useAccounts()
  const { transactions } = useTransactions()
  const { loans } = useLoans()
  const { subscriptions } = useSubscriptions()
  const { goals } = useGoals()
  const { budgets } = useBudgets()
  const { reservedForBills, holdUntil } = useSpendable()
  const router = useRouter()

  const [clearDataOpen, setClearDataOpen] = useState(false)
  // next-themes only knows the theme on the client; avoid a mismatched first render.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const handleLogout = async () => {
    try {
      await logout()
      router.replace("/")
    } catch (error) {
      console.error("Failed to logout:", error)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" description="Make PaisaTrack look and work the way you like" />

      <Panel title="Appearance" description="Saved on this device">
        <div className="space-y-6">
          <div className="space-y-2.5">
            <p className="text-sm font-medium">Mode</p>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {MODES.map((mode) => {
                const selected = mounted && theme === mode.value
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setTheme(mode.value)}
                    className={cn(
                      "rounded-xl border p-2 text-left transition-colors hover:bg-accent/60",
                      selected && "border-primary ring-2 ring-primary/25",
                    )}
                  >
                    <ModePreview mode={mode.value} />
                    <span className="mt-2 flex items-center gap-1.5 px-0.5 text-sm font-medium">
                      <mode.icon className="size-3.5 text-muted-foreground" />
                      {mode.label}
                      {selected && <Check className="ml-auto size-4 text-primary" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium">Accent colour</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {ACCENTS.map((option) => {
                const selected = mounted && accent === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccent(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-colors hover:bg-accent/60",
                      selected && "border-primary ring-2 ring-primary/25",
                    )}
                  >
                    <span
                      className="flex size-8 items-center justify-center rounded-full shadow-inner"
                      style={{ background: option.swatch }}
                    >
                      {selected && <Check className="size-4 text-white" />}
                    </span>
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">Preview</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="outline">
                Outline
              </Button>
              <span className="rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">Badge</span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
              <span className="text-sm font-semibold text-positive">+1,200</span>
              <span className="text-sm font-semibold text-negative">-850</span>
            </div>
          </div>
        </div>
      </Panel>

      <PayWindowCard reservedForBills={reservedForBills} holdUntil={holdUntil} />

      <Panel title="Profile">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="size-12">
            <AvatarImage src={user?.photoURL} alt="" />
            <AvatarFallback>{user?.displayName?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{user?.displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut />
            Sign out
          </Button>
        </div>
      </Panel>

      <Panel title="Danger zone" className="border-destructive/30">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="font-medium">Clear all data</p>
            <p className="text-sm text-muted-foreground">
              Delete every account, transaction, loan, bill, plan and budget, and start over from scratch.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setClearDataOpen(true)} className="shrink-0">
            <Trash2 />
            Clear data
          </Button>
        </div>
      </Panel>

      <ClearDataModal
        open={clearDataOpen}
        onOpenChange={setClearDataOpen}
        accountCount={accounts.length}
        transactionCount={transactions.length}
        loanCount={loans.length}
        subscriptionCount={subscriptions.length}
        goalCount={goals.length}
        budgetCount={budgets.length}
      />
    </div>
  )
}
