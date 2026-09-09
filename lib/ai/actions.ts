/**
 * The actions the assistant is allowed to perform, described once here and
 * used in two places: as Gemini function declarations on the server, and as
 * the shape the client executes against the app's own hooks.
 *
 * Clearing profile data is deliberately absent - a wipe is never something a
 * misheard sentence should be able to trigger.
 */

export type AssistantAction =
  | { name: "add_transaction"; args: AddTransactionArgs }
  | { name: "transfer"; args: TransferArgs }
  | { name: "add_account"; args: AddAccountArgs }
  | { name: "add_loan"; args: AddLoanArgs }
  | { name: "settle_loan"; args: SettleLoanArgs }
  | { name: "add_subscription"; args: AddSubscriptionArgs }
  | { name: "pay_subscription"; args: PaySubscriptionArgs }
  | { name: "add_goal"; args: AddGoalArgs }
  | { name: "goal_set_aside"; args: GoalFundsArgs }
  | { name: "goal_release"; args: GoalFundsArgs }
  | { name: "goal_spend"; args: GoalSpendArgs }

export type AddTransactionArgs = {
  type: "income" | "spend"
  amount: number
  accountId: string
  description: string
  date?: string
}

export type TransferArgs = {
  fromAccountId: string
  toAccountId: string
  amount: number
  description?: string
  date?: string
}

export type AddAccountArgs = {
  name: string
  type: "cash" | "bank" | "wallet" | "other"
  balance: number
}

export type AddLoanArgs = {
  type: "given" | "taken"
  personName: string
  amount: number
  description?: string
  accountId?: string
  carriedOver?: boolean
  date?: string
}

export type SettleLoanArgs = { loanId: string; accountId: string }

export type AddSubscriptionArgs = {
  name: string
  amount: number
  dayOfMonth: number
  accountId?: string
  description?: string
}

export type PaySubscriptionArgs = { subscriptionId: string; accountId: string; date?: string }

export type AddGoalArgs = {
  name: string
  targetAmount: number
  accountId?: string
  targetDate?: string
  description?: string
}

export type GoalFundsArgs = { goalId: string; amount: number }
export type GoalSpendArgs = { goalId: string; accountId: string; amount: number; date?: string }

/** What the API route hands back to the client. */
export type AssistantReply = {
  /** Something to say to the user - a question, a refusal, or a confirmation. */
  message: string
  /** Actions awaiting the user's confirmation. May be empty. */
  actions: AssistantAction[]
}

const DATE_HINT = "Date in YYYY-MM-DD. Omit for today."

/**
 * Gemini function declarations. Types use the OpenAPI subset Gemini accepts:
 * STRING, NUMBER, INTEGER, BOOLEAN, ARRAY, OBJECT.
 */
