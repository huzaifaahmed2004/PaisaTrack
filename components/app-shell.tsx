"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarClock,
  HandCoins,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  PieChart,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAccounts } from "@/hooks/use-accounts"
import { useSubscriptions } from "@/hooks/use-subscriptions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AddTransactionModal } from "@/components/add-transaction-modal"
import { AddLoanModal } from "@/components/add-loan-modal"
import { TransferModal } from "@/components/transfer-modal"
import { AssistantDialog } from "@/components/assistant-bar"
import { ConfirmProvider } from "@/components/confirm-dialog"
import { BrandMark, type Tone } from "@/components/app-ui"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; icon: LucideIcon }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutGrid },
      { href: "/transactions", label: "Activity", icon: ReceiptText },
      { href: "/accounts", label: "Accounts", icon: Wallet },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/budgets", label: "Budgets", icon: PieChart },
      { href: "/goals", label: "Savings", icon: PiggyBank },
      { href: "/subscriptions", label: "Bills", icon: CalendarClock },
      { href: "/loans", label: "Loans", icon: HandCoins },
    ],
  },
]

const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings }

/** What the bottom tab bar shows on phones; everything else lives under More. */
const TAB_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/transactions", label: "Activity", icon: ReceiptText },
  { href: "/budgets", label: "Budgets", icon: PieChart },
]

export type QuickAction = "income" | "spend" | "transfer" | "loan" | "assistant"

const QUICK_ACTIONS: { action: Exclude<QuickAction, "assistant">; label: string; icon: LucideIcon; tone: Tone }[] = [
  { action: "spend", label: "Expense", icon: ArrowUpRight, tone: "negative" },
  { action: "income", label: "Income", icon: ArrowDownLeft, tone: "positive" },
  { action: "transfer", label: "Transfer", icon: ArrowLeftRight, tone: "info" },
  { action: "loan", label: "Loan", icon: HandCoins, tone: "warning" },
]

type QuickActionsContextValue = {
  open: (action: QuickAction) => void
  /** Whether the action can run yet - income and spending need an account. */
  canRun: (action: QuickAction) => boolean
}

const QuickActionsContext = createContext<QuickActionsContextValue | null>(null)

export function useQuickActions() {
  const context = useContext(QuickActionsContext)
  if (!context) throw new Error("useQuickActions must be used inside <AppShell>")
  return context
}

export { QUICK_ACTIONS }

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

const initials = (name?: string) =>
  (name || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Loader2 className="size-7 animate-spin text-primary" />
    </div>
  )
}

