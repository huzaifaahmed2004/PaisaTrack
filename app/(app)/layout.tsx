import type React from "react"
import { AppShell } from "@/components/app-shell"

/** Every signed-in screen shares the shell: auth gate, navigation, quick add. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
