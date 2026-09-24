"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, HandCoins, Loader2, PieChart, PiggyBank, Sparkles, Wallet } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/app-ui"
import { FullScreenLoader } from "@/components/app-shell"

const FEATURES = [
  { icon: Wallet, title: "Every account in one place", text: "Cash, bank accounts and digital wallets side by side." },
  { icon: PieChart, title: "Budgets that keep pace", text: "See how much of each budget is left this cycle." },
  { icon: CalendarClock, title: "Bills held until payday", text: "Know what is truly free to spend before salary lands." },
  { icon: PiggyBank, title: "Savings plans", text: "Put money aside for a laptop, a trip or an emergency fund." },
  { icon: HandCoins, title: "Loans with friends", text: "Track who owes whom, and settle up cleanly." },
  { icon: Sparkles, title: "Just say it", text: '"spent 1200 on groceries from cash" - done.' },
]

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (user && !loading) {
      router.replace("/dashboard")
    }
  }, [user, loading, router])

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error("Failed to sign in:", error)
    } finally {
      setSigningIn(false)
    }
  }

  if (loading || user) return <FullScreenLoader />

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-hero-from to-hero-to p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-lg font-bold">₨</div>
          <span className="text-xl font-semibold tracking-tight">PaisaTrack</span>
        </div>
        <div className="relative mt-auto max-w-lg">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Know exactly how much you can spend - every day.
          </h2>
          <p className="mt-4 text-white/75">
            A calm home for your rupees. Built for the way money actually moves in Pakistan.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/12">
                  <feature.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="mt-0.5 text-xs text-white/65">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sign-in */}
      <section className="flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <BrandMark className="size-14 rounded-2xl text-xl lg:hidden" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight lg:mt-0">Welcome to PaisaTrack</h1>
          <p className="mt-2 text-muted-foreground">Your personal finance tracker. Sign in to get started.</p>

          <Button onClick={handleGoogleSignIn} disabled={signingIn} className="mt-8 h-12 w-full rounded-xl text-base" size="lg">
            {signingIn ? (
              <Loader2 className="animate-spin" />
            ) : (
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <ul className="mt-10 space-y-3 lg:hidden">
            {FEATURES.slice(0, 4).map((feature) => (
              <li key={feature.title} className="flex items-center gap-3 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <feature.icon className="size-4" />
                </span>
                {feature.title}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
