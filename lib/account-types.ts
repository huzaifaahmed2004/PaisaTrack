import type { AccountType } from "@/lib/types"

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "bank", label: "Bank Account", icon: "🏦" },
  { value: "wallet", label: "Digital Wallet", icon: "📱" },
  { value: "other", label: "Other", icon: "💰" },
]

/**
 * NayaPay and SadaPay used to be their own types. They are both digital
 * wallets, so old records are folded into the single wallet type.
 */
const LEGACY_TYPES: Record<string, AccountType> = {
  nayapay: "wallet",
  sadapay: "wallet",
}

export function isLegacyAccountType(type: unknown): boolean {
  return typeof type === "string" && type in LEGACY_TYPES
}

export function normalizeAccountType(type: unknown): AccountType {
  if (typeof type !== "string") return "other"
  if (type in LEGACY_TYPES) return LEGACY_TYPES[type]
  return ACCOUNT_TYPES.some((option) => option.value === type) ? (type as AccountType) : "other"
}

export function accountTypeIcon(type: unknown): string {
  const normalized = normalizeAccountType(type)
  return ACCOUNT_TYPES.find((option) => option.value === normalized)?.icon ?? "💰"
}

export function accountTypeLabel(type: unknown): string {
  const normalized = normalizeAccountType(type)
  return ACCOUNT_TYPES.find((option) => option.value === normalized)?.label ?? "Other"
}
