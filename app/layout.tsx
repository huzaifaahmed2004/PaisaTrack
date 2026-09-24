import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { accentScript } from "@/lib/theme"

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#16171d" },
  ],
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
    // next-themes and the accent script both write to <html> before hydration.
    <html lang="en" data-accent="indigo" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentScript }} />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
