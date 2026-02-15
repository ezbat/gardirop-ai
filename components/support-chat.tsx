"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { X, Send, Loader2, Bot, User, Headset } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

// Exported hook so store page can control open state
export function useSupportChat() {
  const [isOpen, setIsOpen] = useState(false)
  return { isOpen, setIsOpen }
}

export default function SupportChat() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isStorePage, setIsStorePage] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => `support-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMounted(true)
    const checkPath = () => {
      setIsStorePage(window.location.pathname.startsWith('/store'))
    }
    checkPath()
    const observer = new MutationObserver(checkPath)
    observer.observe(document.querySelector('body')!, { childList: true, subtree: true })
    window.addEventListener('popstate', checkPath)

    // Listen for custom event from store page
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('open-support-chat', handleOpen)

    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', checkPath)
      window.removeEventListener('open-support-chat', handleOpen)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: t("supportChatWelcome"),
        timestamp: new Date().toISOString(),
      }])
    }
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          chatHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await response.json()

      if (response.ok && data.reply) {
        setMessages((prev) => [...prev, {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: data.timestamp || new Date().toISOString(),
        }])
      } else {
        setMessages((prev) => [...prev, {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: data.error === "Unauthorized" ? t("supportChatLogin") : t("supportChatError"),
          timestamp: new Date().toISOString(),
        }])
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: t("supportChatError"),
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, sessionId, messages, t])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  if (!mounted) return null

  // Only render the chat panel (no FAB button - that's in store header now)
  if (!isOpen) return null

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: "var(--background, #0a0a0a)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "linear-gradient(135deg, rgba(147,51,234,0.9), rgba(236,72,153,0.9))", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Headset style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t("supportChatTitle")}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>WEARO</div>
          </div>
        </div>
        <div
          onClick={() => setIsOpen(false)}
          style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(255,255,255,0.1)" }}
        >
          <X style={{ width: 16, height: 16 }} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: "85%", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: msg.role === "user" ? "rgba(147,51,234,0.2)" : "rgba(236,72,153,0.2)", color: msg.role === "user" ? "#a78bfa" : "#f472b6" }}>
                {msg.role === "user" ? <User style={{ width: 14, height: 14 }} /> : <Bot style={{ width: 14, height: 14 }} />}
              </div>
              <div style={{
                borderRadius: 16,
                padding: "10px 14px",
                fontSize: 14,
                lineHeight: 1.5,
                ...(msg.role === "user"
                  ? { background: "linear-gradient(135deg, #9333ea, #ec4899)", color: "#fff", borderBottomRightRadius: 4 }
                  : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--foreground, #fff)", borderBottomLeftRadius: 4 }
                )
              }}>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>
                <span style={{ fontSize: 10, opacity: 0.5, marginTop: 4, display: "block" }}>{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(236,72,153,0.2)", color: "#f472b6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bot style={{ width: 14, height: 14 }} />
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, borderBottomLeftRadius: 4, padding: "12px 16px", display: "flex", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)", animation: "bounce 1s infinite" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)", animation: "bounce 1s infinite 0.15s" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)", animation: "bounce 1s infinite 0.3s" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!session?.user ? (
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--muted-foreground, #888)", margin: 0 }}>{t("supportChatLogin")}</p>
        </div>
      ) : (
        <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("supportChatPlaceholder")}
              rows={1}
              style={{ flex: 1, resize: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 12px", fontSize: 14, color: "var(--foreground, #fff)", outline: "none", maxHeight: 96, fontFamily: "inherit" }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              style={{ width: 40, height: 40, borderRadius: 12, background: (!input.trim() || isLoading) ? "rgba(147,51,234,0.3)" : "linear-gradient(135deg, #9333ea, #ec4899)", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: (!input.trim() || isLoading) ? "not-allowed" : "pointer", flexShrink: 0 }}
            >
              {isLoading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 16, height: 16 }} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
