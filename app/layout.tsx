import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { AssistantBar } from "@/components/assistant-bar"

export const metadata: Metadata = {
  title: "PaisaTrack - Personal Finance Tracker",
  description: "Track your finances with ease - Pakistani personal finance app",
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  // Lets iOS open the home-screen shortcut without Safari's chrome.
  appleWebApp: {
    capable: true,
    title: "PaisaTrack",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: "#1c1917",
  width: "device-width",
  initialScale: 1,
  // Keeps content clear of the notch and home indicator in standalone mode.
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} bg-background text-foreground`}>
        {children}
        <AssistantBar />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
