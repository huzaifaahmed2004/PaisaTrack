import { NextResponse } from "next/server"
import { ACTION_NAMES, FUNCTION_DECLARATIONS, type AssistantAction } from "@/lib/ai/actions"

export const runtime = "nodejs"

/**
 * Set GEMINI_MODEL to whatever model id your key has access to.
 * The key itself must never be NEXT_PUBLIC_ - it stays on the server.
 */
const MODEL = (process.env.GEMINI_MODEL || "gemini-flash-latest").trim()
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models"

/**
 * A stray newline or quote in .env produces a 401 that reads like a bad key,
 * so the value is trimmed before it is ever sent.
 */
function readApiKey(): string {
  return (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "")
}

/** AI Studio keys go in this header, whatever prefix they carry. */
function authHeaders(apiKey: string): Record<string, string> {
  return { "x-goog-api-key": apiKey }
}

const SYSTEM_PROMPT = `You are the assistant inside PaisaTrack, a personal finance app for a user in Pakistan. All money is in PKR.

Your job is to turn what the user says into calls to the functions you have been given. The user speaks casually and often in a mix of English and Urdu ("kharch kiya" = spent, "mila" = received, "udhaar" = loan). Interpret loosely but never invent numbers.

Rules:
- Always pick ids from the CONTEXT below. Match accounts, loans, subscriptions and goals by name, case-insensitively and forgivingly ("meezan" matches "Meezan Bank"). Never invent an id.
- If you cannot tell which account, loan, subscription or goal is meant, or the amount is missing, call no function and ask one short question instead.
- Moving money between the user's own accounts is a transfer, not income plus spending.
- Money lent to or borrowed from a person is a loan, not a plain expense.
- If the user says a loan or debt is from before they started tracking, or that they already spent the borrowed money, set carriedOver to true.
- Setting money aside for a plan is a goal, and it moves no money. Only goal_spend moves money.
- The user may ask for several things at once. Emit one function call per action.
- You cannot delete or clear data, and you cannot edit existing records. If asked, say that must be done in the app itself.
- Today is ${"${TODAY}"}.

Reply with function calls when you can act. Any text you write is shown to the user, so keep it to one short sentence.`

type ContextPayload = {
  accounts?: { id: string; name: string; type: string; balance: number }[]
  loans?: { id: string; personName: string; amount: number; type: string; status: string }[]
  subscriptions?: { id: string; name: string; amount: number; dayOfMonth: number }[]
  goals?: { id: string; name: string; targetAmount: number; savedAmount: number }[]
}

function buildContext(context: ContextPayload): string {
  const lines: string[] = []

  const accounts = context.accounts ?? []
  lines.push(
    accounts.length
      ? `ACCOUNTS:\n${accounts.map((a) => `- id=${a.id} | ${a.name} | ${a.type} | balance ${a.balance}`).join("\n")}`
      : "ACCOUNTS: none yet. The user must add an account before money can move.",
  )

  const pendingLoans = (context.loans ?? []).filter((loan) => loan.status === "pending")
  if (pendingLoans.length) {
    lines.push(
      `PENDING LOANS:\n${pendingLoans
        .map((l) => `- id=${l.id} | ${l.personName} | ${l.type} | ${l.amount}`)
        .join("\n")}`,
    )
  }

  const subscriptions = context.subscriptions ?? []
  if (subscriptions.length) {
    lines.push(
      `SUBSCRIPTIONS:\n${subscriptions
        .map((s) => `- id=${s.id} | ${s.name} | ${s.amount} | due day ${s.dayOfMonth}`)
        .join("\n")}`,
    )
  }

  const goals = context.goals ?? []
  if (goals.length) {
    lines.push(
      `SAVINGS PLANS:\n${goals
        .map((g) => `- id=${g.id} | ${g.name} | saved ${g.savedAmount} of ${g.targetAmount}`)
        .join("\n")}`,
    )
  }

  return lines.join("\n\n")
}

/**
 * Diagnostic: lists the models this key can actually call, so GEMINI_MODEL can
 * be set to a real id instead of a guess. Returns names only, never the key.
 */
export async function GET() {
  const apiKey = readApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set. Add it to .env and restart the dev server." }, { status: 500 })
  }

  try {
    const response = await fetch(`${ENDPOINT}?pageSize=200`, {
      headers: authHeaders(apiKey),
    })
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `Gemini returned ${response.status}`, configuredModel: MODEL },
        { status: 502 },
      )
    }

    const usable = (data.models ?? [])
      .filter((model: any) => (model.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((model: any) => model.name?.replace(/^models\//, ""))
      .filter(Boolean)

    return NextResponse.json({
      configuredModel: MODEL,
      configuredModelIsAvailable: usable.includes(MODEL),
      usableModels: usable,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not reach Gemini" }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const apiKey = readApiKey()
  if (!apiKey) {
    return NextResponse.json(
      { error: "The assistant is not configured. Add GEMINI_API_KEY to your .env file and restart." },
      { status: 500 },
    )
  }

  let body: { text?: string; context?: ContextPayload }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const text = body.text?.trim()
  if (!text) return NextResponse.json({ error: "Say or type something first" }, { status: 400 })
  if (text.length > 2000) return NextResponse.json({ error: "That is too long to process" }, { status: 400 })

  const today = new Date().toISOString().split("T")[0]
  const system = SYSTEM_PROMPT.replace("${TODAY}", today) + "\n\nCONTEXT:\n" + buildContext(body.context ?? {})

  try {
    const response = await fetch(`${ENDPOINT}/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(apiKey) },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text }] }],
        tools: [{ function_declarations: FUNCTION_DECLARATIONS }],
        generationConfig: { temperature: 0 },
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error("Gemini request failed:", response.status, detail)

      // Surface what Google actually said - guessing at the cause wastes time.
      let upstream = detail
      try {
        upstream = JSON.parse(detail)?.error?.message || detail
      } catch {
        // Not JSON: fall back to the raw body.
      }

      const hint =
        response.status === 401
          ? ` The key was not accepted. Check GEMINI_API_KEY in .env is on one line with no quotes or trailing spaces, and restart the dev server so it is picked up.`
          : response.status === 404
          ? ` Open /api/assistant in your browser to see which model ids this key can use, then set GEMINI_MODEL to one of them.`
          : response.status === 403
            ? ` Check the key is valid and the Generative Language API is enabled for its project.`
            : ""

      return NextResponse.json(
        { error: `Gemini said (${response.status}): ${upstream}.${hint}` },
        { status: 502 },
      )
    }

    const data = await response.json()
    const parts = data?.candidates?.[0]?.content?.parts ?? []

    const actions: AssistantAction[] = []
    const messages: string[] = []

    for (const part of parts) {
      if (part.functionCall && ACTION_NAMES.includes(part.functionCall.name)) {
        actions.push({ name: part.functionCall.name, args: part.functionCall.args ?? {} } as AssistantAction)
      } else if (part.text?.trim()) {
        messages.push(part.text.trim())
      }
    }

    return NextResponse.json({
      message: messages.join(" ") || (actions.length ? "" : "I did not catch an action in that."),
      actions,
    })
  } catch (error: any) {
    console.error("Assistant request failed:", error)
    return NextResponse.json({ error: `Could not reach the assistant: ${error?.message ?? error}` }, { status: 502 })
  }
}
