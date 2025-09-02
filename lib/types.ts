export interface Account {
  id: string
  name: string
  type: "cash" | "bank" | "nayapay" | "sadapay" | "other"
  balance: number
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  accountId: string
  type: "income" | "spend" | "loan-given" | "loan-taken"
  amount: number
  description: string
  date: Date
  createdAt: Date
}

export interface Loan {
  id: string
  type: "given" | "taken"
  personName: string
  amount: number
  description: string
  status: "pending" | "settled"
  date: Date
  createdAt: Date
  settledAt?: Date
  accountId?: string
}

export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
}
