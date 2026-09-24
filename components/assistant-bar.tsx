"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAssistantActions } from "@/hooks/use-assistant-actions"
import { Loader2, Mic, Sparkles, Check, X } from "lucide-react"
import { toast } from "sonner"
import type { AssistantAction } from "@/lib/ai/actions"

/**
 * BCP-47 tag for recognition. "en-PK" or "ur-PK" may transcribe local names and
 * Urdu words better; "en-US" is the safest default.
 */
const SPEECH_LANG = "en-US"

const EXAMPLES = [
  "spent 1200 on groceries from cash",
  "transfer 5000 from meezan to cash",
  "lent 3000 to Ali for petrol",
  "add netflix 1500 monthly on the 8th",
  "set aside 10000 for the laptop",
]

interface AssistantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Opened from the app shell: the sidebar, the mobile quick-add sheet, or Ctrl/Cmd+K. */
export function AssistantDialog({ open, onOpenChange }: AssistantDialogProps) {
  const { describe, execute, buildContext } = useAssistantActions()

  const [text, setText] = useState("")
  const [thinking, setThinking] = useState(false)
  const [running, setRunning] = useState(false)
  const [listening, setListening] = useState(false)
  const [reply, setReply] = useState("")
  const [actions, setActions] = useState<AssistantAction[]>([])
  const [done, setDone] = useState<string[]>([])

  const recognitionRef = useRef<any>(null)

  // Browser speech recognition. Note that Chrome and Edge stream the audio to
  // Google's own servers to transcribe it - the recognition is not local. The
  // transcript lands in the input box and is only acted on when submitted.
  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = SPEECH_LANG

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("")
      setText(transcript)
    }
    recognition.onerror = (event: any) => {
      setListening(false)
      if (event.error !== "aborted") toast.error("Could not hear that. Try typing instead.")
    }
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    return () => {
      recognition.abort?.()
      recognitionRef.current = null
    }
  }, [])

  const speechSupported = !!recognitionRef.current

  const toggleListening = () => {
    const recognition = recognitionRef.current
    if (!recognition) return toast.error("Voice input is not supported in this browser")

    if (listening) {
      recognition.stop()
      setListening(false)
      return
    }

    setText("")
    setReply("")
    setActions([])
    setDone([])
    try {
      recognition.start()
      setListening(true)
    } catch {
      // start() throws if it is already running - ignore and stay in sync.
      setListening(false)
    }
  }

  const reset = () => {
    setText("")
    setReply("")
    setActions([])
    setDone([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const prompt = text.trim()
    if (!prompt) return

    recognitionRef.current?.abort?.()
    setListening(false)
    setThinking(true)
    setReply("")
    setActions([])
    setDone([])

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt, context: buildContext() }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "The assistant could not respond")

      setReply(data.message || "")
      setActions(data.actions || [])
      if (!data.actions?.length && !data.message) {
        setReply("I did not catch an action in that.")
      }
    } catch (error: any) {
      console.error("Assistant failed:", error)
      setReply(error?.message || "Something went wrong")
    } finally {
      setThinking(false)
    }
  }

  /** Nothing is written until this runs - the model only ever proposes. */
  const confirm = async () => {
    setRunning(true)
    const results: string[] = []

    try {
      for (const action of actions) {
        try {
          results.push(await execute(action))
        } catch (error: any) {
          const message = error?.message || "Could not complete that"
          results.push(`Failed: ${message}`)
          toast.error(message)
        }
      }

      setDone(results)
      setActions([])
      setText("")
      if (results.every((result) => !result.startsWith("Failed:"))) {
        toast.success(results.length > 1 ? "All done" : results[0])
      }
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) {
            recognitionRef.current?.abort?.()
            setListening(false)
            reset()
          }
        }}
      >
        <DialogContent
          className="top-4 max-h-[calc(100dvh-2rem)] translate-y-0 gap-3 overflow-y-auto p-4 sm:top-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:gap-4 sm:p-6"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Sparkles className="size-4" />
              </span>
              Just say it
            </DialogTitle>
            <DialogDescription>
              Tell me what happened and I will fill it in. Nothing is saved until you confirm.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={listening ? "Listening..." : "spent 1200 on groceries from cash"}
              className="h-11 text-base"
              autoFocus
            />
            <div className="flex gap-2">
              {speechSupported && (
                <Button
                  type="button"
                  variant={listening ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleListening}
                  title={listening ? "Stop listening" : "Speak"}
                  className="h-11 w-11 shrink-0"
                >
                  {listening ? <Mic className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
                </Button>
              )}
              <Button
                type="submit"
                disabled={thinking || !text.trim()}
                className="h-11 flex-1"
              >
                {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
              </Button>
            </div>
            {listening && <p className="text-xs text-primary">Listening - tap the mic again to stop</p>}
          </form>

          {!reply && !actions.length && !done.length && !thinking && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Try one of these:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setText(example)}
                    className="text-xs px-3 py-2 rounded-full border bg-muted/50 active:bg-muted hover:bg-accent hover:text-foreground text-muted-foreground text-left transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {reply && <p className="text-sm">{reply}</p>}

          {actions.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <div key={index} className="p-3 border bg-muted/50 rounded-xl text-sm">
                    {describe(action)}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="h-11 flex-1" onClick={reset} disabled={running}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button className="h-11 flex-1" onClick={confirm} disabled={running}>
                  {running ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div className="space-y-2">
              {done.map((result, index) => (
                <p
                  key={index}
                  className={`text-sm ${result.startsWith("Failed:") ? "text-destructive" : "text-positive"}`}
                >
                  {result}
                </p>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