export const FUNCTION_DECLARATIONS = [
  {
    name: "add_transaction",
    description:
      "Record money received (income) or money spent (spend) on one account. Use for ordinary earning and spending, not for transfers between the user's own accounts.",
    parameters: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", enum: ["income", "spend"], description: "income if money came in, spend if it went out" },
        amount: { type: "NUMBER", description: "Amount in PKR, always positive" },
        accountId: { type: "STRING", description: "id of the account from the context list" },
        description: { type: "STRING", description: "Short description of what it was for" },
        date: { type: "STRING", description: DATE_HINT },
      },
      required: ["type", "amount", "accountId", "description"],
    },
  },
  {
    name: "transfer",
    description: "Move money between two of the user's own accounts. Balances change but nothing is earned or spent.",
    parameters: {
      type: "OBJECT",
      properties: {
        fromAccountId: { type: "STRING", description: "id of the account money leaves" },
        toAccountId: { type: "STRING", description: "id of the account money arrives in" },
        amount: { type: "NUMBER", description: "Amount in PKR" },
        description: { type: "STRING", description: "Reason for the transfer" },
        date: { type: "STRING", description: DATE_HINT },
      },
      required: ["fromAccountId", "toAccountId", "amount"],
    },
  },
  {
    name: "add_account",
    description: "Create a new account or wallet with a starting balance.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Account name, e.g. Meezan Bank" },
        type: { type: "STRING", enum: ["cash", "bank", "wallet", "other"], description: "wallet covers NayaPay, SadaPay, JazzCash and similar" },
        balance: { type: "NUMBER", description: "Current balance in PKR" },
      },
      required: ["name", "type", "balance"],
    },
  },
  {
    name: "add_loan",
    description:
      "Record a loan. type 'given' means the user lent money out; 'taken' means the user borrowed. Set carriedOver true when the money changed hands before the user started tracking - then no account balance changes and accountId is not needed.",
    parameters: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", enum: ["given", "taken"] },
        personName: { type: "STRING", description: "Who the loan is with" },
        amount: { type: "NUMBER", description: "Amount in PKR" },
        description: { type: "STRING", description: "What the loan was for" },
        accountId: { type: "STRING", description: "Account the money moves through. Required unless carriedOver is true." },
        carriedOver: { type: "BOOLEAN", description: "true if this loan already existed before tracking began" },
        date: { type: "STRING", description: DATE_HINT },
      },
      required: ["type", "personName", "amount"],
    },
  },
  {
    name: "settle_loan",
    description: "Mark an existing pending loan as settled. Money moves: in for a loan given, out for a loan taken.",
    parameters: {
      type: "OBJECT",
      properties: {
        loanId: { type: "STRING", description: "id of the pending loan from the context list" },
        accountId: { type: "STRING", description: "Account that receives or pays the money" },
      },
      required: ["loanId", "accountId"],
    },
  },
  {
    name: "add_subscription",
    description: "Add a bill that recurs on the same day every month. Adding it moves no money.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "e.g. Netflix, internet bill" },
        amount: { type: "NUMBER", description: "Monthly amount in PKR" },
        dayOfMonth: { type: "INTEGER", description: "Day of the month it is due, 1 to 31" },
        accountId: { type: "STRING", description: "Account it is usually paid from" },
        description: { type: "STRING" },
      },
      required: ["name", "amount", "dayOfMonth"],
    },
  },
  {
    name: "pay_subscription",
    description: "Record that a subscription's charge has gone out. This deducts the money and rolls the bill to next month.",
    parameters: {
      type: "OBJECT",
      properties: {
        subscriptionId: { type: "STRING", description: "id from the context list" },
        accountId: { type: "STRING", description: "Account it was paid from" },
        date: { type: "STRING", description: DATE_HINT },
      },
      required: ["subscriptionId", "accountId"],
    },
  },
  {
    name: "add_goal",
    description: "Create a savings plan for something the user is planning to buy or do. Creating it sets no money aside.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "What they are saving for" },
        targetAmount: { type: "NUMBER", description: "What it will cost, in PKR" },
        accountId: { type: "STRING", description: "Where the money is kept, optional" },
        targetDate: { type: "STRING", description: "Target date in YYYY-MM-DD, optional" },
        description: { type: "STRING" },
      },
      required: ["name", "targetAmount"],
    },
  },
  {
    name: "goal_set_aside",
    description: "Reserve money for a savings plan. No cash moves - it just stops counting as free to spend.",
    parameters: {
      type: "OBJECT",
      properties: {
        goalId: { type: "STRING", description: "id from the context list" },
        amount: { type: "NUMBER", description: "Amount in PKR to set aside" },
      },
      required: ["goalId", "amount"],
    },
  },
  {
    name: "goal_release",
    description: "Release money a savings plan is holding back into spendable balance. No cash moves.",
    parameters: {
      type: "OBJECT",
      properties: {
        goalId: { type: "STRING", description: "id from the context list" },
        amount: { type: "NUMBER", description: "Amount in PKR to release" },
      },
      required: ["goalId", "amount"],
    },
  },
  {
    name: "goal_spend",
    description: "The plan actually happened: spend money the goal was holding. This deducts from the account and records an expense.",
    parameters: {
      type: "OBJECT",
      properties: {
        goalId: { type: "STRING", description: "id from the context list" },
        accountId: { type: "STRING", description: "Account paid from" },
        amount: { type: "NUMBER", description: "Amount in PKR" },
        date: { type: "STRING", description: DATE_HINT },
      },
      required: ["goalId", "accountId", "amount"],
    },
  },
] as const

export const ACTION_NAMES = FUNCTION_DECLARATIONS.map((declaration) => declaration.name)