/**
 * The frame around every signed-in screen: it gates on auth, gives desktop a
 * sidebar and phones a tab bar, and owns the quick-add modals so any page can
 * open them.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const { accounts } = useAccounts()
  const { dueSubscriptions } = useSubscriptions()
  const router = useRouter()
  const pathname = usePathname()

  const [modal, setModal] = useState<QuickAction | null>(null)
  const [quickSheetOpen, setQuickSheetOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (!user && !loading) router.replace("/")
  }, [user, loading, router])

  // Ctrl/Cmd+K opens the assistant from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setModal("assistant")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Sheets should not linger over the next screen.
  useEffect(() => {
    setMoreOpen(false)
    setQuickSheetOpen(false)
  }, [pathname])

  if (loading || !user) return <FullScreenLoader />

  const canRun = (action: QuickAction) => {
    if (action === "income" || action === "spend") return accounts.length > 0
    if (action === "transfer") return accounts.length > 1
    return true
  }

  const open = (action: QuickAction) => {
    setQuickSheetOpen(false)
    setModal(action)
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.replace("/")
    } catch (error) {
      console.error("Failed to logout:", error)
    }
  }

  const badgeFor = (href: string) => (href === "/subscriptions" ? dueSubscriptions.length : 0)

  const closeModal = (next: boolean) => !next && setModal(null)

  return (
    <QuickActionsContext.Provider value={{ open, canRun }}>
      <ConfirmProvider>
        <div className="min-h-dvh md:pl-64">
          {/* Desktop sidebar */}
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar md:flex">
            <Link href="/dashboard" className="flex items-center gap-2.5 px-5 pt-5 pb-4">
              <BrandMark />
              <span className="text-lg font-semibold tracking-tight">PaisaTrack</span>
            </Link>

            <div className="px-3">
              <button
                type="button"
                onClick={() => setModal("assistant")}
                className="group flex w-full items-center gap-2.5 rounded-xl border bg-background/60 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Sparkles className="size-4 text-primary" />
                <span className="flex-1 text-left">Ask PaisaTrack</span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
              </button>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        active={isActive(pathname, item.href)}
                        badge={badgeFor(item.href)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="space-y-1 border-t p-3">
              <SidebarLink item={SETTINGS_ITEM} active={isActive(pathname, SETTINGS_ITEM.href)} />
              <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                <Avatar className="size-8">
                  <AvatarImage src={user.photoURL} alt="" />
                  <AvatarFallback className="text-xs">{initials(user.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <LogOut className="size-4" />
                  <span className="sr-only">Sign out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Phone top bar */}
          <header
            className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 pb-3 backdrop-blur-md md:hidden"
            style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <BrandMark className="size-8 rounded-lg" />
              <span className="font-semibold tracking-tight">PaisaTrack</span>
            </Link>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setModal("assistant")}
                className="flex size-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-accent"
              >
                <Sparkles className="size-[18px]" />
                <span className="sr-only">Ask PaisaTrack</span>
              </button>
              <Link href="/settings" className="rounded-full p-0.5">
                <Avatar className="size-8">
                  <AvatarImage src={user.photoURL} alt="" />
                  <AvatarFallback className="text-xs">{initials(user.displayName)}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Settings</span>
              </Link>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-32 md:px-8 md:pt-8 md:pb-12">{children}</main>

          {/* Phone tab bar */}
          <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur-md md:hidden">
            <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
              {TAB_ITEMS.slice(0, 2).map((item) => (
                <TabLink key={item.href} item={item} active={isActive(pathname, item.href)} />
              ))}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setQuickSheetOpen(true)}
                  className="-mt-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
                >
                  <Plus className="size-6" />
                  <span className="sr-only">Add</span>
                </button>
              </div>
              <TabLink item={TAB_ITEMS[2]} active={isActive(pathname, TAB_ITEMS[2].href)} />
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-1 text-[11px] font-medium text-muted-foreground",
                  moreOpen && "text-foreground",
                )}
              >
                <Menu className="size-5" />
                More
                {dueSubscriptions.length > 0 && (
                  <span className="absolute top-0.5 right-1/2 size-2 translate-x-3 rounded-full bg-warning" />
                )}
              </button>
            </div>
          </nav>
        </div>

        {/* Phone quick-add */}
        <Sheet open={quickSheetOpen} onOpenChange={setQuickSheetOpen}>
          <SheetContent side="bottom" className="pb-safe rounded-t-3xl border-t bg-card">
            <SheetHeader className="px-5 pt-5 pb-2 text-left">
              <SheetTitle>Add something</SheetTitle>
              <SheetDescription>Record it yourself, or just say what happened.</SheetDescription>
            </SheetHeader>
            <div className="space-y-3 px-5 pb-6">
              <button
                type="button"
                onClick={() => open("assistant")}
                className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-hero-from to-hero-to p-4 text-left text-white"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/15">
                  <Sparkles className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">Just say it</span>
                  <span className="block text-xs text-white/75">"spent 1200 on groceries from cash"</span>
                </span>
              </button>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_ACTIONS.map((item) => (
                  <QuickActionTile
                    key={item.action}
                    {...item}
                    disabled={!canRun(item.action)}
                    onClick={() => open(item.action)}
                  />
                ))}
              </div>
              {accounts.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Add an account first to record income and expenses.
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Phone "More" menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="pb-safe rounded-t-3xl border-t bg-card">
            <SheetHeader className="px-5 pt-5 pb-1 text-left">
              <SheetTitle>More</SheetTitle>
              <SheetDescription className="truncate">{user.email}</SheetDescription>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2 px-5 pb-3">
              {[...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM]
                .filter((item) => !TAB_ITEMS.some((tab) => tab.href === item.href))
                .map((item) => {
                  const badge = badgeFor(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-colors hover:bg-accent",
                        isActive(pathname, item.href) && "border-primary/40 bg-primary/8 text-primary",
                      )}
                    >
                      <item.icon className="size-5" />
                      {item.label}
                      {badge > 0 && (
                        <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-warning text-[10px] font-semibold text-background">
                          {badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
            </div>
            <div className="px-5 pb-6">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <AddTransactionModal open={modal === "income"} onOpenChange={closeModal} type="income" />
        <AddTransactionModal open={modal === "spend"} onOpenChange={closeModal} type="spend" />
        <TransferModal open={modal === "transfer"} onOpenChange={closeModal} />
        <AddLoanModal open={modal === "loan"} onOpenChange={closeModal} />
        <AssistantDialog open={modal === "assistant"} onOpenChange={closeModal} />
      </ConfirmProvider>
    </QuickActionsContext.Provider>
  )
}

export function QuickActionTile({
  label,
  icon: Icon,
  tone,
  disabled,
  onClick,
}: {
  label: string
  icon: LucideIcon
  tone: Tone
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center gap-2 rounded-2xl border bg-card px-2 py-3.5 text-xs font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-xl transition-transform group-active:scale-95",
          tone === "negative" && "bg-negative/12 text-negative",
          tone === "positive" && "bg-positive/12 text-positive",
          tone === "info" && "bg-info/12 text-info",
          tone === "warning" && "bg-warning/15 text-warning",
        )}
      >
        <Icon className="size-5" />
      </span>
      {label}
    </button>
  )
}

function SidebarLink({ item, active, badge = 0 }: { item: NavItem; active: boolean; badge?: number }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <item.icon className="size-[18px]" />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-semibold text-background">
          {badge}
        </span>
      )}
    </Link>
  )
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <item.icon className="size-5" />
      {item.label}
    </Link>
  )
}
