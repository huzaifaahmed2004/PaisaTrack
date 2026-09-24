"use client"

import { useCallback, useEffect, useState } from "react"
import { ACCENT_STORAGE_KEY, DEFAULT_ACCENT, isAccent, type Accent } from "@/lib/theme"

/**
 * The chosen accent palette. It is a per-device preference, like light or dark
 * mode, so it is kept in localStorage rather than on the user's profile.
 */
export function useAccent() {
  const [accent, setAccentState] = useState<Accent>(DEFAULT_ACCENT)

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-accent")
    if (isAccent(current)) setAccentState(current)
  }, [])

  const setAccent = useCallback((next: Accent) => {
    setAccentState(next)
    document.documentElement.setAttribute("data-accent", next)
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, next)
    } catch {
      // Private mode or blocked storage - the choice still applies until reload.
    }
  }, [])

  return { accent, setAccent }
}
